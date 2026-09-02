import React from 'react';
import { 
  Folder, 
  FolderPlus, 
  Trash2, 
  HardDrive, 
  Star, 
  Sparkles, 
  Clock, 
  Flame, 
  Film, 
  Zap, 
  Layers,
  ListVideo,
  FileText
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
    setExplorationMode
  } = useLibrary();

  const isNeon = theme === 'neon';

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

  const categories = [
    { id: 'all', label: 'All Media', icon: Film, count: videos.length, color: isNeon ? 'text-accent-cyan' : 'text-slate-300' },
    { id: 'pdf', label: 'PDF Documents', icon: FileText, count: videos.filter(v => v.isPdf || v.extension?.toLowerCase() === '.pdf').length, color: 'text-red-400' },
    { id: '4k', label: '4K Ultra HD', icon: Sparkles, count: videos.filter(v => v.resolution.includes('4K')).length, color: 'text-amber-400' },
    { id: 'hdr', label: 'HDR & 10-Bit', icon: Zap, count: videos.filter(v => v.hdr || v.smartTags.includes('HDR')).length, color: isNeon ? 'text-accent-magenta' : 'text-slate-400' },
    { id: '60fps', label: '60 FPS High Rate', icon: Flame, count: videos.filter(v => v.fps === 60 || v.smartTags.includes('60 FPS')).length, color: 'text-emerald-400' },
    { id: 'favorites', label: 'Favorites', icon: Star, count: videos.filter(v => v.isFavorite).length, color: 'text-yellow-400' },
    { id: 'recents', label: 'Recently Added', icon: Clock, count: videos.filter(v => (Date.now() - v.modifiedAt) < 1000 * 60 * 60 * 24 * 7).length, color: 'text-indigo-400' },
  ];

  const storagePercentage = totalStorageBytes === 0 ? 0 : Math.min(100, Math.max(1, (totalStorageBytes / (100 * 1024 * 1024 * 1024)) * 100));

  return (
    <aside className="w-64 h-[calc(100vh-4rem)] border-r border-white/[0.08] bg-surface/75 backdrop-blur-2xl flex flex-col justify-between select-none overflow-hidden font-sans">
      {/* Top Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {/* Quick Categories */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2.5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 font-semibold">
              <Layers className="w-3.5 h-3.5 text-accent-cyan" /> Library
            </span>
          </div>
          <nav className="space-y-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = filterState.quickCategory === cat.id && !filterState.selectedFolder && !filterState.selectedPlaylist;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-accent/25 to-accent-cyan/15 text-white border border-accent/40 font-medium shadow-sm'
                      : 'text-slate-300 hover:bg-white/[0.05] hover:text-white font-normal'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-accent-neon' : cat.color}`} />
                    <span className="tracking-wide">{cat.label}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                    isActive ? 'bg-accent text-white shadow-sm' : 'bg-white/10 text-slate-400'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Custom Playlists Section */}
        {playlists.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 mb-2.5">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 font-semibold">
                <ListVideo className="w-3.5 h-3.5 text-accent-magenta" /> Playlists ({playlists.length})
              </span>
            </div>

            <div className="space-y-1.5">
              {playlists.map((pl) => {
                const isActive = filterState.selectedPlaylist === pl.id;
                return (
                  <div
                    key={pl.id}
                    onClick={() => handlePlaylistClick(pl.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-accent-magenta/20 border-accent-magenta/50 text-white font-medium shadow-sm'
                        : 'bg-surface-elevated/60 border-white/[0.06] text-slate-300 hover:bg-surface-elevated hover:text-white font-normal'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-opacity"
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

        {/* Watch Folders Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2.5">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 font-semibold">
              <HardDrive className="w-3.5 h-3.5 text-accent-cyan" /> Indexed Folders ({folders.length})
            </span>
            <button
              onClick={() => addFolders()}
              disabled={isScanning}
              title="Add New Folder"
              className="p-1 rounded-lg text-slate-400 hover:text-accent-cyan hover:bg-white/10 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {folders.length === 0 ? (
              <div className="p-3 text-center rounded-xl border border-dashed border-white/15 bg-white/[0.02]">
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
                const isActive = filterState.selectedFolder && normalizePath(filterState.selectedFolder).toLowerCase() === normalizePath(folder.path).toLowerCase();
                return (
                  <div
                    key={folder.path}
                    onClick={() => handleFolderClick(folder.path)}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-accent/20 border-accent/50 text-white font-medium shadow-sm'
                        : 'bg-surface-elevated/60 border-white/[0.06] text-slate-300 hover:bg-surface-elevated hover:text-white font-normal'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Folder className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-accent-neon' : 'text-accent-cyan'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate leading-tight">{folder.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5 font-normal">
                          {folder.itemCount} items &bull; {formatFileSize(folder.totalSize)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFolder(folder.path);
                      }}
                      title="Remove folder"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Storage & Index Telemetry Footer */}
      <div className="p-3.5 border-t border-white/[0.08] bg-surface-elevated/80 space-y-2.5">
        {/* Storage Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mb-1.5 font-medium">
            <span>Library Storage</span>
            <span className="text-white font-semibold">{formatFileSize(totalStorageBytes)}</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isNeon 
                  ? 'bg-gradient-to-r from-accent via-accent-cyan to-accent-neon shadow-[0_0_10px_#00f0ff]' 
                  : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
              }`}
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
        </div>

        {/* Engine Status */}
        <div className="flex items-center justify-between pt-1.5 text-[10px] font-mono text-slate-400 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse" />
            <span className="text-slate-300 font-medium">Zero-Copy Stream</span>
          </div>
          <span className="text-accent-cyan font-medium">
            120 FPS
          </span>
        </div>
      </div>
    </aside>
  );
};
