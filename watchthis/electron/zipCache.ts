import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

export interface ThumbnailMetadata {
  key: string;
  originalPath?: string;
  name?: string;
  mtime?: number;
  size?: number;
  duration?: number;
  resolution?: string;
  codec?: string;
  smartTags?: string[];
  isPdf?: boolean;
}

export interface CachedItem {
  key: string;
  dataUrl: string;
  metadata?: ThumbnailMetadata;
}

// In-memory runtime caches for 0ms synchronous lookups
const inMemoryThumbnails = new Map<string, string>();
const inMemoryManifest = new Map<string, ThumbnailMetadata>();

let isInitialized = false;
let isDirty = false;


/**
 * Resolves the persistent 'dump' directory located alongside the application executable.
 */
export function getDumpDirectory(): string {
  let baseDir: string;
  
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    baseDir = process.env.PORTABLE_EXECUTABLE_DIR;
  } else if (app.isPackaged) {
    baseDir = path.dirname(process.execPath);
  } else {
    baseDir = process.cwd();
  }

  const dumpDir = path.join(baseDir, 'dump');
  const thumbsDir = path.join(dumpDir, 'thumbnails');
  try {
    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });
    }
    if (!fs.existsSync(thumbsDir)) {
      fs.mkdirSync(thumbsDir, { recursive: true });
    }
  } catch (err) {
    console.warn('[ZipCache] Could not create dump directory at baseDir, falling back:', err);
  }
  return dumpDir;
}


/**
 * Path to the ZIP cache archive inside the dump folder.
 */
export function getZipCachePath(): string {
  return path.join(getDumpDirectory(), 'thumbnails_cache.zip');
}

/**
 * Path to the individual thumbnail image directory inside the dump folder.
 */
export function getThumbsDirectory(): string {
  const dir = path.join(getDumpDirectory(), 'thumbnails');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
  }
  return dir;
}

/**
 * Robustly normalizes file paths and custom protocol URLs into a clean, uniform canonical key.
 */
