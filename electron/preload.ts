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
  getDumpInfo: () => Promise<{ dumpDir: string }>;
  onScanProgress?: (callback: (data: { currentFolder: string; scannedCount: number; foundVideos: number }) => void) => () => void;
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
  getDumpInfo: () => ipcRenderer.invoke('cache:getDumpInfo'),
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

