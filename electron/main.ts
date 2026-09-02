import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { Readable } from 'stream';
import { 
  initZipCache, 
  getAllCachedThumbnails, 
  saveThumbnailToZip, 
  saveBatchThumbnailsToZip, 
  getDumpDirectory,
  flushToDisk 
} from './zipCache.js';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Media file extensions to scan (Video + PDF documents)
const MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.webm', '.avi', '.mov', '.wmv',
  '.flv', '.m4v', '.ts', '.m2ts', '.3gp', '.ogv', '.vob', '.divx',
  '.pdf'
]);

let mainWindow: BrowserWindow | null = null;

// Register media protocol scheme as privileged before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media-stream',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
]);

// Enable hardware acceleration flags & unrestricted autoplay
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,VaapiVideoEncoder,HardwareAccelerationMode,PlatformHEVCDecoderSupport');
app.commandLine.appendSwitch('disable-features', 'PreloadMediaEngagementData');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#07090e',
    title: 'WatchThis - Futuristic Media Explorer',
    frame: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#07090e',
      symbolColor: '#94a3b8',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      plugins: true, // Enables PDF viewing plugin in Chromium
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function pathToStreamUrl(filePath: string): string {
  const normPath = filePath.replace(/\\/g, '/');
  return `media-stream://local/${encodeURIComponent(normPath)}`;
}

// Setup ultra-fast media protocol with HTTP 206 Byte-Range chunk streaming for zero-lag playback & instant seeking
function setupMediaProtocol() {
  protocol.handle('media-stream', async (request) => {
    try {
      const rawUrl = request.url;
      const pathPart = rawUrl.replace(/^media-stream:\/\/[^\/]*\//, '');
      let filePath: string;
      try {
        filePath = decodeURIComponent(pathPart);
      } catch (e) {
        try {
          filePath = decodeURI(pathPart);
        } catch (e2) {
          filePath = pathPart;
        }
      }

      // On Windows, normalize path (e.g. /E:/ -> E:/)
      if (process.platform === 'win32') {
        if (/^\/[a-zA-Z]:/.test(filePath)) {
          filePath = filePath.slice(1);
        }
      }
      filePath = path.normalize(filePath);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

      const stat = await fs.promises.stat(filePath);
      const fileSize = stat.size;
      const mimeType = getMimeType(filePath);
      const rangeHeader = request.headers.get('range');

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10) || 0;
        let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (isNaN(end) || end >= fileSize) {
          end = fileSize - 1;
        }

        // Limit maximum single chunk response to 4MB for instant playback start & zero-latency seeking
        const maxChunk = 4 * 1024 * 1024;
        const chunkEnd = Math.min(end, start + maxChunk - 1);
        const chunkSize = (chunkEnd - start) + 1;

        const fd = await fs.promises.open(filePath, 'r');
        const buffer = Buffer.alloc(chunkSize);
        await fd.read(buffer, 0, chunkSize, start);
        await fd.close();

        return new Response(buffer, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${chunkEnd}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          }
        });
      } else {
        // Complete buffer for non-range requests (such as full PDF document fetches)
        const buffer = await fs.promises.readFile(filePath);
        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Length': String(buffer.length),
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
    } catch (err: any) {
      console.error('[MediaProtocol Error]', err);
      return new Response(`Error: ${err.message}`, { status: 500 });
    }
  });
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mkv':
      return 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
    case '.avi':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.ts':
    case '.m2ts':
      return 'video/mp2t';
    case '.flv':
      return 'video/x-flv';
    case '.ogv':
      return 'video/ogg';
    default:
      return 'video/mp4';
  }
}

