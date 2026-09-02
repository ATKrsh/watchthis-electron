import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openFolderDialog: () => Promise<string[] | null>;
  selectDestinationFolder: () => Promise<string | null>;
  scanFolders: (folderPaths: string[]) => Promise<any[]>;
  revealInExplorer: (filePath: string) => Promise<boolean>;
  openExternal: (path: string) => Promise<string>;
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  moveFile: (sourcePath: string, destinationDir: string) => Promise<{ success: boolean; newPath?: string; error?: string }>;
  readPdfBuffer: (filePath: string) => Promise<ArrayBuffer | null>;
  saveSnapshot: (dataUrl: string, defaultName: string) => Promise<string | false>;
  getSystemInfo: () => Promise<{ platform: string; arch: string; appVersion: string }>;
  loadZipCache: () => Promise<{ thumbnails: Record<string, string>; manifest: Record<string, any> }>;
  saveZipThumbnail: (key: string, dataUrl: string, metadata?: any) => Promise<boolean>;
  saveZipBatch: (items: Array<{ key: string; dataUrl: string; metadata?: any }>) => Promise<boolean>;
  flushZipCache: () => Promise<boolean>;
  getDumpInfo: () => Promise<{ dumpDir: string }>;
  getStorageInfo: (targetPath?: string) => Promise<{ totalBytes: number; freeBytes: number; usedBytes: number; rootPath?: string }>;
  onScanProgress?: (callback: (data: { currentFolder: string; scannedCount: number; foundVideos: number }) => void) => () => void;
  minimizeWindow: () => Promise<boolean>;
  maximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<boolean>;
  toggleFullScreen: () => Promise<boolean>;
  isMaximized: () => Promise<boolean>;
  isFullScreen: () => Promise<boolean>;
  onWindowStateChange?: (callback: (state: { isMaximized: boolean; isFullScreen: boolean }) => void) => () => void;
  isElectron: boolean;
}

const electronAPI: ElectronAPI = {
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolders'),
  selectDestinationFolder: () => ipcRenderer.invoke('dialog:selectDestinationFolder'),
  scanFolders: (folderPaths: string[]) => ipcRenderer.invoke('fs:scanFolders', folderPaths),
  revealInExplorer: (filePath: string) => ipcRenderer.invoke('fs:reveal', filePath),
  openExternal: (path: string) => ipcRenderer.invoke('fs:openExternal', path),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
  moveFile: (sourcePath: string, destinationDir: string) => ipcRenderer.invoke('fs:moveFile', sourcePath, destinationDir),
  readPdfBuffer: (filePath: string) => ipcRenderer.invoke('fs:readPdfBuffer', filePath),
  saveSnapshot: (dataUrl: string, defaultName: string) => ipcRenderer.invoke('app:saveSnapshot', dataUrl, defaultName),
  getSystemInfo: () => ipcRenderer.invoke('app:getSystemInfo'),
  loadZipCache: () => ipcRenderer.invoke('cache:loadZipCache'),
  saveZipThumbnail: (key, dataUrl, metadata) => ipcRenderer.invoke('cache:saveThumbnail', key, dataUrl, metadata),
  saveZipBatch: (items) => ipcRenderer.invoke('cache:saveBatchThumbnails', items),
  flushZipCache: () => ipcRenderer.invoke('cache:flushZipCache'),
  getDumpInfo: () => ipcRenderer.invoke('cache:getDumpInfo'),
  getStorageInfo: (targetPath) => ipcRenderer.invoke('app:getStorageInfo', targetPath),

  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  toggleFullScreen: () => ipcRenderer.invoke('window:toggleFullScreen'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  isFullScreen: () => ipcRenderer.invoke('window:isFullScreen'),

  onWindowStateChange: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('window:state-changed', handler);
    return () => {
      ipcRenderer.removeListener('window:state-changed', handler);
    };
  },

  onScanProgress: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('scan:progress', handler);
    return () => {
      ipcRenderer.removeListener('scan:progress', handler);
    };
  },
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

