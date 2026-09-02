import React from 'react';
import { Folder, ChevronRight, Film, FolderGit2 } from 'lucide-react';
import { FolderNode, ThemeMode } from '../types/video';
import { formatFileSize } from '../utils/formatters';
import { parseVideoMetadata } from '../utils/tagParser';

interface FolderCardProps {
  folder: FolderNode;
  theme: ThemeMode;
  onOpen: (folderPath: string) => void;
  onReveal?: (folderPath: string) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, theme, onOpen, onReveal }) => {
  const isNeon = theme === 'neon';
  const cleanMeta = parseVideoMetadata(folder.name);
  const displayTitle = cleanMeta.cleanTitle || folder.name;

  return (
    <div
      onClick={() => onOpen(folder.path)}
      onContextMenu={(e) => {
        if (onReveal) {
          e.preventDefault();
          onReveal(folder.path);
        }
      }}
      className={`group relative overflow-hidden dof-card cursor-pointer border p-4 flex flex-col justify-between select-none transition-all duration-150 shadow-md min-h-[160px] ${
        isNeon
          ? 'bg-surface/90 hover:bg-surface-elevated border-white/[0.12] hover:border-accent-cyan/70 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)]'
          : 'bg-[#101420]/90 hover:bg-[#151a2a] border-white/[0.08] hover:border-white/30'
      }`}
    >
      {/* Top Bar with Folder Icon and Explore Action */}
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 flex items-center justify-center border transition-all ${
          isNeon
            ? 'bg-accent/15 border-accent-cyan/40 text-accent-cyan group-hover:shadow-[0_0_10px_rgba(0,240,255,0.3)]'
            : 'bg-white/10 border-white/15 text-slate-100'
        }`}>
          <Folder className="w-5 h-5 fill-current opacity-90" />
        </div>

        <div className="flex items-center gap-1 text-slate-400 group-hover:text-accent-cyan transition-colors">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Explore</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>

      {/* Center Clean Folder Title */}
      <div className="my-2.5 min-w-0">
        <h4 className="font-mono font-bold text-sm text-white truncate max-w-full group-hover:text-accent-cyan transition-colors" title={displayTitle}>
          {displayTitle}
        </h4>
        <span className="text-[10px] font-mono text-slate-400 font-normal truncate block mt-0.5" title={folder.path}>
          {folder.parentPath ? `${folder.parentPath.split(/[/\\]/).filter(Boolean).pop()} /` : folder.name}
        </span>
      </div>

      {/* Bottom Clean Stats Box Badges */}
      <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.08] text-xs font-mono">
        <div className="flex items-center gap-2">
          {folder.videoCount > 0 && (
            <span className="flex items-center gap-1 text-slate-200 font-semibold px-2 py-0.5 bg-white/[0.06] border border-white/10">
              <Film className="w-3.5 h-3.5 text-accent-neon" />
              <span>{folder.videoCount} media</span>
            </span>
          )}
          {folder.subfolderCount > 0 && (
            <span className="flex items-center gap-1 text-slate-300 font-semibold px-2 py-0.5 bg-white/[0.06] border border-white/10">
              <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{folder.subfolderCount} subfolders</span>
            </span>
          )}
        </div>

        <span className="text-slate-200 font-bold bg-white/10 px-2.5 py-0.5 border border-white/15 shadow-sm">
          {formatFileSize(folder.totalSize)}
        </span>
      </div>
    </div>
  );
};
