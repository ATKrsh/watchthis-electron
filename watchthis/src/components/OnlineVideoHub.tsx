import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Home, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  Maximize2, 
  ShieldCheck, 
  Search, 
  Tv, 
  Video, 
  Flame, 
  X,
  Lock
} from 'lucide-react';
import { OnlineWebsiteBookmark } from '../types/video';

interface OnlineVideoHubProps {
  initialUrl?: string;
  onClose?: () => void;
}

const DEFAULT_BOOKMARKS: OnlineWebsiteBookmark[] = [
  {
    id: 'yt_home',
    title: 'YouTube',
    url: 'https://www.youtube.com',
    category: 'video',
    badge: '4K / Full HD',
  },
  {
    id: 'yt_shorts',
    title: 'YouTube Shorts',
    url: 'https://www.youtube.com/shorts',
    category: 'reels',
    badge: 'Shorts & Reels',
  },
  {
    id: 'insta_reels',
    title: 'Instagram Reels',
    url: 'https://www.instagram.com/reels/',
    category: 'reels',
    badge: 'Trending Reels',
  },
  {
    id: 'fikfap',
    title: 'FikFap',
    url: 'https://fikfap.com',
    category: 'nsfw',
    badge: '18+ Reels Portal',
  },
  {
    id: 'tiktok',
    title: 'TikTok',
    url: 'https://www.tiktok.com',
    category: 'reels',
    badge: 'Viral Videos',
  },
  {
    id: 'twitch',
    title: 'Twitch TV',
    url: 'https://www.twitch.tv',
    category: 'video',
    badge: 'Live Gaming & Streams',
  },
  {
    id: 'reddit_vids',
    title: 'Reddit Videos',
    url: 'https://www.reddit.com/r/videos/',
    category: 'video',
    badge: 'Community Clips',
  },
  {
    id: 'vimeo',
    title: 'Vimeo Watch',
    url: 'https://vimeo.com/watch',
    category: 'video',
    badge: 'Cinema & 4K Arts',
  },
];

