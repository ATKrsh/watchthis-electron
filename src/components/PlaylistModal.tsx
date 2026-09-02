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
    <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans">
      <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 ${
        isNeon ? 'bg-surface-elevated border-accent/40 text-slate-100' : 'bg-[#141720] border-white/10 text-slate-200'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center text-accent-cyan">
              <PlusSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-light text-white">Manage Playlists / Lists</h3>
              <p className="text-[11px] font-mono text-slate-400 truncate max-w-[280px]">
                {video.cleanTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Playlists Selection */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
            Add to Existing List ({playlists.length})
          </label>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {playlists.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-black/30 border border-dashed border-white/10 text-xs font-mono text-slate-500 font-light">
                No custom playlists created yet
              </div>
            ) : (
              playlists.map((pl) => {
                const isInList = pl.videoIds.includes(video.id);
                return (
                  <div
                    key={pl.id}
                    onClick={() => onToggleVideoInPlaylist(pl.id, video.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      isInList
                        ? 'bg-accent/15 border-accent/40 text-white font-light'
                        : 'bg-surface/50 border-white/[0.06] text-slate-300 hover:bg-surface hover:border-white/15 font-light'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Film className={`w-4 h-4 ${isInList ? 'text-accent-neon' : 'text-slate-500'}`} />
                      <div>
                        <p className="text-xs truncate">{pl.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {pl.videoIds.length} videos
                        </p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                      isInList
                        ? 'bg-accent border-accent text-white'
                        : 'border-white/20 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Create New List */}
        <div className="pt-2 border-t border-white/[0.08]">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
            Create New Playlist
          </label>
          <div className="flex gap-2">
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
              placeholder="Enter new playlist name..."
              className="flex-1 px-3.5 h-9 rounded-xl bg-surface/70 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent font-light"
            />
            <button
              onClick={handleCreate}
              className="px-3.5 h-9 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-light flex items-center gap-1.5 shadow-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>
        </div>

        {/* Done Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-light transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
