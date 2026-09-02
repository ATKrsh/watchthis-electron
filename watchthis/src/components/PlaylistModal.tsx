import React, { useState } from 'react';
import { PlusSquare, Plus, Check, X, Film } from 'lucide-react';
import { VideoItem, Playlist } from '../types/video';

interface PlaylistModalProps {
  video: VideoItem;
  playlists: Playlist[];
  theme?: 'neon' | 'minimal';
  onClose: () => void;
  onCreatePlaylist: (name: string, firstVideoId?: string) => void;
  onToggleVideoInPlaylist: (playlistId: string, videoId: string) => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  video,
  playlists,
  theme = 'neon',
  onClose,
  onCreatePlaylist,
  onToggleVideoInPlaylist,
}) => {
  const [newListName, setNewListName] = useState('');

  const handleCreate = () => {
    const clean = newListName.trim();
    if (!clean) return;
    onCreatePlaylist(clean, video.id);
    setNewListName('');
  };

  const isNeon = theme === 'neon';

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-mono">
      <div className={`w-full max-w-md p-5 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
        isNeon ? 'bg-surface-elevated border-accent/50 text-slate-100 shadow-[0_0_25px_rgba(0,0,0,0.8)]' : 'bg-[#141720] border-white/15 text-slate-200'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent-cyan/20 border border-accent-cyan/50 flex items-center justify-center text-accent-cyan">
              <PlusSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Manage Playlists / Lists</h3>
              <p className="text-[11px] font-mono text-slate-400 truncate max-w-[280px]">
                {video.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Playlists Selection */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
            Add to Existing List ({playlists.length})
          </label>

          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {playlists.length === 0 ? (
              <div className="p-3 text-center bg-black/40 border border-dashed border-white/15 text-xs font-mono text-slate-500">
                No custom playlists created yet
              </div>
            ) : (
              playlists.map((pl) => {
                const isInList = pl.videoIds.includes(video.id);
                return (
                  <div
                    key={pl.id}
                    onClick={() => onToggleVideoInPlaylist(pl.id, video.id)}
                    className={`flex items-center justify-between p-2 border cursor-pointer transition-all ${
                      isInList
                        ? 'bg-accent/25 border-accent-cyan/50 text-white'
                        : 'bg-surface/60 border-white/[0.08] text-slate-300 hover:bg-surface-elevated hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Film className={`w-3.5 h-3.5 ${isInList ? 'text-accent-cyan' : 'text-slate-400'}`} />
                      <span className="text-xs font-mono truncate">{pl.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({pl.videoIds.length} items)
                      </span>
                    </div>

                    <div className={`w-4 h-4 border flex items-center justify-center transition-all ${
                      isInList
                        ? 'bg-accent-cyan border-accent-cyan text-slate-950 shadow-sm'
                        : 'border-white/30 bg-transparent'
                    }`}>
                      {isInList && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Create New Playlist */}
        <div className="border-t border-white/[0.1] pt-3">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
            Create New Playlist
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="Playlist name..."
              className="flex-1 px-3 h-8 bg-surface/80 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan font-mono"
            />
            <button
              onClick={handleCreate}
              disabled={!newListName.trim()}
              className="px-3 h-8 bg-accent hover:bg-accent-hover text-white text-xs font-mono font-bold flex items-center gap-1 transition-all disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-white/[0.1]">
          <button
            onClick={onClose}
            className="px-4 h-8 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-mono font-bold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
