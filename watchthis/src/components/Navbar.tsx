import React, { useState, useEffect } from 'react';
import { 
  Search, 
  LayoutGrid, 
  Columns, 
  List, 
  BarChart3, 
  ArrowUpDown, 
  RefreshCw, 
  Sun, 
  Moon, 
  X,
  Image as ImageIcon,
  FastForward,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeft,
  PanelLeftInactive,
  Maximize,
  Minimize,
  Minus,
  Square
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
    reindexAllFiles,
    isScanning,
    indexingStage,
    indexingEtaFormatted,
    setIsStatsOpen,
    filteredVideos,
    videos,
    theme,
    toggleTheme,
    showThumbnails,
    toggleShowThumbnails,
    enableHoverPreview,
    toggleEnableHoverPreview,
    previewSpeed,
    cyclePreviewSpeed,
    sidebarMode,
    cycleSidebarMode,
  } = useLibrary();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Sync window state with Electron or browser
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isFullScreen?.().then(fs => setIsFullscreen(Boolean(fs)));
      window.electronAPI.isMaximized?.().then(max => setIsMaximized(Boolean(max)));

      if (window.electronAPI.onWindowStateChange) {
        const cleanup = window.electronAPI.onWindowStateChange((state) => {
          setIsMaximized(state.isMaximized);
          setIsFullscreen(state.isFullScreen);
        });
        return cleanup;
      }
    } else {
      const handleFsChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement));
      };
      document.addEventListener('fullscreenchange', handleFsChange);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }
  }, []);

  // F11 global shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleToggleFullscreen = async () => {
    if (window.electronAPI?.toggleFullScreen) {
      const res = await window.electronAPI.toggleFullScreen();
      setIsFullscreen(Boolean(res));
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleMaximize = async () => {
    if (window.electronAPI?.maximizeWindow) {
      const res = await window.electronAPI.maximizeWindow();
      setIsMaximized(Boolean(res));
    }
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow?.();
  };

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const isNeon = theme === 'neon';
  const isBusy = isScanning || indexingStage.stage === 'caching';

  const getSidebarIcon = () => {
    if (sidebarMode === 'full') return <PanelLeftClose className="w-3.5 h-3.5 text-accent-cyan" />;
    if (sidebarMode === 'compact') return <PanelLeft className="w-3.5 h-3.5 text-accent-neon" />;
    return <PanelLeftInactive className="w-3.5 h-3.5 text-slate-400" />;
  };

  const getSidebarTooltip = () => {
    if (sidebarMode === 'full') return 'Sidebar: Full (Click to switch to Mini Icons)';
    if (sidebarMode === 'compact') return 'Sidebar: Mini Icons (Click to completely Hide)';
    return 'Sidebar: Hidden (Click to Expand)';
  };

  return (
    <header className="h-16 px-3 border-b border-white/[0.12] bg-surface/95 backdrop-blur-2xl flex items-center justify-between gap-3 z-40 select-none font-sans app-drag-region overflow-hidden flex-shrink-0">
      {/* ── Far Left: Isolated Mouse-Reactive Animated Logo (Lonely) ── */}
      <div 
        className="flex items-center flex-shrink-0 cursor-pointer app-no-drag pl-0.5"
        title={`WatchThis Pro (${filteredVideos.length === videos.length ? `${videos.length} files` : `${filteredVideos.length}/${videos.length} files`})`}
      >
        <ReactiveLogo size={32} theme={theme} />
      </div>

      {/* ── Right Controls: Fullscreen, Sidebar, Engine Toggles, Reindex, Search, Sort, View, and Frameless Window Controls ── */}
      <div className="flex items-center gap-1.5 app-no-drag flex-shrink-0 overflow-x-auto no-scrollbar py-1">
        {/* Group: Fullscreen Toggle (Left side of Sidebar Collapse Button) & Sidebar Collapse Button */}
        <div className="flex items-center gap-1.5 mr-0.5">
          {/* Fullscreen (Without Taskbar) Toggle Button */}
          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (Without Taskbar) (F11)' : 'Fullscreen (Without Taskbar) (F11)'}
            className={`flex items-center justify-center w-7 h-7 border text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0 ${
              isFullscreen
                ? 'bg-accent/30 text-accent-neon border-accent-cyan/60 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'bg-surface-elevated/80 hover:bg-white/10 border-white/[0.12]'
            }`}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-accent-neon" /> : <Maximize className="w-3.5 h-3.5 text-accent-cyan" />}
          </button>

          {/* Sidebar 2-Step Collapse Toggle Button */}
          <button
            onClick={cycleSidebarMode}
            title={getSidebarTooltip()}
            className="flex items-center justify-center w-7 h-7 bg-surface-elevated/80 hover:bg-white/10 border border-white/[0.12] text-slate-300 hover:text-white transition-all shadow-sm flex-shrink-0"
          >
            {getSidebarIcon()}
          </button>
        </div>

        {/* Group 1: Quick Engine Toggles & Theme */}
        <div className="flex items-center bg-surface-elevated/80 p-0.5 border border-white/[0.12] shadow-sm">
          {/* Toggle A: Thumbnails ON / OFF */}
          <button
            onClick={toggleShowThumbnails}
            title={showThumbnails ? 'Thumbnails Enabled (Click to toggle)' : 'Thumbnails Disabled'}
            className={`flex items-center gap-1 px-2 h-7 text-xs font-mono transition-all ${
              showThumbnails
                ? 'bg-accent/30 text-accent-neon font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden xl:inline">{showThumbnails ? 'Thumbs ON' : 'OFF'}</span>
          </button>

          {/* Toggle B: Hover Previews ON / OFF */}
          <button
            onClick={toggleEnableHoverPreview}
            title={enableHoverPreview ? 'Hover Previews Enabled (Click to toggle)' : 'Hover Previews Disabled'}
            className={`flex items-center gap-1 px-2 h-7 text-xs font-mono transition-all ${
              enableHoverPreview
                ? 'bg-accent-magenta/30 text-accent-magenta font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {enableHoverPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden xl:inline">{enableHoverPreview ? 'Preview ON' : 'OFF'}</span>
          </button>

          {/* Toggle C: Speed */}
          <button
            onClick={cyclePreviewSpeed}
            title="Cycle Preview Speed (0.1x - 5x)"
            className="flex items-center gap-0.5 px-1.5 h-7 text-[11px] font-mono text-accent-cyan hover:text-white transition-colors"
          >
            <FastForward className="w-3 h-3" />
            <span>{previewSpeed}x</span>
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* Toggle D: Whole-App Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isNeon ? 'Switch Whole App to Black & White Mode' : 'Switch Whole App to Colored Neon Mode'}
            className={`flex items-center gap-1 px-2 h-7 text-xs font-mono transition-all ${
              isNeon
                ? 'bg-accent-neon/20 text-accent-neon font-medium border border-accent-neon/40 shadow-sm'
                : 'bg-white/10 text-white font-medium border border-white/20'
            }`}
          >
            {isNeon ? (
              <>
                <Moon className="w-3.5 h-3.5 text-accent-neon" />
                <span className="text-[10px] font-mono">Colored</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[10px] font-mono">B&W</span>
              </>
            )}
          </button>
        </div>

        {/* Group 2: Reindex All Files (with ETA) & Library Data Modal */}
        <div className="flex items-center bg-surface-elevated/80 p-0.5 border border-white/[0.12] shadow-sm">
          {/* Button 1: Force Reindex All Files with Live ETA */}
          <button
            onClick={() => reindexAllFiles()}
            disabled={isBusy}
            title={`Force Re-index All Files ${indexingEtaFormatted ? `(${indexingEtaFormatted})` : ''}`}
            className={`flex items-center gap-1.5 px-2.5 h-7 text-xs font-mono transition-all ${
              isBusy
                ? 'bg-accent-cyan/20 text-accent-cyan font-semibold border border-accent-cyan/40 animate-pulse'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin text-accent-cyan' : ''}`} />
            <span className="text-[10px] font-mono font-medium">
              {isBusy
                ? indexingEtaFormatted || 'Indexing...'
                : 'Reindex'}
            </span>
          </button>

          {/* Button 2: Library Data (Audit & Diagnostics) */}
          <button
            onClick={() => setIsStatsOpen(true)}
            title="Library Data"
            className="flex items-center gap-1.5 px-2.5 h-7 text-xs font-mono text-slate-300 hover:text-accent-neon hover:bg-white/[0.06] transition-all"
          >
            <BarChart3 className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="text-[10px] font-mono font-medium">Library Data</span>
          </button>
        </div>

        {/* Group 3: Search Bar + Sort Selector */}
        <div className="flex items-center gap-1.5">
          {/* Search Bar */}
          <div className="relative flex items-center bg-surface-elevated/80 border border-white/[0.12] shadow-sm h-7 w-36 sm:w-44 md:w-52 px-2">
            <Search className="w-3.5 h-3.5 text-slate-400 pointer-events-none flex-shrink-0 mr-1.5" />
            <input
              type="text"
              value={filterState.search}
              onChange={(e) => setFilterState(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search titles, tags..."
              className="w-full h-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none font-mono font-light"
            />
            {filterState.search ? (
              <button
                onClick={() => setFilterState(prev => ({ ...prev, search: '' }))}
                className="p-0.5 text-slate-400 hover:text-white transition-colors"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[9px] font-mono text-slate-500 border border-white/10 px-1 bg-white/[0.04] pointer-events-none">
                /
              </span>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center bg-surface-elevated/80 p-0.5 border border-white/[0.12] shadow-sm h-7 font-mono">
            <div className="flex items-center gap-1 px-1.5 text-xs text-slate-300">
              <ArrowUpDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <select
                value={sortField}
                onChange={(e) => handleSortChange(e.target.value as SortField)}
                className="bg-transparent text-[10px] font-mono text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="dateAdded" className="bg-surface text-white">Date</option>
                <option value="name" className="bg-surface text-white">Title</option>
                <option value="size" className="bg-surface text-white">Size</option>
                <option value="duration" className="bg-surface text-white">Duration</option>
                <option value="resolution" className="bg-surface text-white">Resolution</option>
              </select>
            </div>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="text-[9px] text-accent-cyan px-1.5 h-6 bg-white/5 hover:bg-white/15 uppercase font-medium transition-colors flex items-center justify-center border border-white/10"
              title="Toggle Sort Direction (ASC / DESC)"
            >
              {sortDirection}
            </button>
          </div>
        </div>

        {/* Group 4: View Mode Switcher (Grid / Poster / List) */}
        <div className="flex items-center bg-surface-elevated/80 p-0.5 border border-white/[0.12] shadow-sm h-7">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid View"
            className={`p-1 h-6 w-6 flex items-center justify-center transition-all ${
              viewMode === 'grid'
                ? 'bg-accent text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
          </button>
          <button
            onClick={() => setViewMode('poster')}
            title="Poster View"
            className={`p-1 h-6 w-6 flex items-center justify-center transition-all ${
              viewMode === 'poster'
                ? 'bg-accent text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3 h-3" />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            title="Compact List View"
            className={`p-1 h-6 w-6 flex items-center justify-center transition-all ${
              viewMode === 'compact'
                ? 'bg-accent text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-3 h-3" />
          </button>
        </div>

        {/* Group 5: Frameless Window Controls (Embedded inside outer blue border) */}
        <div className="flex items-center ml-1 bg-surface-elevated/80 border border-white/[0.12] shadow-sm flex-shrink-0 overflow-hidden">
          {/* Minimize Button */}
          <button
            onClick={handleMinimize}
            title="Minimize"
            className="flex items-center justify-center w-8 h-7 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore Button */}
          <button
            onClick={handleMaximize}
            title={isMaximized ? "Restore Window" : "Maximize Window"}
            className="flex items-center justify-center w-8 h-7 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isMaximized ? (
              <Square className="w-2.5 h-2.5 text-slate-300 stroke-[2.5]" />
            ) : (
              <Square className="w-3 h-3 text-slate-300" />
            )}
          </button>

          {/* Close Button */}
          <button
            onClick={handleClose}
            title="Close"
            className="flex items-center justify-center w-8 h-7 text-slate-400 hover:text-white hover:bg-red-600/90 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
