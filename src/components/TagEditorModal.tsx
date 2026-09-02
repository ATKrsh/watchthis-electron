import React, { useState } from 'react';
import { Tag, Plus, X, Check } from 'lucide-react';
import { VideoItem } from '../types/video';

interface TagEditorModalProps {
  video: VideoItem;
  theme?: 'neon' | 'minimal';
  onClose: () => void;
  onSaveTags: (videoId: string, customTags: string[]) => void;
}

export const TagEditorModal: React.FC<TagEditorModalProps> = ({
  video,
  theme = 'neon',
  onClose,
  onSaveTags,
}) => {
  const [customTags, setCustomTags] = useState<string[]>(video.customTags || []);
  const [inputVal, setInputVal] = useState('');

  const handleAddTag = () => {
    const clean = inputVal.trim().replace(/^#/, '');
    if (!clean) return;
    if (!customTags.includes(clean) && !video.smartTags.includes(clean)) {
      setCustomTags([...customTags, clean]);
    }
    setInputVal('');
  };

  const handleRemoveCustomTag = (t: string) => {
    setCustomTags(customTags.filter(item => item !== t));
  };

  const handleSave = () => {
    onSaveTags(video.id, customTags);
    onClose();
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
            <div className="w-8 h-8 rounded-xl bg-accent-magenta/20 border border-accent-magenta/40 flex items-center justify-center text-accent-magenta">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-light text-white">Edit Video Tags</h3>
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

        {/* Smart Tags (Extracted) */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
            Auto-Extracted Smart Tags ({video.smartTags.length})
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {video.smartTags.length === 0 ? (
              <span className="text-xs font-mono text-slate-500">No auto tags extracted</span>
            ) : (
              video.smartTags.map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/5 border border-white/10 text-slate-300 font-light"
                >
                  #{tag}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Custom Tags */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
            Custom Tags ({customTags.length})
          </label>

          <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2.5 rounded-2xl bg-black/40 border border-white/[0.07] mb-3">
            {customTags.length === 0 ? (
              <span className="text-xs font-mono text-slate-500 self-center">No custom tags added yet</span>
            ) : (
              customTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-accent-magenta/20 border border-accent-magenta/40 text-accent-magenta font-light"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveCustomTag(tag)}
                    className="hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Add Tag Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Type tag name and press Enter..."
              className="flex-1 px-3.5 h-9 rounded-xl bg-surface/70 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent font-light"
            />
            <button
              onClick={handleAddTag}
              className="px-3 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-light flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-light text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-light shadow-lg transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Tags</span>
          </button>
        </div>
      </div>
    </div>
  );
};
