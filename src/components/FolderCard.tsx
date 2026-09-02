import React from 'react';
import { Folder, ChevronRight, Film } from 'lucide-react';
import { FolderNode, ThemeMode } from '../types/video';
import { formatFileSize } from '../utils/formatters';

interface FolderCardProps {
  folder: FolderNode;
  theme: ThemeMode;
  onOpen: (folderPath: string) => void;
  onReveal?: (folderPath: string) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, theme, onOpen, onReveal }) => {
  const isNeon = theme === 'neon';

  return (
    <div
      onClick={() => onOpen(folder.path)}
      onContextMenu={(e) => {
        if (onReveal) {
          e.preventDefault();
          onReveal(folder.path);
        }
      }}
      className={`group relative rounded-2xl overflow-hidden glass-panel dof-card cursor-pointer border p-4.5 flex flex-col justify-between select-none transition-all duration-200 hover:-translate-y-1 shadow-lg min-h-[170px] ${
        isNeon
          ? 'bg-surface/85 hover:bg-surface-elevated border-white/[0.08] hover:border-accent-cyan/60 hover:shadow-glow-cyan'
          : 'bg-[#101420]/80 hover:bg-[#151a2a] border-white/[0.06] hover:border-white/25'
      }`}
    >
      {/* Top Bar with Glowing Folder Icon and Chevron */}
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
          isNeon
            ? 'bg-gradient-to-br from-accent/20 to-accent-cyan/20 border-accent-cyan/40 text-accent-cyan group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]'
            : 'bg-white/10 border-white/15 text-slate-100 group-hover:scale-105'
        }`}>
          <Folder className="w-6 h-6 fill-current opacity-90" />
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-accent-cyan transition-colors">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider">Explore</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>

      {/* Center Folder Name */}
      <div className="my-2 min-w-0">
        <h4 className="font-sans font-semibold text-sm text-white truncate max-w-full group-hover:text-accent-cyan transition-colors" title={folder.name}>
          {folder.name}
        </h4>
        <span className="text-[11px] font-mono text-slate-400 font-normal truncate block mt-0.5" title={folder.path}>
          {folder.path}
        </span>
      </div>

      {/* Bottom Stats Pills */}
      <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] text-xs font-mono">
        <div className="flex items-center gap-2">
          {folder.videoCount > 0 && (
            <span className="flex items-center gap-1 text-slate-200 font-medium">
              <Film className="w-3.5 h-3.5 text-accent-neon" />
              <span>{folder.videoCount} media</span>
            </span>
          )}
          {folder.subfolderCount > 0 && (
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>{folder.subfolderCount} subfolders</span>
            </span>
          )}
        </div>

        <span className="text-slate-300 font-medium bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10 shadow-sm">
          {formatFileSize(folder.totalSize)}
        </span>
      </div>
    </div>
  );
};
