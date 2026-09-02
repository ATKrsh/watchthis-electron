import React, { useEffect, useRef } from 'react';
import { 
  PlusSquare, 
  Trash, 
  Trash2, 
  FolderSearch, 
  FolderInput, 
  Tag, 
  ExternalLink,
  AppWindow,
  X
} from 'lucide-react';
import { VideoItem } from '../types/video';

interface ContextMenuProps {
  x: number;
  y: number;
  video: VideoItem;
  theme?: 'neon' | 'minimal';
  onClose: () => void;
  onOpenInNewTab?: (video: VideoItem) => void;
  onAddToPlaylist: (video: VideoItem) => void;
  onDeleteFromLibrary: (video: VideoItem) => void;
  onDeleteFromDisk: (video: VideoItem) => void;
  onOpenFileLocation: (video: VideoItem) => void;
  onMoveFile: (video: VideoItem) => void;
  onEditTags: (video: VideoItem) => void;
  onLaunchPopupMode: (video: VideoItem) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  video,
  theme = 'neon',
  onClose,
  onOpenInNewTab,
  onAddToPlaylist,
  onDeleteFromLibrary,
  onDeleteFromDisk,
  onOpenFileLocation,
  onMoveFile,
  onEditTags,
  onLaunchPopupMode,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Viewport boundary adjustment
  const menuWidth = 240;
  const menuHeight = 350;
  const safeX = Math.min(x, window.innerWidth - menuWidth - 12);
  const safeY = Math.min(y, window.innerHeight - menuHeight - 12);

  const isNeon = theme === 'neon';

  return (
    <div
      ref={menuRef}
      style={{ left: `${safeX}px`, top: `${safeY}px` }}
      className={`fixed z-[120] w-60 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-2xl text-xs font-sans select-none animate-in fade-in zoom-in-95 duration-100 ${
        isNeon
          ? 'bg-surface-elevated/95 border-white/15 text-slate-200'
          : 'bg-[#141720]/95 border-white/10 text-slate-300'
      }`}
    >
      {/* Header Info */}
      <div className="px-3 py-2 border-b border-white/[0.07] flex items-center justify-between mb-1">
        <span className="font-mono text-[11px] text-slate-400 truncate max-w-[180px] font-light">
          {video.name}
        </span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white p-0.5 rounded transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-0.5">
        {/* 0. Open in New Tab */}
        <button
          onClick={() => {
            onClose();
            onOpenInNewTab?.(video);
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left font-light transition-all ${
            isNeon 
              ? 'hover:bg-accent/25 text-accent-neon hover:text-white bg-accent/10' 
              : 'hover:bg-white/15 text-cyan-300 hover:text-white bg-white/5'
          }`}
        >
          <AppWindow className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Open in New Tab</span>
        </button>

        {/* 1. Popup Mode */}
        <button
          onClick={() => {
            onClose();
            onLaunchPopupMode(video);
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
            isNeon 
              ? 'hover:bg-accent/20 hover:text-accent-neon text-slate-200' 
              : 'hover:bg-white/10 hover:text-white text-slate-300'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5 text-accent-neon" />
          <span className="font-light">Popup Mode (Break Free)</span>
        </button>

        {/* 2. Add to Playlist */}
        <button
          onClick={() => {
            onClose();
            onAddToPlaylist(video);
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-white/[0.07] hover:text-white transition-all text-slate-300"
        >
          <PlusSquare className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="font-light">Add to New List / Playlist</span>
        </button>

        {/* 3. Edit Tags */}
        <button
          onClick={() => {
            onClose();
            onEditTags(video);
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-white/[0.07] hover:text-white transition-all text-slate-300"
        >
          <Tag className="w-3.5 h-3.5 text-accent-magenta" />
          <span className="font-light">Edit or Update Tags</span>
        </button>

        {/* 4. Open File Location */}
        <button
          onClick={() => {
            onClose();
            onOpenFileLocation(video);
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-white/[0.07] hover:text-white transition-all text-slate-300"
        >
          <FolderSearch className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-light">Open File Location</span>
        </button>

        {/* 5. Move File to Location */}
        <button
          onClick={() => {
            onClose();
            onMoveFile(video);
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-white/[0.07] hover:text-white transition-all text-slate-300"
        >
          <FolderInput className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-light">Move File to Location...</span>
        </button>

        {/* Divider */}
        <div className="h-[1px] bg-white/[0.07] my-1" />

        {/* 6. Delete from List */}
        <button
          onClick={() => {
            onClose();
            onDeleteFromLibrary(video);
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-white/[0.07] hover:text-white transition-all text-slate-400"
        >
          <Trash className="w-3.5 h-3.5" />
          <span className="font-light">Delete from List</span>
        </button>

        {/* 7. Delete from Disk */}
        <button
          onClick={() => {
            onClose();
            onDeleteFromDisk(video);
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span className="font-light">Delete from Disk</span>
        </button>
      </div>
    </div>
  );
};