// Fast parallel recursive scanner with streaming real-time progress
async function scanDirectoryForVideos(dirOrFilePath: string, maxDepth: number = 10): Promise<any[]> {
  const results: any[] = [];
  let scannedCount = 0;
  let lastProgressTime = Date.now();

  try {
    const targetStat = await fs.promises.stat(dirOrFilePath);
    if (targetStat.isFile()) {
      const ext = path.extname(dirOrFilePath).toLowerCase();
      if (MEDIA_EXTENSIONS.has(ext)) {
        results.push({
          id: `${dirOrFilePath}_${targetStat.mtimeMs}`,
          name: path.basename(dirOrFilePath),
          path: dirOrFilePath,
          streamUrl: pathToStreamUrl(dirOrFilePath),
          size: targetStat.size,
          extension: ext,
          directory: path.dirname(dirOrFilePath),
          createdAt: targetStat.birthtimeMs || targetStat.ctimeMs,
          modifiedAt: targetStat.mtimeMs,
        });
      }
      return results;
    }
  } catch (e) {
    return results;
  }

  async function traverse(currentPath: string, depth: number) {
    if (depth > maxDepth) return;
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      const subDirs: string[] = [];

      for (const entry of entries) {
        scannedCount++;
        const fullPath = path.join(currentPath, entry.name);

        const now = Date.now();
        if (now - lastProgressTime > 120 && mainWindow) {
          lastProgressTime = now;
          mainWindow.webContents.send('scan:progress', {
            currentFolder: path.basename(currentPath),
            scannedCount,
            foundVideos: results.length
          });
        }

        if (entry.isDirectory()) {
          // Skip hidden and system folders
          if (!entry.name.startsWith('.') && !['node_modules', '$RECYCLE.BIN', 'System Volume Information'].includes(entry.name)) {
            subDirs.push(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (MEDIA_EXTENSIONS.has(ext)) {
            try {
              const stat = await fs.promises.stat(fullPath);
              results.push({
                id: `${fullPath}_${stat.mtimeMs}`,
                name: entry.name,
                path: fullPath,
                streamUrl: pathToStreamUrl(fullPath),
                size: stat.size,
                extension: ext,
                directory: currentPath,
                createdAt: stat.birthtimeMs || stat.ctimeMs,
                modifiedAt: stat.mtimeMs,
              });
            } catch (statErr) {
              // skip unreadable file
            }
          }
        }
      }

      // Parallelize child directory traversal in concurrent batches of 8
      const concurrency = 8;
      for (let i = 0; i < subDirs.length; i += concurrency) {
        const chunk = subDirs.slice(i, i + concurrency);
        await Promise.all(chunk.map(d => traverse(d, depth + 1)));
      }
    } catch (readErr) {
      console.warn(`Could not read directory ${currentPath}:`, readErr);
    }
  }

  await traverse(dirOrFilePath, 0);
  return results;
}

// Setup IPC listeners
function setupIPC() {
  ipcMain.handle('dialog:openFolders', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'multiSelections'],
      title: 'Select Video / Document Folder(s) to Add to WatchThis',
    });
    if (result.canceled) return null;
    return result.filePaths;
  });

  ipcMain.handle('dialog:selectDestinationFolder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Destination Folder to Move File',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('fs:scanFolders', async (_event, folderPaths: string[]) => {
    const allVideos: any[] = [];
    for (const folder of folderPaths) {
      const videos = await scanDirectoryForVideos(folder);
      allVideos.push(...videos);
    }
    return allVideos;
  });

  ipcMain.handle('fs:readPdfBuffer', async (_event, filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const buffer = await fs.promises.readFile(filePath);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }
      return null;
    } catch (err: any) {
      console.error('[ReadPdfBuffer Error]', err);
      return null;
    }
  });

  ipcMain.handle('fs:reveal', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
    return true;
  });

  ipcMain.handle('fs:openExternal', async (_event, targetPath: string) => {
    return shell.openPath(targetPath);
  });

  ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        await shell.trashItem(filePath);
        return { success: true };
      }
      return { success: false, error: 'File does not exist' };
    } catch (err: any) {
      try {
        await fs.promises.unlink(filePath);
        return { success: true };
      } catch (fallbackErr: any) {
        return { success: false, error: fallbackErr.message };
      }
    }
  });

  ipcMain.handle('fs:moveFile', async (_event, sourcePath: string, destinationDir: string) => {
    try {
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: 'Source file does not exist' };
      }
      const fileName = path.basename(sourcePath);
      const targetPath = path.join(destinationDir, fileName);

      await fs.promises.rename(sourcePath, targetPath);
      return { success: true, newPath: targetPath };
    } catch (err: any) {
      try {
        const fileName = path.basename(sourcePath);
        const targetPath = path.join(destinationDir, fileName);
        await fs.promises.copyFile(sourcePath, targetPath);
        await fs.promises.unlink(sourcePath);
        return { success: true, newPath: targetPath };
      } catch (copyErr: any) {
        return { success: false, error: copyErr.message };
      }
    }
  });

  ipcMain.handle('app:saveSnapshot', async (_event, dataUrl: string, defaultName: string) => {
    if (!mainWindow) return false;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Frame Snapshot',
      defaultPath: path.join(app.getPath('pictures'), defaultName || 'watchthis-snapshot.png'),
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    });

    if (result.canceled || !result.filePath) return false;

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    await fs.promises.writeFile(result.filePath, base64Data, 'base64');
    return result.filePath;
  });

  ipcMain.handle('app:getSystemInfo', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      appVersion: app.getVersion(),
    };
  });

  // ── ZIP Archive Dump Cache IPC Channels ──
  ipcMain.handle('cache:loadZipCache', async () => {
    return getAllCachedThumbnails();
  });

  ipcMain.handle('cache:saveThumbnail', async (_event, key: string, dataUrl: string, metadata?: any) => {
    saveThumbnailToZip(key, dataUrl, metadata);
    return true;
  });

  ipcMain.handle('cache:saveBatchThumbnails', async (_event, items: any[]) => {
    saveBatchThumbnailsToZip(items);
    return true;
  });

  ipcMain.handle('cache:getDumpInfo', async () => {
    return {
      dumpDir: getDumpDirectory(),
    };
  });
}

app.whenReady().then(async () => {
  await initZipCache();
  setupMediaProtocol();
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', async () => {
  try {
    await flushToDisk();
  } catch (_) {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

