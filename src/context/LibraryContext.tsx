import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  VideoItem, 
  FolderSource, 
  ViewMode, 
  SortField, 
  SortDirection, 
  FilterState, 
  ThemeMode,
  Playlist,
  ContextMenuState,
  ExplorationMode,
  FolderNode,
  TabItem
} from '../types/video';
import { parseVideoMetadata } from '../utils/tagParser';
import { initZipCacheLoader, getMemoryThumbnail, getZipCachedMetadata } from '../utils/thumbnailDb';

const MEDIA_EXTENSIONS = new Set([

  '.mp4', '.mkv', '.webm', '.avi', '.mov', '.wmv',
  '.flv', '.m4v', '.ts', '.m2ts', '.3gp', '.ogv', '.vob', '.divx',
  '.pdf'
]);

export function isVideoFilename(filename: string): boolean {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return false;
  return MEDIA_EXTENSIONS.has(filename.slice(dot).toLowerCase());
}

export function normalizePath(p: string): string {
  if (!p) return '';
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

interface BreadcrumbItem {
  name: string;
  path: string | null;
}

interface LibraryContextType {
  videos: VideoItem[];
  folders: FolderSource[];
  playlists: Playlist[];
  filteredVideos: VideoItem[];
  tabs: TabItem[];
  activeTabId: string;
  openInNewTab: (video: VideoItem, activate?: boolean) => string;
  closeTab: (tabId: string) => void;
  setActiveTabId: (tabId: string) => void;
  openLibraryTab: (folderPath?: string, name?: string) => void;
  explorationMode: ExplorationMode;
  setExplorationMode: (mode: ExplorationMode) => void;
  currentNavPath: string | null;
  setCurrentNavPath: (path: string | null) => void;
  navBreadcrumbs: BreadcrumbItem[];
  navSubfolders: FolderNode[];
  navFolderVideos: VideoItem[];
  navigateIntoFolder: (folderPath: string) => void;
  navigateUpFolder: () => void;
  navigateToBreadcrumb: (path: string | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  cardScale: number;
  setCardScale: (scale: number) => void;
  previewSpeed: number;
  cyclePreviewSpeed: () => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (dir: SortDirection) => void;
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  activePlayingVideo: VideoItem | null;
  setActivePlayingVideo: (video: VideoItem | null) => void;
  floatingVideo: { video: VideoItem; originRect?: DOMRect } | null;
  setFloatingVideo: (data: { video: VideoItem; originRect?: DOMRect } | null) => void;
  contextMenu: ContextMenuState | null;
  setContextMenu: (menu: ContextMenuState | null) => void;
  editingTagsVideo: VideoItem | null;
  setEditingTagsVideo: (video: VideoItem | null) => void;
  playlistModalVideo: VideoItem | null;
  setPlaylistModalVideo: (video: VideoItem | null) => void;
  isStatsOpen: boolean;
  setIsStatsOpen: (open: boolean) => void;
  isScanning: boolean;
  scanProgressText: string;
  addFolders: (customPaths?: string[]) => Promise<void>;
  addWebFiles: (files: FileList | File[], fallbackFolderName?: string) => Promise<void>;
  removeFolder: (folderPath: string) => void;
  refreshLibrary: () => Promise<void>;
  toggleFavorite: (videoId: string) => void;
  addCustomTag: (videoId: string, tag: string) => void;
  removeCustomTag: (videoId: string, tag: string) => void;
  updateVideoTags: (videoId: string, customTags: string[]) => void;
  deleteVideoFromLibrary: (video: VideoItem) => void;
  deleteVideoFromDisk: (video: VideoItem) => Promise<void>;
  moveVideoFile: (video: VideoItem) => Promise<void>;
  createPlaylist: (name: string, firstVideoId?: string) => void;
  toggleVideoInPlaylist: (playlistId: string, videoId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  revealInExplorer: (filePath: string) => Promise<void>;
  allAvailableTags: string[];
  totalStorageBytes: number;
  totalDurationSeconds: number;
  neonBorder: boolean;
  neonShadow: boolean;
  toggleNeonBorder: () => void;
  toggleNeonShadow: () => void;
}

const defaultFilterState: FilterState = {
  search: '',
  resolutions: [],
  codecs: [],
  tags: [],
  selectedFolder: null,
  selectedPlaylist: null,
  favoriteOnly: false,
  minDuration: 0,
  maxDuration: 0,
  quickCategory: 'all',
};

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Primed state from localStorage cache
  const [videos, setVideos] = useState<VideoItem[]>(() => {
    const saved = localStorage.getItem('watchthis_videos_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [neonBorder, setNeonBorder] = useState<boolean>(() => localStorage.getItem('watchthis_neon_border') === 'true');
  const [neonShadow, setNeonShadow] = useState<boolean>(() => localStorage.getItem('watchthis_neon_shadow') === 'true');

  const toggleNeonBorder = useCallback(() => {
    setNeonBorder(prev => {
      const next = !prev;
      localStorage.setItem('watchthis_neon_border', String(next));
      return next;
    });
  }, []);

  const toggleNeonShadow = useCallback(() => {
    setNeonShadow(prev => {
      const next = !prev;
      localStorage.setItem('watchthis_neon_shadow', String(next));
      return next;
    });
  }, []);

  const [folders, setFolders] = useState<FolderSource[]>(() => {
    const saved = localStorage.getItem('watchthis_folders_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('watchthis_playlists_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [explorationMode, setExplorationMode] = useState<ExplorationMode>(() => {
    return (localStorage.getItem('watchthis_exploration_mode') as ExplorationMode) || 'folders';
  });

  const [currentNavPath, setCurrentNavPath] = useState<string | null>(null);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('watchthis_theme') as ThemeMode) || 'neon';
  });

  const [cardScale, setCardScale] = useState<number>(() => {
    const saved = localStorage.getItem('watchthis_card_scale');
    return saved ? parseInt(saved, 10) : 280;
  });

  const [previewSpeed, setPreviewSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('watchthis_preview_speed');
    return saved ? parseInt(saved, 10) : 2;
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('watchthis_view_mode') as ViewMode) || 'grid';
  });

  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);

  const [activePlayingVideo, setActivePlayingVideo] = useState<VideoItem | null>(null);
  const [floatingVideo, setFloatingVideo] = useState<{ video: VideoItem; originRect?: DOMRect } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingTagsVideo, setEditingTagsVideo] = useState<VideoItem | null>(null);
  const [playlistModalVideo, setPlaylistModalVideo] = useState<VideoItem | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgressText, setScanProgressText] = useState('');

  // ── Tab Management State ──
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: 'library-main', type: 'library', title: 'Media Explorer', createdAt: Date.now() }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('library-main');

  const openInNewTab = useCallback((video: VideoItem, activate: boolean = true): string => {
    const isPdf = video.isPdf || video.extension?.toLowerCase() === '.pdf';
    const existing = tabs.find(t => t.video?.id === video.id || (t.video?.streamUrl && t.video.streamUrl === video.streamUrl));
    if (existing) {
      if (activate) setActiveTabId(existing.id);
      return existing.id;
    }
    const newTabId = `tab_${video.id}_${Date.now()}`;
    const newTab: TabItem = {
      id: newTabId,
      type: isPdf ? 'pdf' : 'video',
      title: video.cleanTitle || video.name,
      video,
      createdAt: Date.now()
    };
    setTabs(prev => [...prev, newTab]);
    if (activate) {
      setActiveTabId(newTabId);
    }
    return newTabId;
  }, [tabs]);

  const closeTab = useCallback((tabId: string) => {
    if (activeTabId === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId);
      if (remaining.length > 0) {
        const closedIndex = tabs.findIndex(t => t.id === tabId);
        const nextIndex = Math.max(0, Math.min(closedIndex, remaining.length - 1));
        setActiveTabId(remaining[nextIndex].id);
      } else {
        setActiveTabId('library-main');
      }
    }

    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (filtered.length === 0) {
        return [{ id: 'library-main', type: 'library', title: 'Media Explorer', createdAt: Date.now() }];
      }
      return filtered;
    });
  }, [activeTabId, tabs]);

  const openLibraryTab = useCallback((folderPath?: string, name?: string) => {
    const newTabId = `tab_lib_${Date.now()}`;
    const newTab: TabItem = {
      id: newTabId,
      type: 'library',
      title: name || (folderPath ? folderPath.split('/').filter(Boolean).pop() || 'Folder' : 'Media Explorer'),
      folderPath,
      createdAt: Date.now()
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
  }, []);

  // ── Hydrate thumbnails and metadata from ZIP Dump Cache on Startup ──
  useEffect(() => {
    initZipCacheLoader()
      .then(() => {
        setVideos(prev => {
          let updatedCount = 0;
          const updated = prev.map(v => {
            const source = v.streamUrl || v.path;
            const cachedThumb = getMemoryThumbnail(source) || getMemoryThumbnail(v.path);
            const cachedMeta = getZipCachedMetadata(source) || getZipCachedMetadata(v.path);

            let hasNewData = false;
            let thumb = v.thumbnail;
            let dur = v.duration;
            let res = v.resolution;

            if (!thumb && cachedThumb) {
              thumb = cachedThumb;
              hasNewData = true;
            }
            if ((!dur || dur <= 0) && cachedMeta?.duration) {
              dur = cachedMeta.duration;
              hasNewData = true;
            }
            if (cachedMeta?.resolution && (!res || res === '1080p')) {
              res = cachedMeta.resolution;
              hasNewData = true;
            }

            if (hasNewData) {
              updatedCount++;
              return { ...v, thumbnail: thumb, duration: dur, resolution: res };
            }
            return v;
          });

          if (updatedCount > 0) {
            console.log(`[LibraryContext] Instantly hydrated ${updatedCount} videos from ZIP dump cache.`);
            return updated;
          }
          return prev;
        });
      })
      .catch(() => {});
  }, []);

  // Persist Exploration Mode
  useEffect(() => {
    localStorage.setItem('watchthis_exploration_mode', explorationMode);
  }, [explorationMode]);


  // Apply Theme class to body
  useEffect(() => {
    if (theme === 'minimal') {
      document.body.classList.add('theme-minimal');
    } else {
      document.body.classList.remove('theme-minimal');
    }
    localStorage.setItem('watchthis_theme', theme);
  }, [theme]);

  // Apply Card Scale CSS Variable
  useEffect(() => {
    document.documentElement.style.setProperty('--card-min-width', `${cardScale}px`);
    localStorage.setItem('watchthis_card_scale', cardScale.toString());
  }, [cardScale]);

  // Persist Preview Speed
  useEffect(() => {
    localStorage.setItem('watchthis_preview_speed', previewSpeed.toString());
  }, [previewSpeed]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'neon' ? 'minimal' : 'neon');
  };

  const cyclePreviewSpeed = () => {
    const speeds = [0.1, 0.2, 0.3, 0.5, 0.6, 0.8, 1, 2, 3, 4, 5];
    const nextIdx = (speeds.indexOf(previewSpeed) + 1) % speeds.length;
    setPreviewSpeed(speeds[nextIdx]);
  };

  // Real-time Electron scanning progress listener
  useEffect(() => {
    if (window.electronAPI?.onScanProgress) {
      const unsubscribe = window.electronAPI.onScanProgress((data) => {
        setScanProgressText(`Scanning ${data.currentFolder}... (${data.scannedCount} files scanned, ${data.foundVideos} media files indexed)`);
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  // Persist State safely (strip heavy base64 strings to prevent localStorage lockup/quota exhaustion)
  useEffect(() => {
    try {
      const cleanVideos = videos.map(v => {
        if (v.thumbnail && v.thumbnail.startsWith('data:')) {
          const { thumbnail, ...rest } = v;
          return rest;
        }
        return v;
      });
      localStorage.setItem('watchthis_videos_v3', JSON.stringify(cleanVideos));
    } catch (err) {
      console.warn('[LibraryStorage] localStorage quota reached or write error:', err);
    }
  }, [videos]);

  useEffect(() => {
    try {
      localStorage.setItem('watchthis_folders_v3', JSON.stringify(folders));
    } catch (err) {}
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem('watchthis_playlists_v3', JSON.stringify(playlists));
    } catch (err) {}
  }, [playlists]);

  useEffect(() => {
    try {
      localStorage.setItem('watchthis_view_mode', viewMode);
    } catch (err) {}
  }, [viewMode]);

  const resetFilters = () => {
    setFilterState(defaultFilterState);
  };

  // Folder Hierarchy Navigation Methods
  const navigateIntoFolder = useCallback((folderPath: string) => {
    setCurrentNavPath(normalizePath(folderPath));
  }, []);

  const navigateUpFolder = useCallback(() => {
    if (!currentNavPath) return;
    const parts = currentNavPath.split('/').filter(Boolean);
    if (parts.length <= 1) {
      setCurrentNavPath(null);
    } else {
      const parent = parts.slice(0, -1).join('/');
      // If was windows drive like E:, keep colon
      const hasDrive = /^[a-zA-Z]:$/.test(parts[0]);
      if (hasDrive && parts.length === 2) {
        setCurrentNavPath(parts[0]);
      } else {
        setCurrentNavPath(parent);
      }
    }
  }, [currentNavPath]);

  const navigateToBreadcrumb = useCallback((path: string | null) => {
    setCurrentNavPath(path ? normalizePath(path) : null);
  }, []);

  // Compute Breadcrumb Trail
  const navBreadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ name: 'All Folders', path: null }];
    if (!currentNavPath) return items;

    const norm = normalizePath(currentNavPath);
    const parts = norm.split('/').filter(Boolean);
    let accum = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === 0 && /^[a-zA-Z]:$/.test(part)) {
        accum = part;
      } else {
        accum = accum ? `${accum}/${part}` : part;
      }
      items.push({ name: part, path: accum });
    }
    return items;
  }, [currentNavPath]);

  // Compute Dynamic Subfolders and Videos for Normal Folder Mode
  const { navSubfolders, navFolderVideos } = useMemo(() => {
    if (explorationMode !== 'folders') {
      return { navSubfolders: [], navFolderVideos: [] };
    }

    if (currentNavPath === null) {
      // Single O(N) pass across folders & videos
      const rootFolderMap = new Map<string, FolderNode>();

      folders.forEach(f => {
        const norm = normalizePath(f.path);
        rootFolderMap.set(norm.toLowerCase(), {
          path: norm,
          name: f.name || norm.split('/').pop() || norm,
          parentPath: null,
          videoCount: 0,
          subfolderCount: 0,
          totalSize: 0,
        });
      });

      const folderKeys = Array.from(rootFolderMap.keys());

      videos.forEach(v => {
        const normPath = normalizePath(v.path).toLowerCase();
        const normDir = normalizePath(v.directory).toLowerCase();
        const vSize = v.size || 0;

        let matched = false;
        for (const key of folderKeys) {
          if (normPath.startsWith(key)) {
            const node = rootFolderMap.get(key)!;
            node.videoCount += 1;
            node.totalSize += vSize;
            matched = true;
            break;
          }
        }

        if (!matched && normDir) {
          const rootPart = normDir.split('/')[0];
          const rootKey = rootPart.toLowerCase();
          if (!rootFolderMap.has(rootKey)) {
            rootFolderMap.set(rootKey, {
              path: rootPart,
              name: rootPart,
              parentPath: null,
              videoCount: 1,
              subfolderCount: 0,
              totalSize: vSize,
            });
            folderKeys.push(rootKey);
          } else {
            const node = rootFolderMap.get(rootKey)!;
            node.videoCount += 1;
            node.totalSize += vSize;
          }
        }
      });

      return {
        navSubfolders: Array.from(rootFolderMap.values()),
        navFolderVideos: [],
      };
    }

    // Inside a specific folder path:
    const targetNorm = normalizePath(currentNavPath).toLowerCase();
    const subfolderMap = new Map<string, FolderNode>();
    const directVideos: VideoItem[] = [];

    videos.forEach(video => {
      const videoDirNorm = normalizePath(video.directory).toLowerCase();

      // If video is directly in this directory
      if (videoDirNorm === targetNorm) {
        directVideos.push(video);
      } else if (videoDirNorm.startsWith(targetNorm + '/')) {
        // Video is inside a nested subfolder under current path
        const relativeSuffix = normalizePath(video.directory).slice(currentNavPath.length).replace(/^\/+/, '');
        const immediateChildName = relativeSuffix.split('/')[0];
        const immediateChildPath = `${normalizePath(currentNavPath)}/${immediateChildName}`;
        const key = immediateChildPath.toLowerCase();

        if (!subfolderMap.has(key)) {
          subfolderMap.set(key, {
            path: immediateChildPath,
            name: immediateChildName,
            parentPath: currentNavPath,
            videoCount: 1,
            subfolderCount: 0,
            totalSize: video.size || 0,
          });
        } else {
          const existing = subfolderMap.get(key)!;
          existing.videoCount += 1;
          existing.totalSize += video.size || 0;
        }
      }
    });

    return {
      navSubfolders: Array.from(subfolderMap.values()),
      navFolderVideos: directVideos,
    };
  }, [explorationMode, currentNavPath, folders, videos]);

  // Ingest Web File objects
  const addWebFiles = async (files: FileList | File[], fallbackFolderName: string = 'Imported Media') => {
    try {
      setIsScanning(true);
      setScanProgressText('Scanning dropped files and folders...');

      const fileList = Array.from(files);
      const validFiles = fileList.filter(f => isVideoFilename(f.name));
      if (validFiles.length === 0) {
        setIsScanning(false);
        setScanProgressText('');
        return;
      }

      let detectedFolderName = fallbackFolderName;
      const parsedItems: VideoItem[] = [];

      for (const file of validFiles) {
        const relPath = (file as any).webkitRelativePath || file.name;
        const parts = relPath.split('/');
        if (parts.length > 1) {
          detectedFolderName = parts[0];
        }
        const dirPath = parts.length > 1 ? parts.slice(0, -1).join('/') : detectedFolderName;
        const meta = parseVideoMetadata(file.name);
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        const isPdf = ext === '.pdf' || meta.isPdf;
        const blobUrl = URL.createObjectURL(file);

        parsedItems.push({
          id: `web_${relPath}_${file.lastModified}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          cleanTitle: meta.cleanTitle,
          path: relPath,
          streamUrl: blobUrl,
          size: file.size,
          extension: ext,
          directory: dirPath,
          createdAt: file.lastModified || Date.now(),
          modifiedAt: file.lastModified || Date.now(),
          duration: isPdf ? 0 : 0,
          resolution: meta.resolution,
          codec: isPdf ? 'PDF' : meta.codec,
          hdr: meta.hdr,
          audioChannels: meta.audioChannels,
          year: meta.year,
          season: meta.season,
          episode: meta.episode,
          smartTags: meta.smartTags,
          customTags: [],
          isFavorite: false,
          playCount: 0,
          isPdf,
        });
      }

      const totalSize = parsedItems.reduce((acc, v) => acc + (v.size || 0), 0);
      const newFolderSource: FolderSource = {
        path: detectedFolderName,
        name: detectedFolderName,
        itemCount: parsedItems.length,
        totalSize,
        addedAt: Date.now(),
      };

      setFolders(prev => {
        const filtered = prev.filter(f => f.path !== detectedFolderName);
        return [newFolderSource, ...filtered];
      });

      setVideos(prev => {
        const existingPaths = new Set(prev.map(v => v.path));
        const fresh = parsedItems.filter(v => !existingPaths.has(v.path));
        return [...fresh, ...prev];
      });
    } catch (err) {
      console.error('Error importing files:', err);
    } finally {
      setIsScanning(false);
      setScanProgressText('');
    }
  };

  // Add Folders via Electron native dialog or Web File System Access API
  const addFolders = async (customPaths?: string[]) => {
    try {
      let targetPaths: string[] = [];

      if (customPaths && customPaths.length > 0) {
        targetPaths = customPaths;
      } else if (window.electronAPI?.openFolderDialog) {
        const dialogResult = await window.electronAPI.openFolderDialog();
        if (dialogResult && dialogResult.length > 0) {
          targetPaths = dialogResult;
        }
      } else if (typeof (window as any).showDirectoryPicker === 'function') {
        try {
          const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
          if (dirHandle) {
            setIsScanning(true);
            setScanProgressText(`Scanning ${dirHandle.name}...`);

            const scanDirHandle = async (handle: any, currentPath: string): Promise<any[]> => {
              const res: any[] = [];
              for await (const entry of handle.values()) {
                const itemPath = `${currentPath}/${entry.name}`;
                if (entry.kind === 'file' && isVideoFilename(entry.name)) {
                  try {
                    const file = await entry.getFile();
                    const blobUrl = URL.createObjectURL(file);
                    const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
                    res.push({
                      id: `web_${itemPath}_${file.lastModified}`,
                      name: entry.name,
                      path: itemPath,
                      streamUrl: blobUrl,
                      size: file.size,
                      extension: ext,
                      directory: currentPath,
                      createdAt: file.lastModified,
                      modifiedAt: file.lastModified,
                      isPdf: ext === '.pdf',
                    });
                  } catch (e) {}
                } else if (entry.kind === 'directory') {
                  if (!entry.name.startsWith('.') && !['node_modules', '$RECYCLE.BIN'].includes(entry.name)) {
                    const nested = await scanDirHandle(entry, itemPath);
                    res.push(...nested);
                  }
                }
              }
              return res;
            };

            const scannedRaw = await scanDirHandle(dirHandle, dirHandle.name);
            const newParsedVideos: VideoItem[] = scannedRaw.map(raw => {
              const meta = parseVideoMetadata(raw.name);
              const isPdf = raw.extension === '.pdf' || meta.isPdf;
              return {
                id: raw.id,
                name: raw.name,
                cleanTitle: meta.cleanTitle,
                path: raw.path,
                streamUrl: raw.streamUrl,
                size: raw.size,
                extension: raw.extension,
                directory: raw.directory,
                createdAt: raw.createdAt,
                modifiedAt: raw.modifiedAt,
                duration: 0,
                resolution: meta.resolution,
                codec: isPdf ? 'PDF' : meta.codec,
                hdr: meta.hdr,
                audioChannels: meta.audioChannels,
                year: meta.year,
                season: meta.season,
                episode: meta.episode,
                smartTags: meta.smartTags,
                customTags: [],
                isFavorite: false,
                playCount: 0,
                isPdf,
              };
            });

            const totalSize = newParsedVideos.reduce((acc, v) => acc + (v.size || 0), 0);
            const folderSource: FolderSource = {
              path: dirHandle.name,
              name: dirHandle.name,
              itemCount: newParsedVideos.length,
              totalSize,
              addedAt: Date.now(),
            };

            setFolders(prev => {
              const filtered = prev.filter(f => f.path !== dirHandle.name);
              return [folderSource, ...filtered];
            });

            setVideos(prev => {
              const existingPaths = new Set(prev.map(v => v.path));
              const fresh = newParsedVideos.filter(v => !existingPaths.has(v.path));
              return [...fresh, ...prev];
            });

            return;
          }
        } catch (pickerErr: any) {
          if (pickerErr.name === 'AbortError') return;
        }
      }

      // Web mode input click fallback
      if (targetPaths.length === 0 && !window.electronAPI) {
        const input = document.getElementById('watchthis-hidden-folder-input') as HTMLInputElement;
        if (input) input.click();
        return;
      }

      if (targetPaths.length === 0) return;

      setIsScanning(true);
      setScanProgressText(`Scanning ${targetPaths.length} folder(s)...`);

      let scannedRawVideos: any[] = [];
      if (window.electronAPI?.scanFolders) {
        scannedRawVideos = await window.electronAPI.scanFolders(targetPaths);
      }

      const newFolderSources: FolderSource[] = targetPaths.map(folderPath => {
        const normFolderPath = normalizePath(folderPath);
        const folderName = normFolderPath.split('/').filter(Boolean).pop() || folderPath;
        const normTarget = normFolderPath.toLowerCase();

        const matchingVideos = scannedRawVideos.filter(v =>
          normalizePath(v.path).toLowerCase().startsWith(normTarget)
        );
        const totalSize = matchingVideos.reduce((acc, v) => acc + (v.size || 0), 0);
        return {
          path: folderPath,
          name: folderName,
          itemCount: matchingVideos.length,
          totalSize,
          addedAt: Date.now(),
        };
      });

      const newParsedVideos: VideoItem[] = scannedRawVideos.map(raw => {
        const meta = parseVideoMetadata(raw.name);
        const isPdf = raw.extension?.toLowerCase() === '.pdf' || meta.isPdf;
        const source = raw.streamUrl || raw.path;
        const cachedThumb = getMemoryThumbnail(source) || getMemoryThumbnail(raw.path);
        const cachedMeta = getZipCachedMetadata(source) || getZipCachedMetadata(raw.path);

        return {
          id: raw.id || `${raw.path}_${Date.now()}`,
          name: raw.name,
          cleanTitle: meta.cleanTitle,
          path: raw.path,
          streamUrl: raw.streamUrl || raw.path,
          size: raw.size,
          extension: raw.extension,
          directory: raw.directory,
          createdAt: raw.createdAt || Date.now(),
          modifiedAt: raw.modifiedAt || Date.now(),
          duration: cachedMeta?.duration || 0,
          resolution: cachedMeta?.resolution || meta.resolution,
          codec: isPdf ? 'PDF' : (cachedMeta?.codec || meta.codec),
          hdr: meta.hdr,
          audioChannels: meta.audioChannels,
          year: meta.year,
          season: meta.season,
          episode: meta.episode,
          smartTags: meta.smartTags,
          customTags: [],
          isFavorite: false,
          playCount: 0,
          isPdf,
          thumbnail: cachedThumb || undefined,
        };
      });


      setFolders(prev => {
        const existingPaths = new Set(prev.map(f => normalizePath(f.path).toLowerCase()));
        const fresh = newFolderSources.filter(f => !existingPaths.has(normalizePath(f.path).toLowerCase()));
        const updated = prev.map(old => {
          const matched = newFolderSources.find(n => normalizePath(n.path).toLowerCase() === normalizePath(old.path).toLowerCase());
          return matched || old;
        });
        return [...updated, ...fresh];
      });

      setVideos(prev => {
        const existingPaths = new Set(prev.map(v => normalizePath(v.path).toLowerCase()));
        const fresh = newParsedVideos.filter(v => !existingPaths.has(normalizePath(v.path).toLowerCase()));
        return [...fresh, ...prev];
      });
    } catch (err) {
      console.error('Error adding folder:', err);
    } finally {
      setIsScanning(false);
      setScanProgressText('');
    }
  };

  const removeFolder = (folderPath: string) => {
    const normTarget = normalizePath(folderPath).toLowerCase();
    setFolders(prev => prev.filter(f => normalizePath(f.path).toLowerCase() !== normTarget));
    setVideos(prev => prev.filter(v => !normalizePath(v.path).toLowerCase().startsWith(normTarget)));
    if (currentNavPath && normalizePath(currentNavPath).toLowerCase().startsWith(normTarget)) {
      setCurrentNavPath(null);
    }
  };

  const refreshLibrary = async () => {
    if (folders.length === 0) return;

    const folderPaths = folders.map(f => f.path);
    const normTargets = folderPaths.map(p => normalizePath(p).toLowerCase());

    setIsScanning(true);
    setScanProgressText(`Re-scanning ${folderPaths.length} folder(s)...`);

    try {
      let scannedRawVideos: any[] = [];
      if (window.electronAPI?.scanFolders) {
        scannedRawVideos = await window.electronAPI.scanFolders(folderPaths);
      } else {
        // Web mode fallback — no re-scan capability, just return
        return;
      }

      // Build updated folder sources with fresh, correct counts
      const updatedFolderSources: FolderSource[] = folderPaths.map(folderPath => {
        const normFolderPath = normalizePath(folderPath);
        const normTarget = normFolderPath.toLowerCase();
        const folderName = normFolderPath.split('/').filter(Boolean).pop() || folderPath;
        const matchingVideos = scannedRawVideos.filter(v =>
          normalizePath(v.path).toLowerCase().startsWith(normTarget)
        );
        const totalSize = matchingVideos.reduce((acc, v) => acc + (v.size || 0), 0);
        const existing = folders.find(f => normalizePath(f.path).toLowerCase() === normTarget);
        return {
          path: folderPath,
          name: existing?.name || folderName,
          itemCount: matchingVideos.length,
          totalSize,
          addedAt: existing?.addedAt || Date.now(),
        };
      });

      // Parse freshly scanned videos
      const freshParsed: VideoItem[] = scannedRawVideos.map(raw => {
        const meta = parseVideoMetadata(raw.name);
        const isPdf = raw.extension?.toLowerCase() === '.pdf' || meta.isPdf;
        return {
          id: raw.id || `${raw.path}_${Date.now()}`,
          name: raw.name,
          cleanTitle: meta.cleanTitle,
          path: raw.path,
          streamUrl: raw.streamUrl || raw.path,
          size: raw.size,
          extension: raw.extension,
          directory: raw.directory,
          createdAt: raw.createdAt || Date.now(),
          modifiedAt: raw.modifiedAt || Date.now(),
          duration: 0,
          resolution: meta.resolution,
          codec: isPdf ? 'PDF' : meta.codec,
          hdr: meta.hdr,
          audioChannels: meta.audioChannels,
          year: meta.year,
          season: meta.season,
          episode: meta.episode,
          smartTags: meta.smartTags,
          customTags: [],
          isFavorite: false,
          playCount: 0,
          isPdf,
        };
      });

      // Preserve user metadata (favorites, custom tags, play counts) from existing videos
      setVideos(prev => {
        const existingMap = new Map(prev.map(v => [normalizePath(v.path).toLowerCase(), v]));
        const merged = freshParsed.map(v => {
          const old = existingMap.get(normalizePath(v.path).toLowerCase());
          if (old) {
            return {
              ...v,
              isFavorite: old.isFavorite,
              customTags: old.customTags,
              playCount: old.playCount,
              thumbnail: old.thumbnail,
            };
          }
          return v;
        });
        // Keep videos that belong to OTHER (non-refreshed) folders
        const unaffected = prev.filter(v => {
          const vn = normalizePath(v.path).toLowerCase();
          return !normTargets.some(t => vn.startsWith(t));
        });
        return [...merged, ...unaffected];
      });

      // Replace folder sources with updated counts
      setFolders(prev => {
        const updatedSet = new Set(updatedFolderSources.map(f => normalizePath(f.path).toLowerCase()));
        const unchanged = prev.filter(f => !updatedSet.has(normalizePath(f.path).toLowerCase()));
        return [...updatedFolderSources, ...unchanged];
      });

    } catch (err) {
      console.error('[refreshLibrary] Error:', err);
    } finally {
      setIsScanning(false);
      setScanProgressText('');
    }
  };

  const toggleFavorite = (videoId: string) => {
    setVideos(prev =>
      prev.map(v => (v.id === videoId ? { ...v, isFavorite: !v.isFavorite } : v))
    );
  };

  const addCustomTag = (videoId: string, tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    setVideos(prev =>
      prev.map(v => {
        if (v.id === videoId) {
          if (!v.customTags.includes(cleanTag)) {
            return { ...v, customTags: [...v.customTags, cleanTag] };
          }
        }
        return v;
      })
    );
  };

  const removeCustomTag = (videoId: string, tag: string) => {
    setVideos(prev =>
      prev.map(v => {
        if (v.id === videoId) {
          return { ...v, customTags: v.customTags.filter(t => t !== tag) };
        }
        return v;
      })
    );
  };

  const updateVideoTags = (videoId: string, customTags: string[]) => {
    setVideos(prev =>
      prev.map(v => (v.id === videoId ? { ...v, customTags } : v))
    );
  };

  const deleteVideoFromLibrary = (video: VideoItem) => {
    setVideos(prev => prev.filter(v => v.id !== video.id));
    setFolders(prev =>
      prev.map(f => {
        if (normalizePath(video.path).toLowerCase().startsWith(normalizePath(f.path).toLowerCase())) {
          return {
            ...f,
            itemCount: Math.max(0, f.itemCount - 1),
            totalSize: Math.max(0, f.totalSize - (video.size || 0)),
          };
        }
        return f;
      })
    );
  };

  const deleteVideoFromDisk = async (video: VideoItem) => {
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete "${video.name}" from disk?`);
    if (!confirmDelete) return;

    if (window.electronAPI?.deleteFile) {
      const res = await window.electronAPI.deleteFile(video.path);
      if (res.success) {
        deleteVideoFromLibrary(video);
      } else {
        alert(`Failed to delete file: ${res.error || 'Unknown error'}`);
      }
    } else {
      deleteVideoFromLibrary(video);
    }
  };

  const moveVideoFile = async (video: VideoItem) => {
    if (!window.electronAPI?.selectDestinationFolder || !window.electronAPI?.moveFile) {
      alert('Physical file moving is supported in desktop mode.');
      return;
    }

    const destDir = await window.electronAPI.selectDestinationFolder();
    if (!destDir) return;

    const res = await window.electronAPI.moveFile(video.path, destDir);
    if (res.success && res.newPath) {
      setVideos(prev =>
        prev.map(v => (v.id === video.id ? { ...v, path: res.newPath!, directory: destDir } : v))
      );
      alert(`File moved successfully to: ${destDir}`);
    } else {
      alert(`Failed to move file: ${res.error || 'Unknown error'}`);
    }
  };

  // Playlists Management
  const createPlaylist = (name: string, firstVideoId?: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}`,
      name: cleanName,
      videoIds: firstVideoId ? [firstVideoId] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setPlaylists(prev => [newPlaylist, ...prev]);
  };

  const toggleVideoInPlaylist = (playlistId: string, videoId: string) => {
    setPlaylists(prev =>
      prev.map(pl => {
        if (pl.id === playlistId) {
          const exists = pl.videoIds.includes(videoId);
          return {
            ...pl,
            videoIds: exists ? pl.videoIds.filter(id => id !== videoId) : [...pl.videoIds, videoId],
            updatedAt: Date.now(),
          };
        }
        return pl;
      })
    );
  };

  const deletePlaylist = (playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    if (filterState.selectedPlaylist === playlistId) {
      setFilterState(prev => ({ ...prev, selectedPlaylist: null }));
    }
  };

  const revealInExplorer = async (filePath: string) => {
    if (window.electronAPI?.revealInExplorer) {
      await window.electronAPI.revealInExplorer(filePath);
    }
  };

  const allAvailableTags = useMemo(() => {
    const tagSet = new Set<string>();
    videos.forEach(v => {
      v.smartTags.forEach(t => tagSet.add(t));
      v.customTags.forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [videos]);

  const totalStorageBytes = useMemo(() => {
    return videos.reduce((acc, v) => acc + (v.size || 0), 0);
  }, [videos]);

  const totalDurationSeconds = useMemo(() => {
    return videos.reduce((acc, v) => acc + (v.duration || 0), 0);
  }, [videos]);

  // Filter and Sort Pipeline (Flat File Index Mode)
  const filteredVideos = useMemo(() => {
    return videos
      .filter(video => {
        const isPdf = video.isPdf || video.extension?.toLowerCase() === '.pdf';

        // Quick Category filter
        if (filterState.quickCategory === 'pdf' && !isPdf) return false;
        if (filterState.quickCategory === '4k' && !video.resolution.includes('4K')) return false;
        if (filterState.quickCategory === '1080p' && !video.resolution.includes('1080p')) return false;
        if (filterState.quickCategory === 'hdr' && !video.hdr && !video.smartTags.includes('HDR')) return false;
        if (filterState.quickCategory === '60fps' && !video.smartTags.includes('60 FPS') && video.fps !== 60) return false;
        if (filterState.quickCategory === 'favorites' && !video.isFavorite) return false;
        if (filterState.quickCategory === 'recents' && (Date.now() - video.modifiedAt) > 1000 * 60 * 60 * 24 * 7) return false;
        if (filterState.quickCategory === 'shorts' && (video.duration > 300 && video.duration > 0)) return false;
        if (filterState.quickCategory === 'movies' && (video.duration < 1200 && video.duration > 0)) return false;

        // Favorite only
        if (filterState.favoriteOnly && !video.isFavorite) return false;

        // Selected Playlist filter
        if (filterState.selectedPlaylist) {
          const pl = playlists.find(p => p.id === filterState.selectedPlaylist);
          if (!pl || !pl.videoIds.includes(video.id)) return false;
        }

        // Selected Folder with normalized comparison
        if (filterState.selectedFolder) {
          const normSelected = normalizePath(filterState.selectedFolder).toLowerCase();
          const normVideoPath = normalizePath(video.path).toLowerCase();
          if (!normVideoPath.startsWith(normSelected)) return false;
        }

        // Search text
        if (filterState.search.trim()) {
          const q = filterState.search.toLowerCase();
          const matchName = video.name.toLowerCase().includes(q);
          const matchClean = video.cleanTitle.toLowerCase().includes(q);
          const matchTag = video.smartTags.some(t => t.toLowerCase().includes(q)) || video.customTags.some(t => t.toLowerCase().includes(q));
          const matchDir = video.directory.toLowerCase().includes(q);
          if (!matchName && !matchClean && !matchTag && !matchDir) return false;
        }

        // Resolutions
        if (filterState.resolutions.length > 0) {
          const hasRes = filterState.resolutions.some(r => video.resolution.toLowerCase().includes(r.toLowerCase()));
          if (!hasRes) return false;
        }

        // Codecs
        if (filterState.codecs.length > 0) {
          const hasCodec = filterState.codecs.some(c => (video.codec || '').toLowerCase().includes(c.toLowerCase()) || video.smartTags.some(t => t.toLowerCase().includes(c.toLowerCase())));
          if (!hasCodec) return false;
        }

        // Tags
        if (filterState.tags.length > 0) {
          const allTags = [...video.smartTags, ...video.customTags];
          const hasAllTags = filterState.tags.every(t => allTags.includes(t));
          if (!hasAllTags) return false;
        }

        // Min & Max Duration
        if (!isPdf) {
          if (filterState.minDuration > 0 && video.duration > 0 && video.duration < filterState.minDuration) return false;
          if (filterState.maxDuration > 0 && video.duration > 0 && video.duration > filterState.maxDuration) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case 'name':
            cmp = a.cleanTitle.localeCompare(b.cleanTitle);
            break;
          case 'dateAdded':
            cmp = a.createdAt - b.createdAt;
            break;
          case 'dateModified':
            cmp = a.modifiedAt - b.modifiedAt;
            break;
          case 'duration':
            cmp = (a.duration || 0) - (b.duration || 0);
            break;
          case 'size':
            cmp = a.size - b.size;
            break;
          case 'resolution':
            cmp = (b.resolution.includes('4K') ? 2 : 1) - (a.resolution.includes('4K') ? 2 : 1);
            break;
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [videos, filterState, sortField, sortDirection, playlists]);

  return (
    <LibraryContext.Provider
      value={{
        videos,
        folders,
        playlists,
        filteredVideos,
        tabs,
        activeTabId,
        openInNewTab,
        closeTab,
        setActiveTabId,
        openLibraryTab,
        explorationMode,
        setExplorationMode,
        currentNavPath,
        setCurrentNavPath,
        navBreadcrumbs,
        navSubfolders,
        navFolderVideos,
        navigateIntoFolder,
        navigateUpFolder,
        navigateToBreadcrumb,
        viewMode,
        setViewMode,
        theme,
        setTheme,
        toggleTheme,
        cardScale,
        setCardScale,
        previewSpeed,
        cyclePreviewSpeed,
        sortField,
        setSortField,
        sortDirection,
        setSortDirection,
        filterState,
        setFilterState,
        resetFilters,
        activePlayingVideo,
        setActivePlayingVideo,
        floatingVideo,
        setFloatingVideo,
        contextMenu,
        setContextMenu,
        editingTagsVideo,
        setEditingTagsVideo,
        playlistModalVideo,
        setPlaylistModalVideo,
        isStatsOpen,
        setIsStatsOpen,
        isScanning,
        scanProgressText,
        addFolders,
        addWebFiles,
        removeFolder,
        refreshLibrary,
        toggleFavorite,
        addCustomTag,
        removeCustomTag,
        updateVideoTags,
        deleteVideoFromLibrary,
        deleteVideoFromDisk,
        moveVideoFile,
        createPlaylist,
        toggleVideoInPlaylist,
        deletePlaylist,
        revealInExplorer,
        allAvailableTags,
        totalStorageBytes,
        totalDurationSeconds,
        neonBorder,
        neonShadow,
        toggleNeonBorder,
        toggleNeonShadow,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