export function normalizeSourcePath(sourceOrPath: string): string {
  if (!sourceOrPath) return '';
  let cleaned = sourceOrPath;
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch (_) {}
  cleaned = cleaned.replace(/^media-stream:\/\/local\//i, '');
  cleaned = cleaned.replace(/^file:\/\/\/?/i, '');
  cleaned = cleaned.replace(/\\/g, '/').toLowerCase().trim();
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

/**
 * Generates an MD5 hash key for any given file path or media URL.
 */
export function generateKeyForSource(sourceOrPath: string): string {
  const norm = normalizeSourcePath(sourceOrPath);
  if (!norm) return 'unknown';
  return crypto.createHash('md5').update(norm).digest('hex');
}

/**
 * Initialize ZIP cache on application startup.
 * Loads all thumbnails from thumbnails_cache.zip and loose dump files into memory for 0ms access.
 */
export async function initZipCache(): Promise<void> {
  if (isInitialized) return;
  const zipPath = getZipCachePath();
  const thumbsDir = getThumbsDirectory();

  try {
    let loadedCount = 0;

    // 1. Load from ZIP archive
    if (fs.existsSync(zipPath)) {
      try {
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        const manifestEntry = zipEntries.find(e => e.entryName === 'manifest.json');
        if (manifestEntry) {
          try {
            const raw = manifestEntry.getData().toString('utf8');
            const manifestData = JSON.parse(raw);
            for (const [k, v] of Object.entries(manifestData)) {
              inMemoryManifest.set(k, v as ThumbnailMetadata);
            }
          } catch (e) {
            console.warn('[ZipCache] Manifest parse warning:', e);
          }
        }

        for (const entry of zipEntries) {
          if (entry.entryName.endsWith('.jpg') || entry.entryName.endsWith('.jpeg')) {
            const key = entry.entryName.replace(/\.jpe?g$/i, '');
            const buffer = entry.getData();
            if (buffer && buffer.length > 0) {
              const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
              inMemoryThumbnails.set(key, dataUrl);
              loadedCount++;
            }
          }
        }
      } catch (zipErr) {
        console.warn('[ZipCache] ZIP archive read warning:', zipErr);
      }
    }

    // 2. Load any loose .jpg files from dump/thumbnails/
    if (fs.existsSync(thumbsDir)) {
      try {
        const files = await fs.promises.readdir(thumbsDir);
        for (const file of files) {
          if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            const key = file.replace(/\.jpe?g$/i, '');
            if (!inMemoryThumbnails.has(key)) {
              const buffer = await fs.promises.readFile(path.join(thumbsDir, file));
              if (buffer && buffer.length > 0) {
                const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                inMemoryThumbnails.set(key, dataUrl);
                loadedCount++;
              }
            }
          }
        }
      } catch (looseErr) {
        console.warn('[ZipCache] Loose cache scan error:', looseErr);
      }
    }

    console.log(`[ZipCache] Primed ${loadedCount} thumbnails from ${getDumpDirectory()}`);
  } catch (err) {
    console.error('[ZipCache] Error initializing dump cache:', err);
  } finally {
    isInitialized = true;
  }
}

/**
 * Returns all primed thumbnails and metadata for instant hydration in renderer.
 */
export function getAllCachedThumbnails(): {
  thumbnails: Record<string, string>;
  manifest: Record<string, ThumbnailMetadata>;
} {
  const thumbnails: Record<string, string> = {};
  for (const [k, v] of inMemoryThumbnails.entries()) {
    thumbnails[k] = v;
  }

  const manifest: Record<string, ThumbnailMetadata> = {};
  for (const [k, v] of inMemoryManifest.entries()) {
    manifest[k] = v;
  }

  return { thumbnails, manifest };
}

/**
 * Get a specific thumbnail from memory.
 */
export function getCachedThumbnail(keyOrPath: string): string | null {
  const key = generateKeyForSource(keyOrPath);
  return inMemoryThumbnails.get(key) || inMemoryThumbnails.get(keyOrPath) || null;
}

/**
 * Save a generated thumbnail to in-memory cache, disk thumbnail file, and schedule ZIP archive flush.
 */
export function saveThumbnailToZip(
  sourceOrPath: string,
  dataUrl: string,
  metadata?: ThumbnailMetadata
): void {
  if (!sourceOrPath || !dataUrl) return;

  const key = generateKeyForSource(sourceOrPath);
  inMemoryThumbnails.set(key, dataUrl);

  const cleanPath = normalizeSourcePath(sourceOrPath);
  if (metadata) {
    inMemoryManifest.set(key, { ...metadata, key, originalPath: sourceOrPath });
  } else if (!inMemoryManifest.has(key)) {
    inMemoryManifest.set(key, { key, originalPath: sourceOrPath });
  }

  // Save individual image file to dump/thumbnails/[key].jpg immediately
  try {
    const thumbsDir = getThumbsDirectory();
    const filePath = path.join(thumbsDir, `${key}.jpg`);
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.promises.writeFile(filePath, base64Data, 'base64').catch(() => {});
  } catch (_) {}

  isDirty = true;
  scheduleFlush();
}

/**
 * Save multiple thumbnails in batch.
 */
export function saveBatchThumbnailsToZip(items: CachedItem[]): void {
  if (!items || items.length === 0) return;

  for (const item of items) {
    if (!item.key || !item.dataUrl) continue;
    const key = generateKeyForSource(item.key);
    inMemoryThumbnails.set(key, item.dataUrl);
    if (item.metadata) {
      inMemoryManifest.set(key, { ...item.metadata, key, originalPath: item.key });
    }

    try {
      const thumbsDir = getThumbsDirectory();
      const filePath = path.join(thumbsDir, `${key}.jpg`);
      const base64Data = item.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.promises.writeFile(filePath, base64Data, 'base64').catch(() => {});
    } catch (_) {}
  }

  isDirty = true;
  scheduleFlush();
}

let isFlushing = false;
let flushTimer: NodeJS.Timeout | null = null;
const FLUSH_DEBOUNCE_MS = 8000; // 8-second debounce avoids continuous main thread freezes during rapid indexing

/**
 * Debounced background flush to write changes to dump/thumbnails_cache.zip.
 */
function scheduleFlush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushToDisk().catch((err) => console.error('[ZipCache] Disk flush error:', err));
  }, FLUSH_DEBOUNCE_MS);
}

/**
 * Flushes all in-memory thumbnails and manifest into the dump/thumbnails_cache.zip file asynchronously.
 */
export async function flushToDisk(): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;
  isDirty = false;

  const zipPath = getZipCachePath();
  try {
    const zip = new AdmZip();

    // 1. Add manifest.json
    const manifestObj: Record<string, ThumbnailMetadata> = {};
    for (const [k, v] of inMemoryManifest.entries()) {
      manifestObj[k] = v;
    }
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifestObj, null, 2), 'utf8'));

    // 2. Add thumbnail JPEG image buffers
    let addedCount = 0;
    for (const [key, dataUrl] of inMemoryThumbnails.entries()) {
      if (/^[a-f0-9]{32}$/i.test(key) && dataUrl && dataUrl.startsWith('data:image')) {
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        if (imageBuffer.length > 0) {
          zip.addFile(`${key}.jpg`, imageBuffer);
          addedCount++;
        }
      }
    }

    const dumpDir = getDumpDirectory();
    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });
    }

    // Write asynchronously via buffer to keep main thread event loop completely responsive
    await new Promise<void>((resolve, reject) => {
      zip.toBuffer(
        (buffer) => {
          fs.promises.writeFile(zipPath, buffer)
            .then(() => {
              console.log(`[ZipCache] Async persisted ${addedCount} thumbnails into ${zipPath}`);
              resolve();
            })
            .catch(reject);
        },
        (err) => {
          reject(err);
        }
      );
    });
  } catch (err) {
    console.error('[ZipCache] Failed to write zip cache to disk:', err);
  } finally {
    isFlushing = false;
  }
}



