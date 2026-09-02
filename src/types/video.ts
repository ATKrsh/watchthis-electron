export interface VideoItem {
  id: string;
  name: string;
  cleanTitle: string;
  path: string;
  streamUrl: string;
  size: number;
  extension: string;
  directory: string;
  createdAt: number;
  modifiedAt: number;
  duration: number; // in seconds (0 for PDF)
  resolution: string; // e.g. "4K UHD", "1080p FHD", "720p HD", "SD", "PDF Doc"
  width?: number;
  height?: number;
  fps?: number;
  codec?: string; // e.g. "HEVC/x265", "x264", "AV1", "VP9", "PDF"
  hdr?: boolean;
  audioChannels?: string; // e.g. "5.1 Surround", "Stereo", "Dolby Atmos"
  year?: number;
  season?: number;
  episode?: number;
  smartTags: string[];
  customTags: string[];
  isFavorite: boolean;
  thumbnail?: string;
  lastPlayedPosition?: number;
  playCount?: number;
  isPdf?: boolean;
}

export type ExplorationMode = 'folders' | 'files';

export interface FolderNode {
  path: string;
  name: string;
  parentPath: string | null;
  videoCount: number;
  subfolderCount: number;
  totalSize: number;
  previewThumbnail?: string;
}

export interface FolderSource {
  path: string;
  name: string;
  itemCount: number;
  totalSize: number;
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  videoIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type ThemeMode = 'neon' | 'minimal';

export type ViewMode = 'grid' | 'poster' | 'compact' | 'cinematic';

export type SortField = 'name' | 'dateAdded' | 'dateModified' | 'duration' | 'size' | 'resolution';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  search: string;
  resolutions: string[];
  codecs: string[];
  tags: string[];
  selectedFolder: string | null;
  selectedPlaylist: string | null;
  favoriteOnly: boolean;
  minDuration: number;
  maxDuration: number;
  quickCategory: string; // 'all' | '4k' | '1080p' | 'hdr' | '60fps' | 'pdf' | 'favorites' | 'recents' | 'shorts' | 'movies'
}

export type VideoFilterPreset = 
  | 'normal'
  | 'cyberpunk'
  | 'grain'
  | 'nightvision'
  | 'matrix'
  | 'celshade'
  | 'hdr'
  | 'vhs'
  | 'noir';

export interface CustomFilterAdjustments {
  brightness: number; // 0 - 200 (100)
  contrast: number;   // 0 - 200 (100)
  saturation: number; // 0 - 200 (100)
  hueRotate: number;  // 0 - 360 (0)
  blur: number;       // 0 - 10 (0)
  sepia: number;      // 0 - 100 (0)
  invert: number;     // 0 - 100 (0)
  sharpness: number;  // 0 - 100 (0)
}

export type AudioEqualizerPreset = 'flat' | 'bass-boost' | 'vocal-boost' | 'treble-boost' | 'cinema';

export type AspectRatio = 'original' | '16:9' | '21:9' | '4:3' | 'fill';

export interface ContextMenuState {
  x: number;
  y: number;
  video: VideoItem;
}

export interface FloatingVideoState {
  video: VideoItem;
  originRect?: DOMRect;
}

export type TabType = 'library' | 'video' | 'pdf';

export interface TabItem {
  id: string;
  type: TabType;
  title: string;
  video?: VideoItem;
  folderPath?: string;
  createdAt: number;
}

export interface ElectronAPI {
  openFolderDialog: () => Promise<string[] | null>;
  selectDestinationFolder: () => Promise<string | null>;
  scanFolders: (folderPaths: string[]) => Promise<any[]>;
  revealInExplorer: (filePath: string) => Promise<boolean>;
  openExternal: (path: string) => Promise<string>;
  readPdfBuffer?: (filePath: string) => Promise<ArrayBuffer | null>;
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  moveFile: (sourcePath: string, destinationDir: string) => Promise<{ success: boolean; newPath?: string; error?: string }>;
  saveSnapshot: (dataUrl: string, defaultName: string) => Promise<string | false>;
  getSystemInfo: () => Promise<{ platform: string; arch: string; appVersion: string }>;
  loadZipCache?: () => Promise<{ thumbnails: Record<string, string>; manifest: Record<string, any> }>;
  saveZipThumbnail?: (key: string, dataUrl: string, metadata?: any) => Promise<boolean>;
  saveZipBatch?: (items: Array<{ key: string; dataUrl: string; metadata?: any }>) => Promise<boolean>;
  getDumpInfo?: () => Promise<{ dumpDir: string }>;
  onScanProgress?: (callback: (data: { currentFolder: string; scannedCount: number; foundVideos: number }) => void) => () => void;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

