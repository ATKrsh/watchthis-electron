import React from 'react';
import { 
  Folder, 
  FolderPlus, 
  Trash2, 
  HardDrive, 
  Sparkles, 
  Clock, 
  Film, 
  Layers,
  ListVideo,
  FileText,
  Video,
  Tv,
  Monitor,
  Globe,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { useLibrary, normalizePath } from '../context/LibraryContext';
import { formatFileSize } from '../utils/formatters';

export const Sidebar: React.FC = () => {
  const {
    folders,
    playlists,
    filterState,
    setFilterState,
    removeFolder,
    addFolders,
    totalStorageBytes,
    videos,
    isScanning,
    deletePlaylist,
    theme,
    setExplorationMode,
    diskStorage,
    indexingStage,
    openOnlineTab,
    sidebarMode,
    cycleSidebarMode
  } = useLibrary();

  const isNeon = theme === 'neon';

  // If sidebar is totally vanished/hidden
  if (sidebarMode === 'hidden') {
    return null;
  }

  const handleCategoryClick = (cat: string) => {
    setFilterState(prev => ({
      ...prev,
      quickCategory: prev.quickCategory === cat ? 'all' : cat,
      selectedFolder: null,
      selectedPlaylist: null
    }));
    if (cat !== 'all') {
      setExplorationMode('files');
    } else {
      setExplorationMode('folders');
    }
  };

  const handleFolderClick = (folderPath: string) => {
    setFilterState(prev => {
      const isSame = prev.selectedFolder && normalizePath(prev.selectedFolder).toLowerCase() === normalizePath(folderPath).toLowerCase();
      return {
        ...prev,
        selectedFolder: isSame ? null : folderPath,
        selectedPlaylist: null,
        quickCategory: 'all'
      };
    });
  };

  const handlePlaylistClick = (playlistId: string) => {
    setFilterState(prev => ({
      ...prev,
      selectedPlaylist: prev.selectedPlaylist === playlistId ? null : playlistId,
      selectedFolder: null,
      quickCategory: 'all'
    }));
  };

  const formatCategories = [
    { id: 'all', label: 'All Media', icon: Film, count: videos.length, color: isNeon ? 'text-accent-cyan' : 'text-slate-300' },
    { id: 'video', label: 'Video Files', icon: Video, count: videos.filter(v => !v.isPdf && v.extension?.toLowerCase() !== '.pdf').length, color: 'text-sky-400' },
    { id: 'pdf', label: 'PDF Documents', icon: FileText, count: videos.filter(v => v.isPdf || v.extension?.toLowerCase() === '.pdf').length, color: 'text-red-400' },
  ];

  const resolutionCategories = [
    { id: '4k', label: '4K Ultra HD', icon: Sparkles, count: videos.filter(v => !v.isPdf && (v.resolution.includes('4K') || v.resolution.includes('2160'))).length, color: 'text-amber-400' },
    { id: '1080p', label: '1080p Full HD', icon: Monitor, count: videos.filter(v => !v.isPdf && (v.resolution.includes('1080') || (!v.resolution.includes('4K') && !v.resolution.includes('720') && !v.resolution.includes('SD') && !v.resolution.includes('480')))).length, color: 'text-cyan-400' },
    { id: '720p', label: '720p HD', icon: Tv, count: videos.filter(v => !v.isPdf && v.resolution.includes('720')).length, color: 'text-blue-400' },
    { id: 'sd', label: 'SD Standard', icon: Film, count: videos.filter(v => !v.isPdf && (v.resolution.includes('SD') || v.resolution.includes('480') || v.resolution.includes('576'))).length, color: 'text-slate-400' },
  ];

  // Storage calculations against real PC Drive space
  const totalDriveBytes = diskStorage?.totalBytes || (1024 * 1024 * 1024 * 1024 * 2);
  const storagePercentage = totalDriveBytes > 0 
    ? ((totalStorageBytes / totalDriveBytes) * 100).toFixed(1)
    : '0.0';

  const driveBarWidth = Math.min(100, Math.max(1, (totalStorageBytes / totalDriveBytes) * 100));

  // Staged progress calculations
  const isCaching = indexingStage.stage === 'caching';
  const cachingPercent = indexingStage.totalToCache > 0 
    ? Math.round((indexingStage.cachedCount / indexingStage.totalToCache) * 100)
    : 100;

  // ── Step 1: Mini Icon Thin Strip (Compact Mode) ──
  if (sidebarMode === 'compact') {
    return (
      <aside className="w-14 h-full border-r border-white/[0.12] bg-surface/90 backdrop-blur-2xl flex flex-col justify-between items-center py-2.5 select-none overflow-hidden font-sans z-20 flex-shrink-0 transition-all duration-200">
        {/* Top Mini Navigation Icons */}
        <div className="flex flex-col items-center gap-2 w-full px-1.5 overflow-y-auto no-scrollbar">
          {/* Step Collapse / Expand Trigger */}
          <button
            onClick={cycleSidebarMode}
            title="Click to totally vanish/hide sidebar (or expand)"
            className="w-9 h-8 flex items-center justify-center bg-white/[0.04] hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-accent-cyan" />
          </button>

          <div className="w-6 h-[1px] bg-white/10 my-0.5" />

          {/* Media Categories Icons */}
          {formatCategories.map(cat => {
            const Icon = cat.icon;
            const isActive = filterState.quickCategory === cat.id && !filterState.selectedFolder && !filterState.selectedPlaylist;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                title={`${cat.label} (${cat.count})`}
                className={`relative w-9 h-8 flex items-center justify-center border transition-all ${
                  isActive
                    ? 'bg-accent/30 text-white border-accent-cyan/60 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent-neon' : cat.color}`} />
              </button>
            );
          })}

          <div className="w-6 h-[1px] bg-white/10 my-0.5" />

          {/* Resolution Icons */}
          {resolutionCategories.map(cat => {
            const Icon = cat.icon;
            const isActive = filterState.quickCategory === cat.id && !filterState.selectedFolder && !filterState.selectedPlaylist;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                title={`${cat.label} (${cat.count})`}
                className={`relative w-9 h-8 flex items-center justify-center border transition-all ${
                  isActive
                    ? 'bg-accent/30 text-white border-accent-cyan/60 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent-neon' : cat.color}`} />
              </button>
            );
          })}

          <div className="w-6 h-[1px] bg-white/10 my-0.5" />

          {/* Online Hub Icon */}
          <button
            onClick={() => openOnlineTab()}
            title="Open Online Video & Reels Hub"
            className="w-9 h-8 flex items-center justify-center border border-transparent text-slate-400 hover:text-accent-neon hover:bg-white/[0.08] transition-all"
          >
            <Globe className="w-4 h-4 text-accent-neon" />
          </button>

          {/* Folders Icon */}
          <button
            onClick={() => setExplorationMode('folders')}
            title={`Indexed Folders (${folders.length})`}
            className={`w-9 h-8 flex items-center justify-center border transition-all ${
              !filterState.quickCategory || filterState.quickCategory === 'all'
                ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/40'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Folder className="w-4 h-4 text-accent-cyan" />
          </button>
        </div>

        {/* Bottom Mini Storage Gauge with Blank Bottom Gap */}
        <div className="w-full flex flex-col items-center pb-4 pt-2">
          <div 
            title={`Indexed Size: ${formatFileSize(totalStorageBytes)} / ${formatFileSize(totalDriveBytes)} (${storagePercentage}%)`}
            className="w-8 h-8 flex items-center justify-center bg-surface-elevated border border-white/15 text-accent-cyan text-[9px] font-mono cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5 text-accent-cyan" />
          </div>
        </div>
      </aside>
    );
  }

  // ── Step 0: Full Expanded Sidebar Mode ──
  const renderCategoryGroup = (title: string, icon: React.ReactNode, items: typeof formatCategories) => (
    <div>
      <div className="flex items-center justify-between px-1.5 mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 font-bold">
          {icon} {title}
        </span>
      </div>
      <nav className="space-y-0.5">
        {items.map((cat) => {
          const Icon = cat.icon;
          const isActive = filterState.quickCategory === cat.id && !filterState.selectedFolder && !filterState.selectedPlaylist;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 border text-xs font-mono transition-all ${
                isActive
                  ? 'bg-accent/25 text-white border-accent/50 font-bold shadow-sm'
                  : 'border-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white font-normal'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-accent-neon' : cat.color}`} />
                <span className="tracking-wide font-sans">{cat.label}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 border font-mono font-semibold ${
                isActive ? 'bg-accent text-white border-accent-cyan/40' : 'bg-white/5 text-slate-400 border-white/10'
              }`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <aside className="w-64 h-full border-r border-white/[0.12] bg-surface/85 backdrop-blur-2xl flex flex-col justify-between select-none overflow-hidden font-sans flex-shrink-0 transition-all duration-200">
      {/* Top Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-4">
        {/* Media Formats Section */}
        {renderCategoryGroup('Media Library', <Layers className="w-3.5 h-3.5 text-accent-cyan" />, formatCategories)}

        {/* Resolution Tiers Section */}
        {renderCategoryGroup('Resolutions', <Sparkles className="w-3.5 h-3.5 text-amber-400" />, resolutionCategories)}

        {/* Online Video & Reels Hub Section */}
        <div>
          <div className="flex items-center justify-between px-1.5 mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 font-bold">
              <Globe className="w-3.5 h-3.5 text-accent-neon" /> Online & Reels
            </span>
            <button
              onClick={() => openOnlineTab()}
              title="Open Online Video Hub Directory"
              className="text-[9px] font-mono text-accent-neon hover:underline"
            >
              Open Hub
            </button>
          </div>
          <nav className="space-y-0.5">
            {[
              { label: 'YouTube Watch', url: 'https://www.youtube.com', color: 'text-red-400' },
              { label: 'YouTube Shorts', url: 'https://www.youtube.com/shorts', color: 'text-red-300' },
              { label: 'Instagram Reels', url: 'https://www.instagram.com/reels/', color: 'text-pink-400' },
              { label: 'FikFap 18+', url: 'https://fikfap.com', color: 'text-orange-400' },
              { label: 'TikTok', url: 'https://www.tiktok.com', color: 'text-cyan-300' },
            ].map((site) => (
              <button
                key={site.label}
                onClick={() => openOnlineTab(site.url, site.label)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 border border-transparent text-xs font-mono text-slate-300 hover:bg-white/[0.06] hover:text-white transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${site.color}`} />
                  <span className="truncate font-sans">{site.label}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">Launch</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Custom Playlists Section */}
        {playlists.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-1.5 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 font-bold">
                <ListVideo className="w-3.5 h-3.5 text-accent-magenta" /> Playlists ({playlists.length})
              </span>
            </div>

            <div className="space-y-1">
              {playlists.map((pl) => {
                const isActive = filterState.selectedPlaylist === pl.id;
                return (
                  <div
                    key={pl.id}
                    onClick={() => handlePlaylistClick(pl.id)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 border text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-accent-magenta/20 border-accent-magenta/50 text-white font-semibold shadow-sm'
                        : 'bg-surface-elevated/60 border-white/[0.08] text-slate-300 hover:bg-surface-elevated hover:text-white font-normal'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ListVideo className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-accent-magenta' : 'text-slate-400'}`} />
                      <span className="truncate">{pl.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        {pl.videoIds.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaylist(pl.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Indexed Folders Section */}
        <div>
          <div className="flex items-center justify-between px-1.5 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 font-bold">
              <HardDrive className="w-3.5 h-3.5 text-accent-cyan" /> Indexed Folders ({folders.length})
            </span>
            <button
              onClick={() => addFolders()}
              disabled={isScanning}
              title="Add New Media Folder"
              className="p-1 border border-white/10 text-slate-400 hover:text-accent-cyan hover:border-accent-cyan/40 bg-white/[0.04] transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {folders.length === 0 ? (
              <div className="p-3 text-center border border-dashed border-white/15 bg-white/[0.02]">
                <p className="text-xs text-slate-400">No folders indexed yet</p>
                <button
                  onClick={() => addFolders()}
                  className="mt-1.5 text-xs text-accent-cyan hover:underline font-medium"
                >
                  Add Media Folder
                </button>
              </div>
            ) : (
              folders.map((folder) => {
                const normFolder = normalizePath(folder.path).toLowerCase();
                const isActive = filterState.selectedFolder && normalizePath(filterState.selectedFolder).toLowerCase() === normFolder;
                const matchingVideos = videos.filter(v => normalizePath(v.path).toLowerCase().startsWith(normFolder));
                const liveCount = matchingVideos.length;
                const liveSize = matchingVideos.reduce((s, v) => s + (v.size || 0), 0);

                return (
                  <div
                    key={folder.path}
                    onClick={() => handleFolderClick(folder.path)}
                    className={`group relative flex items-center justify-between p-2 border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-accent/20 border-accent/50 text-white font-semibold shadow-sm'
                        : 'bg-surface-elevated/60 border-white/[0.08] text-slate-300 hover:bg-surface-elevated hover:text-white font-normal'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <Folder className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? 'text-accent-neon' : 'text-accent-cyan'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium truncate leading-tight">{folder.name}</p>
                        <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                          {liveCount} items &bull; {formatFileSize(liveSize)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFolder(folder.path);
                      }}
                      title="Remove folder from index"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Staged Indexing & Cache Generation Progress Bars */}
          {(isScanning || isCaching) && (
            <div className="mt-3 p-2.5 bg-black/60 border border-accent-cyan/30 space-y-2 font-mono text-[10px]">
              <div className="flex items-center justify-between text-accent-cyan font-bold">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-spin" />
                  <span>{isScanning ? 'STAGE 1: SCANNING' : 'STAGE 2: DUMP CACHING'}</span>
                </span>
                <span>{isScanning ? 'INDEXING' : `${cachingPercent}%`}</span>
              </div>

              {/* Stage 1: File Indexing Bar */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Files Discovery:</span>
                  <span className="text-white">{indexingStage.scanCount || videos.length} files</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-accent-cyan transition-all duration-300"
                    style={{ width: isScanning ? '80%' : '100%' }}
                  />
                </div>
              </div>

              {/* Stage 2: Thumbnail & Preview Dump Generation Bar */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Cache Generator:</span>
                  <span className="text-accent-neon font-semibold">
                    {indexingStage.cachedCount} / {indexingStage.totalToCache || videos.length}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent to-accent-neon transition-all duration-200"
                    style={{ width: `${cachingPercent}%` }}
                  />
                </div>
              </div>

              {indexingStage.currentItem && (
                <p className="text-[9px] text-slate-400 truncate mt-1">
                  &bull; {indexingStage.currentItem}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Storage Footer with Blank Space / Gap Below */}
      <div className="px-3 pb-6 pt-1">
        <div className="p-3 border border-white/[0.12] bg-surface-elevated/95 space-y-2 font-mono font-light shadow-md">
          {/* Storage Info with Format: 500.5 GB / 2.51 TB (Percentage%) */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 tracking-wider">
              <span className="uppercase font-light text-slate-300">Indexed Size</span>
              <span className="text-accent-cyan font-normal">{storagePercentage}%</span>
            </div>

            <p className="text-xs text-white font-normal tracking-wide mb-1.5">
              {formatFileSize(totalStorageBytes)} <span className="text-slate-500 font-light">/</span> {formatFileSize(totalDriveBytes)}
            </p>

            <div className="h-1.5 w-full bg-black/70 border border-white/10 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  isNeon 
                    ? 'bg-gradient-to-r from-accent via-accent-cyan to-accent-neon shadow-[0_0_8px_#00f0ff]' 
                    : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                }`}
                style={{ width: `${driveBarWidth}%` }}
              />
            </div>
          </div>

          {/* Engine Status */}
          <div className="flex items-center justify-between pt-1.5 text-[9px] text-slate-400 border-t border-white/10 font-light">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              <span className="text-slate-300">Dump Zip Cache</span>
            </div>
            <span className="text-accent-cyan font-normal">
              Ready
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};


