import React from 'react';
import { 
  BarChart3, 
  X, 
  HardDrive, 
  Film, 
  Clock, 
  Sparkles, 
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
  } = useLibrary();

  if (!isStatsOpen) return null;

  const count4k = videos.filter(v => v.resolution.includes('4K')).length;
  const count1080p = videos.filter(v => v.resolution.includes('1080p')).length;
  const count720p = videos.filter(v => v.resolution.includes('720p')).length;
  const countSD = videos.length - count4k - count1080p - count720p;

  const countHEVC = videos.filter(v => (v.codec || '').includes('HEVC') || v.smartTags.includes('HEVC')).length;
  const countH264 = videos.filter(v => (v.codec || '').includes('264') || v.smartTags.includes('H.264')).length;
  const countAV1 = videos.filter(v => (v.codec || '').includes('AV1') || v.smartTags.includes('AV1')).length;
  const countHDR = videos.filter(v => v.hdr || v.smartTags.includes('HDR')).length;

  const totalHours = (totalDurationSeconds / 3600).toFixed(1);

  return (
    <div 
      onClick={() => setIsStatsOpen(false)}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 select-none font-sans"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl glass-panel-elevated border border-white/15 p-6 space-y-6 shadow-dof-float text-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center text-accent-cyan">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg text-white tracking-wide font-display font-light">
                Library Telemetry & Diagnostics
              </h2>
              <p className="text-xs font-mono text-slate-400 font-light">
                Index overview across {folders.length} active watch folders
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsStatsOpen(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Metric Tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-surface-elevated/80 border border-white/[0.08] flex items-center gap-3">
            <Film className="w-8 h-8 text-accent flex-shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-light">Total Videos</span>
              <span className="text-xl font-mono text-white font-light">{videos.length}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated/80 border border-white/[0.08] flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-accent-cyan flex-shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-light">Total Storage</span>
              <span className="text-xl font-mono text-accent-cyan font-light">{formatFileSize(totalStorageBytes)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated/80 border border-white/[0.08] flex items-center gap-3">
            <Clock className="w-8 h-8 text-accent-neon flex-shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-light">Total Playtime</span>
              <span className="text-xl font-mono text-accent-neon font-light">{totalHours} hrs</span>
            </div>
          </div>
        </div>

        {/* Resolution Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-light">
            <span className="text-slate-300 flex items-center gap-1.5 font-light">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Resolution Distribution
            </span>
            <span className="text-slate-400 font-light">{videos.length} Media Files</span>
          </div>

          <div className="h-3 w-full bg-white/5 rounded-full flex overflow-hidden p-0.5 gap-0.5">
            {count4k > 0 && (
              <div 
                style={{ width: `${(count4k / (videos.length || 1)) * 100}%` }}
                className="bg-amber-400 rounded-sm" 
                title={`4K UHD: ${count4k}`}
              />
            )}
            {count1080p > 0 && (
              <div 
                style={{ width: `${(count1080p / (videos.length || 1)) * 100}%` }}
                className="bg-accent-cyan rounded-sm" 
                title={`1080p FHD: ${count1080p}`}
              />
            )}
            {count720p > 0 && (
              <div 
                style={{ width: `${(count720p / (videos.length || 1)) * 100}%` }}
                className="bg-accent rounded-sm" 
                title={`720p HD: ${count720p}`}
              />
            )}
            {countSD > 0 && (
              <div 
                style={{ width: `${(countSD / (videos.length || 1)) * 100}%` }}
                className="bg-slate-600 rounded-sm" 
                title={`SD: ${countSD}`}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 font-light">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> 4K UHD ({count4k})</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent-cyan" /> 1080p FHD ({count1080p})</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" /> 720p HD ({count720p})</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600" /> SD ({countSD})</div>
          </div>
        </div>

        {/* Codec & HDR Capabilities */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          <div className="p-3 rounded-xl bg-surface-elevated/50 border border-white/5 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-light">HEVC / x265</span>
            <span className="text-base font-mono text-accent-cyan font-light">{countHEVC}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-elevated/50 border border-white/5 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-light">H.264 / AVC</span>
            <span className="text-base font-mono text-accent font-light">{countH264}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-elevated/50 border border-white/5 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-light">Next-Gen AV1</span>
            <span className="text-base font-mono text-emerald-400 font-light">{countAV1}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-elevated/50 border border-white/5 text-center">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-light">HDR Masters</span>
            <span className="text-base font-mono text-accent-magenta font-light">{countHDR}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-mono text-slate-400 font-light">
          <span className="flex items-center gap-1 text-accent-neon">
            <Activity className="w-3.5 h-3.5" /> High Performance Local Streaming Active
          </span>
          <button
            onClick={() => setIsStatsOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-light transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
