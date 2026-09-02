import React, { useState } from 'react';
import { useLibrary } from './context/LibraryContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { FiltersBar } from './components/FiltersBar';
import { VideoCard } from './components/VideoCard';
import { FolderCard } from './components/FolderCard';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { PdfReaderModal } from './components/PdfReaderModal';
import { FloatingPopupPlayer } from './components/FloatingPopupPlayer';
import { ContextMenu } from './components/ContextMenu';
import { TagEditorModal } from './components/TagEditorModal';
import { PlaylistModal } from './components/PlaylistModal';
import { StatsModal } from './components/StatsModal';
import { TabBar } from './components/TabBar';
import { OnlineVideoHub } from './components/OnlineVideoHub';
import { FolderPlus, SearchX, Sparkles, UploadCloud } from 'lucide-react';




export const AppContent: React.FC = () => {
  const {
    filteredVideos,
    explorationMode,
    navSubfolders,
    navFolderVideos,
    navigateIntoFolder,
    navigateUpFolder,
    viewMode,
    tabs,
    activeTabId,
    openInNewTab,
    closeTab,
    activePlayingVideo,
    setActivePlayingVideo,
    floatingVideo,
    setFloatingVideo,
    contextMenu,
    setContextMenu,
    editingTagsVideo,
    setEditingTagsVideo,
    playlistModalVideo,
    setPlaylistModalVideo,
    playlists,
    createPlaylist,
    toggleVideoInPlaylist,
    updateVideoTags,
    deleteVideoFromLibrary,
    deleteVideoFromDisk,
    moveVideoFile,
    revealInExplorer,
    addFolders,
    addWebFiles,
    isScanning,
    scanProgressText,
    resetFilters,
    theme,
  } = useLibrary();

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (window.electronAPI) {
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const paths = files.map((f: any) => f.path).filter(Boolean);
        if (paths.length > 0) {
          await addFolders(paths);
          return;
        }
      }
    }

    // Web mode / recursive directory entry scanner
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const fileList: File[] = [];
      const traverseEntry = async (entry: any): Promise<void> => {
        if (entry.isFile) {
          return new Promise((resolve) => {
            entry.file((file: File) => {
              fileList.push(file);
              resolve();
            }, () => resolve());
          });
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          return new Promise((resolve) => {
            const readEntries = () => {
              reader.readEntries(async (entries: any[]) => {
                if (entries.length === 0) {
                  resolve();
                } else {
                  for (const ent of entries) {
                    await traverseEntry(ent);
                  }
                  readEntries();
                }
              }, () => resolve());
            };
            readEntries();
          });
        }
      };

      const promises: Promise<void>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
        if (entry) {
          promises.push(traverseEntry(entry));
        }
      }

      await Promise.all(promises);
      if (fileList.length > 0) {
        await addWebFiles(fileList);
        return;
      }
    }

    // Standard raw files fallback
    const rawFiles = Array.from(e.dataTransfer.files);
    if (rawFiles.length > 0) {
      await addWebFiles(rawFiles);
    }
  };

  const handleHiddenFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await addWebFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col h-screen w-screen bg-background text-slate-100 overflow-hidden font-sans font-light select-none transition-all duration-300 border-2 border-[#1e40af] shadow-[0_0_20px_rgba(30,64,175,0.35)] box-border ${
        theme === 'minimal' ? 'theme-monochrome' : 'theme-colored'
      }`}
    >
      {/* Main Workstation Screen: Clean, solid, edge-to-edge dark display */}
      <div 
        className="relative z-10 flex flex-col flex-1 w-full h-full bg-[#080c14] overflow-hidden"
      >


        {/* Hidden file input for web directory picking fallback */}
        <input
          id="watchthis-hidden-folder-input"
          type="file"
          {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
          onChange={handleHiddenFolderInputChange}
          style={{ display: 'none' }}
        />

        {/* Drag & Drop Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-[140] bg-black/85 backdrop-blur-xl border-2 border-dashed border-accent-neon flex flex-col items-center justify-center p-8 pointer-events-none animate-in fade-in duration-100">
            <div className="w-16 h-16 rounded-3xl bg-accent/20 border border-accent-neon flex items-center justify-center text-accent-neon mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-light text-white tracking-widest mb-1">
              DROP TO SCAN & INDEX MEDIA
            </h2>
            <p className="text-xs font-mono text-accent-cyan font-light">
              Release video or PDF folders to automatically index into WatchThis
            </p>
          </div>
        )}

        {/* Top Navigation Bar */}
        <Navbar />

        {/* Futuristic Multi-Tab Strip */}
        <TabBar />


      {/* Active Tab Viewport Area */}
      {(!activeTab || activeTab.type === 'library') ? (
        /* Main Media Explorer Layout Container */
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Right Content Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-background/60 overflow-hidden relative">
            {/* Dynamic Mode Switcher & Filter Pills */}
            <FiltersBar />

            {/* Real-time Scanning Progress Bar Banner */}
            {isScanning && (
              <div className="px-6 py-2 bg-accent/15 border-b border-accent/25 text-accent-cyan text-xs font-mono flex items-center gap-2 animate-pulse font-light">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-accent-neon" />
                <span>{scanProgressText || 'Discovering media files and analyzing metadata...'}</span>
              </div>
            )}

            {/* Scrollable Feed Container */}
            <div className="flex-1 overflow-y-auto p-6">
              {explorationMode === 'folders' ? (
                /* Normal Folder Hierarchy Mode */
                navSubfolders.length === 0 && navFolderVideos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-3xl bg-surface-elevated border border-white/10 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
                      <SearchX className="w-8 h-8 text-accent-cyan" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1.5">No media in this folder</h3>
                    <p className="text-xs font-mono text-slate-400 max-w-sm mb-6 font-normal">
                      Add local media folders or navigate to parent directories.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={navigateUpFolder}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-all font-medium"
                      >
                        Go Up Level
                      </button>
                      <button
                        onClick={() => addFolders()}
                        className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-mono transition-all flex items-center gap-2 font-medium shadow-glow-accent"
                      >
                        <FolderPlus className="w-4 h-4" /> Add Folder
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-7 pb-12">
                    {/* Nested Subfolders Grid */}
                    {navSubfolders.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3.5 px-1">
                          <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                            Folders ({navSubfolders.length})
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gap: '1.25rem',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                          }}
                        >
                          {navSubfolders.map(folder => (
                            <FolderCard
                              key={folder.path}
                              folder={folder}
                              theme={theme}
                              onOpen={navigateIntoFolder}
                              onReveal={revealInExplorer}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Direct Files in this Folder (PDFs, Videos, Media) */}
                    {navFolderVideos.length > 0 && (
                      <div>
                        {navSubfolders.length > 0 && (
                          <div className="flex items-center gap-2 mb-3.5 px-1">
                            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                              Files ({navFolderVideos.length})
                            </span>
                          </div>
                        )}
                        <div
                          style={{
                            display: viewMode === 'compact' ? 'flex' : 'grid',
                            flexDirection: viewMode === 'compact' ? 'column' : undefined,
                            gap: viewMode === 'compact' ? '0.75rem' : '1.5rem',
                            gridTemplateColumns: viewMode !== 'compact' ? 'repeat(auto-fill, minmax(var(--card-min-width), 1fr))' : undefined,
                          }}
                        >
                          {navFolderVideos.map(video => (
                            <VideoCard key={video.id} video={video} viewMode={viewMode} />
                          ))}
                        </div>
                      </div>
                    )}



                  </div>
                )
              ) : (
                /* Flat Global File Index Mode */
                filteredVideos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-3xl bg-surface-elevated border border-white/10 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
                      <SearchX className="w-8 h-8 text-accent-cyan" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1.5">No media in your library</h3>
                    <p className="text-xs font-mono text-slate-400 max-w-sm mb-6 font-normal">
                      Add local video/PDF folders or drop media files anywhere on this window to start exploring.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={resetFilters}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-all font-medium"
                      >
                        Clear Filters
                      </button>
                      <button
                        onClick={() => addFolders()}
                        className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-mono transition-all flex items-center gap-2 font-medium shadow-glow-accent"
                      >
                        <FolderPlus className="w-4 h-4" /> Add Media Folder
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: viewMode === 'compact' ? 'flex' : 'grid',
                      flexDirection: viewMode === 'compact' ? 'column' : undefined,
                      gap: viewMode === 'compact' ? '0.75rem' : '1.5rem',
                      gridTemplateColumns: viewMode !== 'compact' ? 'repeat(auto-fill, minmax(var(--card-min-width), 1fr))' : undefined,
                      paddingBottom: '3.5rem',
                    }}
                  >
                    {filteredVideos.map((video) => (
                      <VideoCard key={video.id} video={video} viewMode={viewMode} />
                    ))}
                  </div>
                )
              )}
            </div>
          </main>
        </div>
      ) : activeTab.type === 'pdf' && activeTab.video ? (
        /* Embedded PDF Reader Tab Workstation */
        <div className="flex-1 relative overflow-hidden">
          <PdfReaderModal
            video={activeTab.video}
            onClose={() => closeTab(activeTab.id)}
          />
        </div>
      ) : activeTab.type === 'video' && activeTab.video ? (
        /* Embedded Video Player Tab Workstation */
        <div className="flex-1 relative overflow-hidden">
          <VideoPlayerModal
            video={activeTab.video}
            onClose={() => closeTab(activeTab.id)}
          />
        </div>
      ) : activeTab.type === 'online' ? (
        /* Embedded Online Video & Reels Workstation */
        <div className="flex-1 relative overflow-hidden">
          <OnlineVideoHub
            initialUrl={activeTab.onlineUrl}
            onClose={() => closeTab(activeTab.id)}
          />
        </div>
      ) : null}


      {/* Right-Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          video={contextMenu.video}
          theme={theme}
          onClose={() => setContextMenu(null)}
          onOpenInNewTab={(v) => openInNewTab(v, true)}
          onAddToPlaylist={(v) => setPlaylistModalVideo(v)}
          onDeleteFromLibrary={(v) => deleteVideoFromLibrary(v)}
          onDeleteFromDisk={(v) => deleteVideoFromDisk(v)}
          onOpenFileLocation={(v) => revealInExplorer(v.path)}
          onMoveFile={(v) => moveVideoFile(v)}
          onEditTags={(v) => setEditingTagsVideo(v)}
          onLaunchPopupMode={(v) => setFloatingVideo({ video: v })}
        />
      )}

      {/* Break-free Draggable Floating Popup Mode Player */}
      {floatingVideo && (
        <FloatingPopupPlayer
          video={floatingVideo.video}
          originRect={floatingVideo.originRect}
          theme={theme}
          onClose={() => setFloatingVideo(null)}
          onOpenWorkstation={(v) => openInNewTab(v, true)}
        />
      )}

      {/* Edit Tags Modal */}
      {editingTagsVideo && (
        <TagEditorModal
          video={editingTagsVideo}
          theme={theme}
          onClose={() => setEditingTagsVideo(null)}
          onSaveTags={updateVideoTags}
        />
      )}

      {/* Playlists Management Modal */}
      {playlistModalVideo && (
        <PlaylistModal
          video={playlistModalVideo}
          playlists={playlists}
          theme={theme}
          onClose={() => setPlaylistModalVideo(null)}
          onCreatePlaylist={createPlaylist}
          onToggleVideoInPlaylist={toggleVideoInPlaylist}
        />
      )}

      {/* In-App Fullscreen Player / PDF Reader Workstation Modal (when triggered standalone outside active tab) */}
      {activePlayingVideo && (!activeTab || activeTab.video?.id !== activePlayingVideo.id) && (
        activePlayingVideo.isPdf || activePlayingVideo.extension?.toLowerCase() === '.pdf' ? (
          <PdfReaderModal
            video={activePlayingVideo}
            onClose={() => setActivePlayingVideo(null)}
          />
        ) : (
          <VideoPlayerModal
            video={activePlayingVideo}
            onClose={() => setActivePlayingVideo(null)}
          />
        )
      )}

      {/* Library Analytics & Diagnostics Modal */}
      <StatsModal />
      </div>
    </div>
  );
};

export default AppContent;

