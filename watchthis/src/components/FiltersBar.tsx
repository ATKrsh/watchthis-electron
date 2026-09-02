import React from 'react';
import { Tag, X, Folder, LayoutGrid, ChevronRight, CornerLeftUp } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';

export const FiltersBar: React.FC = () => {
  const {
    filterState,
    setFilterState,
    resetFilters,
    allAvailableTags,
    filteredVideos,
    videos,
    explorationMode,

    setExplorationMode,
    currentNavPath,
    navBreadcrumbs,
    navigateToBreadcrumb,
    navigateUpFolder,
    navSubfolders,
    navFolderVideos,
  } = useLibrary();

  const resolutions = ['4K UHD', '1080p', '720p', 'SD'];
  const codecs = ['HEVC', 'H.264', 'AV1', 'VP9'];

  const toggleResolution = (res: string) => {
    setFilterState(prev => {
      const exists = prev.resolutions.includes(res);
      return {
        ...prev,
        resolutions: exists ? prev.resolutions.filter(r => r !== res) : [...prev.resolutions, res]
      };
    });
  };

  const toggleCodec = (codec: string) => {
    setFilterState(prev => {
      const exists = prev.codecs.includes(codec);
      return {
        ...prev,
        codecs: exists ? prev.codecs.filter(c => c !== codec) : [...prev.codecs, codec]
      };
    });
  };

  const toggleTag = (tag: string) => {
    setFilterState(prev => {
      const exists = prev.tags.includes(tag);
      return {
        ...prev,
        tags: exists ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
      };
    });
  };

  const isFiltering = 
    filterState.search !== '' ||
    filterState.resolutions.length > 0 ||
    filterState.codecs.length > 0 ||
    filterState.tags.length > 0 ||
    filterState.selectedFolder !== null ||
    filterState.favoriteOnly ||
    filterState.quickCategory !== 'all';

  return (
    <div className="flex flex-col border-b border-white/[0.12] bg-surface/75 backdrop-blur-xl select-none font-sans">
      {/* 1. Top Mode Switcher & Breadcrumb Navigation Bar */}
      <div className="px-5 py-2 border-b border-white/[0.08] flex items-center justify-between gap-3 overflow-x-auto">
        {/* Left: Exploration Mode Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center bg-black/60 p-0.5 border border-white/20 flex-shrink-0 shadow-inner">
            <button
              onClick={() => setExplorationMode('folders')}
              title="Normal Mode: Maintain and explore folder hierarchy"
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium transition-all ${
                explorationMode === 'folders'
                  ? 'bg-accent text-white shadow-glow-accent'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Normal Folders</span>
            </button>

            <button
              onClick={() => setExplorationMode('files')}
              title="Flat File Mode: Global flattened media index"
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium transition-all ${
                explorationMode === 'files'
                  ? 'bg-accent-cyan text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Flat Files</span>
            </button>
          </div>

          {/* Breadcrumb Trail when in Folders Mode */}
          {explorationMode === 'folders' && (
            <div className="flex items-center gap-1 min-w-0 text-xs font-mono overflow-x-auto py-0.5">
              {currentNavPath !== null && (
                <button
                  onClick={navigateUpFolder}
                  title="Go up one folder"
                  className="flex items-center gap-1 px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white text-xs transition-colors flex-shrink-0 mr-1 font-semibold border border-white/15"
                >
                  <CornerLeftUp className="w-3.5 h-3.5" />
                  <span>Up</span>
                </button>
              )}

              {navBreadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.path || 'root'}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                  <button
                    onClick={() => navigateToBreadcrumb(crumb.path)}
                    className={`px-2 py-0.5 truncate max-w-[220px] transition-all flex-shrink-0 font-medium border ${
                      idx === navBreadcrumbs.length - 1
                        ? 'bg-accent/25 text-accent-neon border-accent-cyan/40 shadow-sm'
                        : 'border-transparent text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/15'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Right: Telemetry count & Reset Button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isFiltering && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-xs font-mono font-medium transition-all"
            >
              <X className="w-3 h-3" />
              <span>Clear Filters</span>
            </button>
          )}

          <div className="text-xs font-mono text-slate-400 font-medium">
            {explorationMode === 'folders' ? (
              <span>
                {navSubfolders.length > 0 && `${navSubfolders.length} subfolders \u2022 `}
                {navFolderVideos.length} media items
              </span>
            ) : (
              <span>
                {filteredVideos.length === videos.length
                  ? `${videos.length} indexed files`
                  : `Showing ${filteredVideos.length} / ${videos.length} files`}
              </span>
            )}
          </div>

        </div>
      </div>

      {/* 2. Middle Bar: Resolutions & Codecs Group */}
      <div className="px-5 py-2 border-b border-white/[0.06] flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Resolutions Filter Group */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold mr-1">Res:</span>
            {resolutions.map(res => {
              const isSelected = filterState.resolutions.includes(res);
              return (
                <button
                  key={res}
                  onClick={() => toggleResolution(res)}
                  className={`px-2.5 py-0.5 text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-accent-cyan text-slate-950 border-accent-cyan shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : 'bg-surface-elevated/80 border-white/[0.12] text-slate-300 hover:text-white hover:border-white/30'
                  }`}
                >
                  {res}
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-white/15 mx-1" />

          {/* Codec Filter Group */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold mr-1">Codec:</span>
            {codecs.map(codec => {
              const isSelected = filterState.codecs.includes(codec);
              return (
                <button
                  key={codec}
                  onClick={() => toggleCodec(codec)}
                  className={`px-2.5 py-0.5 text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-accent text-white border-accent shadow-glow-accent'
                      : 'bg-surface-elevated/80 border-white/[0.12] text-slate-300 hover:text-white hover:border-white/30'
                  }`}
                >
                  {codec}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Bottom Dedicated Tags Bar: Shifted Directly Below Resolution Bar */}
      <div className="px-5 py-1.5 flex items-center gap-1.5 overflow-x-auto bg-black/30">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold mr-1 flex items-center gap-1 flex-shrink-0">
          <Tag className="w-3 h-3 text-accent-neon" /> Tags:
        </span>
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
          {allAvailableTags.slice(0, 24).map(tag => {
            const isSelected = filterState.tags.includes(tag);
            const isNsfw = tag.includes('NSFW') || tag.includes('18+');
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-0.5 text-xs font-mono font-medium whitespace-nowrap transition-all border ${
                  isSelected
                    ? isNsfw ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-accent-neon text-slate-950 border-accent-neon shadow-[0_0_8px_rgba(0,245,212,0.4)]'
                    : isNsfw ? 'bg-red-950/30 border-red-500/40 text-red-300 hover:border-red-400' : 'bg-surface-elevated/80 border-white/[0.1] text-slate-300 hover:text-white hover:border-white/30'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
