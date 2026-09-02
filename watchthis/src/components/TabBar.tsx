import React, { useEffect, useRef } from 'react';
import { 
  Layers, 
  Film, 
  FileText, 
  Globe,
  X, 
  Plus, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { TabItem } from '../types/video';

export const TabBar: React.FC = () => {
  const { 
    tabs, 
    activeTabId, 
    setActiveTabId, 
    closeTab, 
    openLibraryTab,
    openOnlineTab,
    theme 
  } = useLibrary();

  const isNeon = theme === 'neon';
  const tabListRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcuts for Tab Management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+W: Close active tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        e.stopPropagation();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
      // Ctrl+T: New Explorer Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        e.stopPropagation();
        openLibraryTab();
      }
      // Ctrl+Tab / Ctrl+PageDown: Next tab
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Tab' || e.key === 'PageDown') && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        if (currentIndex !== -1 && tabs.length > 1) {
          const nextIndex = (currentIndex + 1) % tabs.length;
          setActiveTabId(tabs[nextIndex].id);
        }
      }
      // Ctrl+Shift+Tab / Ctrl+PageUp: Previous tab
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'Tab' && e.shiftKey) || e.key === 'PageUp')) {
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        if (currentIndex !== -1 && tabs.length > 1) {
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          setActiveTabId(tabs[prevIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs, closeTab, setActiveTabId, openLibraryTab]);

  // Scroll active tab into view smoothly
  useEffect(() => {
    if (!tabListRef.current) return;
    const activeEl = tabListRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  const getTabIcon = (tab: TabItem) => {
    if (tab.type === 'pdf') {
      return <FileText className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
    }
    if (tab.type === 'video') {
      return <Film className="w-3.5 h-3.5 text-accent-neon flex-shrink-0" />;
    }
    if (tab.type === 'online') {
      return <Globe className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />;
    }
    return <Layers className="w-3.5 h-3.5 text-accent-magenta flex-shrink-0" />;
  };


  const scrollTabs = (offset: number) => {
    if (tabListRef.current) {
      tabListRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <nav aria-label="Media tabs" className={`h-10 px-4 flex items-center border-b select-none font-mono transition-all z-30 ${
      isNeon 
        ? 'bg-[#060912]/95 border-white/[0.12]' 
        : 'bg-[#0a0d17]/95 border-white/[0.08]'
    }`}>
      {/* Tab Strip Container */}
      <div 
        ref={tabListRef}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-1 pr-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const canClose = tabs.length > 1 || tab.type !== 'library';

          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1 && canClose) {
                  e.preventDefault();
                  e.stopPropagation();
                  closeTab(tab.id);
                }
              }}
              title={tab.title}
              className={`group relative flex items-center gap-2 h-7 px-3 border text-xs cursor-pointer transition-all max-w-[240px] min-w-[130px] flex-shrink-0 ${
                isActive
                  ? isNeon
                    ? 'bg-surface-elevated text-white border-accent-cyan/60 shadow-[0_0_12px_rgba(0,240,255,0.25)] font-bold'
                    : 'bg-[#151a28] text-white border-white/30 font-bold shadow-sm'
                  : 'bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 border-white/[0.08] hover:border-white/20 font-normal'
              }`}
            >
              {/* Active neon bottom indicator line */}
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                  isNeon ? 'bg-gradient-to-r from-accent-cyan to-accent-neon shadow-[0_0_8px_#00f0ff]' : 'bg-white'
                }`} />
              )}

              {/* Icon */}
              {getTabIcon(tab)}

              {/* Tab Title */}
              <span className="truncate flex-1 text-xs font-sans">
                {tab.title}
              </span>

              {/* Close Button */}
              {canClose && (
                <button
                  type="button"
                  aria-label={`Close tab ${tab.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={`p-0.5 transition-all opacity-60 hover:opacity-100 ${
                    isActive 
                      ? 'hover:bg-white/15 text-slate-300 hover:text-white' 
                      : 'hover:bg-white/10 text-slate-500 hover:text-slate-200'
                  }`}
                  title="Close tab (Ctrl+W or Middle Click)"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* New Media Explorer Tab Button */}
        <button
          type="button"
          aria-label="New Explorer Tab"
          onClick={() => openLibraryTab()}
          className="flex items-center justify-center w-7 h-7 bg-white/[0.04] hover:bg-accent/25 hover:text-accent-cyan text-slate-400 border border-white/[0.12] hover:border-accent/50 transition-all flex-shrink-0 shadow-sm"
          title="New Explorer Tab (Ctrl+T)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Navigation Controls (when tabs overflow) */}
      <div className="flex items-center gap-0.5 pl-2 border-l border-white/[0.1] flex-shrink-0">
        <button
          type="button"
          aria-label="Scroll tabs left"
          onClick={() => scrollTabs(-180)}
          className="p-1 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Scroll tabs left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="Scroll tabs right"
          onClick={() => scrollTabs(180)}
          className="p-1 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Scroll tabs right"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
};