export const OnlineVideoHub: React.FC<OnlineVideoHubProps> = ({ initialUrl, onClose }) => {
  const [currentUrl, setCurrentUrl] = useState<string>(initialUrl || 'https://www.youtube.com');
  const [inputUrl, setInputUrl] = useState<string>(initialUrl || 'https://www.youtube.com');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHomeView, setIsHomeView] = useState<boolean>(!initialUrl);
  const [aspectMode, setAspectMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customBookmarks, setCustomBookmarks] = useState<OnlineWebsiteBookmark[]>(() => {
    try {
      const saved = localStorage.getItem('watchthis_custom_online_sites');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newSiteTitle, setNewSiteTitle] = useState<string>('');
  const [newSiteUrl, setNewSiteUrl] = useState<string>('');
  const [newSiteCategory, setNewSiteCategory] = useState<'video' | 'reels' | 'custom' | 'nsfw'>('video');

  const webviewRef = useRef<any>(null);

  // Save custom bookmarks to persistent localStorage
  useEffect(() => {
    try {
      localStorage.setItem('watchthis_custom_online_sites', JSON.stringify(customBookmarks));
    } catch (_) {}
  }, [customBookmarks]);

  // Sync webview events
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStartLoading = () => setIsLoading(true);
    const handleStopLoading = () => {
      setIsLoading(false);
      try {
        const u = webview.getURL();
        if (u && u !== 'about:blank') {
          setCurrentUrl(u);
          setInputUrl(u);
        }
      } catch (_) {}
    };

    const handleDidNavigate = (e: any) => {
      if (e.url && e.url !== 'about:blank') {
        setCurrentUrl(e.url);
        setInputUrl(e.url);
      }
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
    };
  }, [isHomeView]);

  const navigateTo = (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl) return;

    if (!/^https?:\/\//i.test(finalUrl)) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = `https://${finalUrl}`;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      }
    }

    setCurrentUrl(finalUrl);
    setInputUrl(finalUrl);
    setIsHomeView(false);

    if (webviewRef.current) {
      try {
        webviewRef.current.loadURL(finalUrl);
      } catch (_) {}
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(inputUrl);
  };

  const handleGoBack = () => {
    if (webviewRef.current) {
      try {
        if (webviewRef.current.canGoBack()) {
          webviewRef.current.goBack();
        }
      } catch (_) {}
    }
  };

  const handleGoForward = () => {
    if (webviewRef.current) {
      try {
        if (webviewRef.current.canGoForward()) {
          webviewRef.current.goForward();
        }
      } catch (_) {}
    }
  };

  const handleReload = () => {
    if (webviewRef.current) {
      try {
        webviewRef.current.reload();
      } catch (_) {}
    }
  };

  const handleOpenExternal = () => {
    if (window.electronAPI?.openExternal && currentUrl) {
      window.electronAPI.openExternal(currentUrl);
    } else {
      window.open(currentUrl, '_blank');
    }
  };

  const handleAddCustomSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteTitle.trim() || !newSiteUrl.trim()) return;

    let formattedUrl = newSiteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newBookmark: OnlineWebsiteBookmark = {
      id: `custom_${Date.now()}`,
      title: newSiteTitle.trim(),
      url: formattedUrl,
      category: newSiteCategory,
      badge: 'Custom Portal',
      isCustom: true,
    };

    setCustomBookmarks(prev => [newBookmark, ...prev]);
    setNewSiteTitle('');
    setNewSiteUrl('');
    setShowAddModal(false);
  };

  const handleDeleteCustomSite = (id: string) => {
    setCustomBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const allBookmarks = [...customBookmarks, ...DEFAULT_BOOKMARKS];
  const filteredBookmarks = allBookmarks.filter(b => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'reels') return b.category === 'reels';
    if (activeCategory === 'video') return b.category === 'video';
    if (activeCategory === 'nsfw') return b.category === 'nsfw';
    if (activeCategory === 'custom') return b.isCustom;
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col bg-background text-slate-100 font-sans select-none overflow-hidden">
      {/* ── Top Browser Command Header ── */}
      <div className="h-14 px-4 bg-surface border-b border-white/[0.12] flex items-center justify-between gap-3 z-30 flex-shrink-0">
        {/* Navigation Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setIsHomeView(true)}
            title="Portal Directory / Home"
            className={`p-1.5 border transition-all ${
              isHomeView 
                ? 'bg-accent/25 text-accent-cyan border-accent-cyan/50 shadow-sm' 
                : 'bg-surface-elevated border-white/10 text-slate-300 hover:text-white hover:border-white/20'
            }`}
          >
            <Home className="w-4 h-4" />
          </button>

          <button
            onClick={handleGoBack}
            title="Go Back"
            disabled={isHomeView}
            className="p-1.5 bg-surface-elevated border border-white/10 text-slate-300 hover:text-white hover:border-white/20 disabled:opacity-35 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleGoForward}
            title="Go Forward"
            disabled={isHomeView}
            className="p-1.5 bg-surface-elevated border border-white/10 text-slate-300 hover:text-white hover:border-white/20 disabled:opacity-35 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleReload}
            title="Reload Page"
            disabled={isHomeView}
            className="p-1.5 bg-surface-elevated border border-white/10 text-slate-300 hover:text-white hover:border-white/20 disabled:opacity-35 transition-all"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-accent-cyan' : ''}`} />
          </button>
        </div>

        {/* Address Bar Form */}
        <form onSubmit={handleInputSubmit} className="flex-1 max-w-2xl flex items-center">
          <div className="w-full flex items-center bg-surface-elevated border border-white/15 focus-within:border-accent-cyan/60 px-3 py-1.5 transition-all">
            <Lock className="w-3.5 h-3.5 text-emerald-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Search or enter website URL (e.g. https://www.youtube.com, fikfap.com, instagram.com)..."
              className="w-full bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
            />
            <button type="submit" className="text-slate-400 hover:text-accent-cyan p-0.5 ml-1">
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Viewport, Add Site & External Tools */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile Reels Mode vs Desktop Mode */}
          <button
            onClick={() => setAspectMode(prev => prev === 'desktop' ? 'mobile' : 'desktop')}
            title={aspectMode === 'desktop' ? 'Switch to Vertical Mobile Reels Viewport (9:16)' : 'Switch to Full Desktop Viewport'}
            className={`flex items-center gap-1.5 px-2.5 h-8 border text-xs font-mono font-medium transition-all ${
              aspectMode === 'mobile'
                ? 'bg-accent-magenta/25 border-accent-magenta/50 text-white shadow-sm'
                : 'bg-surface-elevated border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            {aspectMode === 'mobile' ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-accent-magenta" />
                <span className="hidden sm:inline">Reels (9:16)</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-accent-cyan" />
                <span className="hidden sm:inline">Desktop</span>
              </>
            )}
          </button>

          {/* Add Custom Website Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 h-8 bg-accent/20 hover:bg-accent/30 text-accent-neon border border-accent-neon/40 text-xs font-mono font-medium transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Website</span>
          </button>

          {/* Open in Default Browser */}
          <button
            onClick={handleOpenExternal}
            title="Open in External Default Browser"
            className="p-1.5 bg-surface-elevated border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Tab"
              className="p-1.5 bg-surface-elevated border border-white/10 text-slate-400 hover:text-red-400 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Workstation Content Area ── */}
      <div className="flex-1 relative overflow-hidden flex bg-black">
        {isHomeView ? (
          /* ── Portal Launcher Dashboard ── */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header Banner */}
            <div className="p-6 border border-white/15 bg-surface-elevated/70 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-5 h-5 text-accent-cyan" />
                    <h2 className="text-lg font-bold font-mono tracking-wide text-white uppercase">
                      Online Video & Reels Hub
                    </h2>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 border border-emerald-400/40 bg-emerald-500/20 text-emerald-300 font-bold">
                      Persistent Logins Active
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 max-w-xl">
                    Log into YouTube, Instagram, FikFap, TikTok, Twitch or any custom video platform. Your accounts, sessions, and bookmarks persist seamlessly across app restarts.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-accent to-accent-hover text-white text-xs font-mono font-bold flex items-center gap-2 border border-accent/40 shadow-glow-accent"
                >
                  <Plus className="w-4 h-4" /> Add Custom Website
                </button>
              </div>

              {/* Category Quick Filter Pills */}
              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/10 overflow-x-auto">
                {[
                  { id: 'all', label: 'All Portals' },
                  { id: 'reels', label: 'Reels & Shorts' },
                  { id: 'video', label: 'Video Portals' },
                  { id: 'nsfw', label: '18+ Adult Hub' },
                  { id: 'custom', label: 'My Custom Sites' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 text-xs font-mono transition-all border ${
                      activeCategory === cat.id
                        ? 'bg-accent-cyan/20 border-accent-cyan/50 text-white font-bold shadow-sm'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Portal Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBookmarks.map((site) => (
                <div
                  key={site.id}
                  onClick={() => navigateTo(site.url)}
                  className="group relative p-4 border border-white/10 bg-surface-elevated hover:bg-surface-elevated/90 hover:border-accent-cyan/50 transition-all cursor-pointer flex flex-col justify-between h-36"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-white/10 bg-white/5 text-slate-300 font-semibold group-hover:border-accent-cyan/40 group-hover:text-accent-cyan transition-colors">
                        {site.badge || site.category}
                      </span>
                      {site.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomSite(site.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h3 className="text-sm font-bold font-mono text-white group-hover:text-accent-cyan transition-colors truncate">
                      {site.title}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-1">
                      {site.url.replace(/^https?:\/\//i, '')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-accent-neon font-medium">
                    <span>Launch &bull; Full Login</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Persistent Embedded Webview Viewport ── */
          <div className="flex-1 h-full w-full flex items-center justify-center bg-black relative">
            <div 
              className={`h-full transition-all duration-300 relative flex flex-col bg-black ${
                aspectMode === 'mobile'
                  ? 'w-[420px] max-w-full border-x-2 border-accent-magenta/40 shadow-[0_0_40px_rgba(247,37,133,0.3)]'
                  : 'w-full'
              }`}
            >
              <webview
                ref={webviewRef}
                src={currentUrl}
                partition="persist:watchthis_online"
                allowpopups={true}
                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                webpreferences="allowRunningInsecureContent, javascript=yes"
                className="w-full h-full flex-1 bg-black"
                style={{ width: '100%', height: '100%' }}
              />


            </div>
          </div>
        )}
      </div>

      {/* ── Add Custom Website Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-accent-cyan/40 p-6 space-y-4 shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-accent-cyan" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Add Online Website
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomSite} className="space-y-3.5">
              <div>
                <label className="text-[11px] uppercase text-slate-300 font-bold block mb-1">
                  Website Name
                </label>
                <input
                  type="text"
                  value={newSiteTitle}
                  onChange={(e) => setNewSiteTitle(e.target.value)}
                  placeholder="e.g. My Favorite Reels Site"
                  required
                  className="w-full px-3 py-2 bg-surface-elevated border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase text-slate-300 font-bold block mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  placeholder="https://example.com/videos"
                  required
                  className="w-full px-3 py-2 bg-surface-elevated border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase text-slate-300 font-bold block mb-1">
                  Portal Category
                </label>
                <select
                  value={newSiteCategory}
                  onChange={(e) => setNewSiteCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-white/15 text-xs text-white focus:outline-none focus:border-accent-cyan"
                >
                  <option value="video">Standard Video Portal</option>
                  <option value="reels">Reels & Shorts Portal</option>
                  <option value="nsfw">18+ Adult Media</option>
                  <option value="custom">Custom Site</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-glow-accent border border-accent/40"
                >
                  Save & Add Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
