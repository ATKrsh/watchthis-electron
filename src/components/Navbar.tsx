import React from 'react';
import { 
  Search, 
  FolderPlus, 
  LayoutGrid, 
  Columns, 
  List, 
  BarChart3, 
  ArrowUpDown, 
  RefreshCw,
  Sliders,
  Sun,
  Moon,
  Sparkles,
  Cloud,
  X
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { ViewMode, SortField } from '../types/video';
import { ReactiveLogo } from './ReactiveLogo';

export const Navbar: React.FC = () => {
  const {
    filterState,
    setFilterState,
    viewMode,
    setViewMode,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    addFolders,
    refreshLibrary,
    isScanning,
    setIsStatsOpen,
    filteredVideos,
    videos,
    theme,
    toggleTheme,
    cardScale,
    setCardScale,
    neonBorder,
    neonShadow,
    toggleNeonBorder,
    toggleNeonShadow,
  } = useLibrary();

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const isNeon = theme === 'neon';

  return (
    <header className="h-16 pl-5 pr-[165px] border-b border-white/[0.08] bg-surface/90 backdrop-blur-2xl flex items-center justify-between z-40 select-none font-sans app-drag-region">
      {/* Brand & Mouse-Reactive Animated Logo */}
      <div className="flex items-center gap-3.5 app-no-drag flex-shrink-0">
        <ReactiveLogo size={36} theme={theme} />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-wider text-white">
              WATCH<span className="text-accent-cyan font-bold drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">THIS</span>
            </span>
            <span className={`text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border font-medium ${
              isNeon ? 'bg-accent/20 text-accent-cyan border-accent-cyan/30 shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-white/10 text-slate-300 border-white/15'
            }`}>
              Pro
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-normal">
            {filteredVideos.length} / {videos.length} indexed
          </span>
        </div>
      </div>

      {/* Global Command Search Bar */}
      <div className="flex-1 max-w-lg mx-6 app-no-drag min-w-0">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={filterState.search}
            onChange={(e) => setFilterState(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search titles, filenames, #4K, #HEVC, #HDR, #60FPS..."
            className="w-full h-9 pl-10 pr-9 rounded-xl bg-surface-elevated/80 border border-white/[0.1] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all font-normal shadow-inner"
          />
          {filterState.search ? (
            <button
              onClick={() => setFilterState(prev => ({ ...prev, search: '' }))}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="absolute right-3 text-[10px] font-mono text-slate-500 border border-white/10 px-1.5 py-0.2 rounded bg-white/[0.04]">
              /
            </span>
          )}
        </div>
      </div>

      {/* Controls & Actions Bar */}
      <div className="flex items-center gap-2 app-no-drag flex-shrink-0">
        {/* Card Size Slider */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-elevated/80 border border-white/[0.08] shadow-sm">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="range"
            min="180"
            max="460"
            step="10"
            value={cardScale}
            onChange={(e) => setCardScale(parseInt(e.target.value, 10))}
            title={`Card size: ${cardScale}px`}
            className="w-16 h-1.5 accent-accent bg-white/15 rounded-lg cursor-pointer"
          />
        </div>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${isNeon ? 'Minimal Subtle Dark' : 'Neon Cyber'} Theme`}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-medium transition-all active:scale-95 shadow-sm ${
            isNeon
              ? 'bg-surface-elevated border-white/15 text-accent-neon hover:border-accent-neon/50'
              : 'bg-surface-elevated border-white/15 text-slate-200 hover:text-white'
          }`}
        >
          {isNeon ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          <span className="text-[11px] hidden md:inline">{isNeon ? 'Neon' : 'Minimal'}</span>
        </button>

        {/* Toggle 1: Crystal Neon Border Outline */}
        <button
          onClick={toggleNeonBorder}
          title={neonBorder ? 'Disable Crystal Neon Border' : 'Enable Bright Blue Crystal Neon Border Outline'}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
            neonBorder
              ? 'bg-cyan-500/25 border-[#00f0ff] text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.4)]'
              : 'bg-surface-elevated border-white/10 text-slate-300 hover:text-white hover:border-white/25'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${neonBorder ? 'text-[#00f0ff]' : 'text-slate-400'}`} />
          <span className="text-[11px] hidden lg:inline">Crystal</span>
        </button>

        {/* Toggle 2: Neon Cloud Drop Shadow */}
        <button
          onClick={toggleNeonShadow}
          title={neonShadow ? 'Disable Neon Cloud Glow' : 'Enable Neon Cloud Ambient Glow'}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
            neonShadow
              ? 'bg-blue-500/25 border-sky-400 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
              : 'bg-surface-elevated border-white/10 text-slate-300 hover:text-white hover:border-white/25'
          }`}
        >
          <Cloud className={`w-3.5 h-3.5 ${neonShadow ? 'text-sky-300' : 'text-slate-400'}`} />
          <span className="text-[11px] hidden lg:inline">Cloud</span>
        </button>

        {/* Add Folder Button */}
        <button
          onClick={() => addFolders()}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-gradient-to-r from-accent to-indigo-600 hover:from-accent-hover hover:to-indigo-500 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50 shadow-glow-accent"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Folder</span>
        </button>

        {/* Refresh Library Button */}
        <button
          onClick={() => refreshLibrary()}
          disabled={isScanning}
          title="Refresh Library"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-elevated border border-white/[0.1] text-slate-300 hover:text-white hover:border-white/25 transition-all active:scale-95 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-accent-cyan' : ''}`} />
        </button>

        {/* Diagnostics / Stats Button */}
        <button
          onClick={() => setIsStatsOpen(true)}
          title="Library Diagnostics"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-elevated border border-white/[0.1] text-slate-300 hover:text-accent-neon hover:border-accent-neon/40 transition-all active:scale-95 shadow-sm"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </button>

        {/* Divider */}
        <div className="w-[1px] h-5 bg-white/15 mx-1" />

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1 rounded-xl border border-white/[0.1] shadow-sm">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortField}
            onChange={(e) => handleSortChange(e.target.value as SortField)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-normal"
          >
            <option value="dateAdded" className="bg-surface text-white">Date Added</option>
            <option value="name" className="bg-surface text-white">Title</option>
            <option value="size" className="bg-surface text-white">File Size</option>
            <option value="duration" className="bg-surface text-white">Duration</option>
            <option value="resolution" className="bg-surface text-white">Resolution</option>
          </select>
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="text-[10px] font-mono text-accent-cyan px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 uppercase font-medium transition-colors"
          >
            {sortDirection}
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-surface-elevated p-1 rounded-xl border border-white/[0.1] shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid View"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-accent text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('poster')}
            title="Poster View"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'poster'
                ? 'bg-accent text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            title="Compact List View"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'compact'
                ? 'bg-accent text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
