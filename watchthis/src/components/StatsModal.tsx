import React from 'react';
import { 
  BarChart3, 
  X, 
  HardDrive, 
  Film, 
  Clock, 
  Sparkles, 
  FileText,
  Video,
  Activity
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { formatFileSize } from '../utils/formatters';

export const StatsModal: React.FC = () => {
  const {
    videos,
    folders,
    totalStorageBytes,
    totalDurationSeconds,
    isStatsOpen,
    setIsStatsOpen,
    diskStorage
  } = useLibrary();

  if (!isStatsOpen) return null;

  const videoFiles = videos.filter(v => !v.isPdf && v.extension?.toLowerCase() !== '.pdf');
  const pdfFiles = videos.filter(v => v.isPdf || v.extension?.toLowerCase() === '.pdf');

  const count4k = videoFiles.filter(v => v.resolution.includes('4K') || v.resolution.includes('2160')).length;
  const count1080p = videoFiles.filter(v => v.resolution.includes('1080') || (!v.resolution.includes('4K') && !v.resolution.includes('720') && !v.resolution.includes('SD') && !v.resolution.includes('480'))).length;
  const count720p = videoFiles.filter(v => v.resolution.includes('720')).length;
  const countSD = Math.max(0, videoFiles.length - count4k - count1080p - count720p);

  const countHEVC = videoFiles.filter(v => (v.codec || '').includes('HEVC') || (v.codec || '').includes('265') || v.smartTags.includes('HEVC')).length;
  const countH264 = videoFiles.filter(v => (v.codec || '').includes('264') || (v.codec || '').includes('AVC') || v.smartTags.includes('H.264')).length;
  const countAV1 = videoFiles.filter(v => (v.codec || '').includes('AV1') || v.smartTags.includes('AV1')).length;
  const countHDR = videoFiles.filter(v => v.hdr || v.smartTags.includes('HDR')).length;

  const totalHours = (totalDurationSeconds / 3600).toFixed(1);
  const totalDriveBytes = diskStorage?.totalBytes || (1024 * 1024 * 1024 * 1024 * 2);
  const videoTotal = videoFiles.length || 1;

  return (
    <div 
      onClick={() => setIsStatsOpen(false)}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 select-none font-mono"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl border border-white/20 p-6 space-y-5 bg-surface shadow-2xl text-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent-cyan/20 border border-accent-cyan/50 flex items-center justify-center text-accent-cyan">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wider uppercase font-mono">
                Library Data
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Live index statistics across {folders.length} active watch folder{folders.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsStatsOpen(false)}
            className="p-1.5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Metric Tiles */}
        <div className="grid grid-cols-4 gap-2.5">
          <div className="p-3 bg-surface-elevated border border-white/[0.1] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Total Media</span>
              <Film className="w-4 h-4 text-accent" />
            </div>
            <span className="text-xl font-mono text-white font-bold mt-1">{videos.length}</span>
          </div>

          <div className="p-3 bg-surface-elevated border border-white/[0.1] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Video Files</span>
              <Video className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-xl font-mono text-sky-400 font-bold mt-1">{videoFiles.length}</span>
          </div>

          <div className="p-3 bg-surface-elevated border border-white/[0.1] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">PDF Docs</span>
              <FileText className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-xl font-mono text-red-400 font-bold mt-1">{pdfFiles.length}</span>
          </div>

          <div className="p-3 bg-surface-elevated border border-white/[0.1] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Playtime</span>
              <Clock className="w-4 h-4 text-accent-neon" />
            </div>
            <span className="text-xl font-mono text-accent-neon font-bold mt-1">{totalHours}h</span>
          </div>
        </div>

        {/* Storage Bar Card */}
        <div className="p-3 bg-surface-elevated border border-white/[0.1] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-accent-cyan" /> Library Disk Footprint
            </span>
            <span className="text-accent-cyan font-bold">
              {formatFileSize(totalStorageBytes)} <span className="text-slate-500 font-light">/</span> {formatFileSize(totalDriveBytes)}
            </span>
          </div>
          <div className="h-2 w-full bg-black/60 border border-white/10 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-accent via-accent-cyan to-accent-neon"
              style={{ width: `${Math.min(100, Math.max(1, (totalStorageBytes / totalDriveBytes) * 100))}%` }}
            />
          </div>
        </div>

        {/* Video Resolution Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Video Resolution Distribution
            </span>
            <span className="text-slate-400">{videoFiles.length} Video Files</span>
          </div>

          <div className="h-3 w-full bg-black/60 border border-white/10 flex overflow-hidden p-0.5 gap-0.5">
            {count4k > 0 && (
              <div 
                style={{ width: `${(count4k / videoTotal) * 100}%` }}
                className="bg-amber-400" 
                title={`4K UHD: ${count4k}`}
              />
            )}
            {count1080p > 0 && (
              <div 
                style={{ width: `${(count1080p / videoTotal) * 100}%` }}
                className="bg-accent-cyan" 
                title={`1080p FHD: ${count1080p}`}
              />
            )}
            {count720p > 0 && (
              <div 
                style={{ width: `${(count720p / videoTotal) * 100}%` }}
                className="bg-accent" 
                title={`720p HD: ${count720p}`}
              />
            )}
            {countSD > 0 && (
              <div 
                style={{ width: `${(countSD / videoTotal) * 100}%` }}
                className="bg-slate-600" 
                title={`SD: ${countSD}`}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-400" /> 4K UHD ({count4k})</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-accent-cyan" /> 1080p FHD ({count1080p})</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-accent" /> 720p HD ({count720p})</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-slate-600" /> SD ({countSD})</div>
          </div>
        </div>

        {/* Codec & HDR Capabilities */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <div className="p-2.5 bg-surface-elevated border border-white/10 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">HEVC / x265</span>
            <span className="text-base font-mono text-accent-cyan font-bold">{countHEVC}</span>
          </div>
          <div className="p-2.5 bg-surface-elevated border border-white/10 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">H.264 / AVC</span>
            <span className="text-base font-mono text-accent font-bold">{countH264}</span>
          </div>
          <div className="p-2.5 bg-surface-elevated border border-white/10 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">Next-Gen AV1</span>
            <span className="text-base font-mono text-emerald-400 font-bold">{countAV1}</span>
          </div>
          <div className="p-2.5 bg-surface-elevated border border-white/10 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">HDR Masters</span>
            <span className="text-base font-mono text-accent-magenta font-bold">{countHDR}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1 text-accent-neon font-medium">
            <Activity className="w-3.5 h-3.5" /> High Performance Dump Zip Engine
          </span>
          <button
            onClick={() => setIsStatsOpen(false)}
            className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white font-mono font-bold transition-all shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

