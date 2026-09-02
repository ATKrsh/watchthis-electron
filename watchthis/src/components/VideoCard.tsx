import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Star, 
  Film, 
  MoreVertical, 
  Layers, 
  Zap, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { VideoItem, ThemeMode, ViewMode } from '../types/video';
import { formatDuration, formatFileSize } from '../utils/formatters';
import { useLibrary } from '../context/LibraryContext';
import { generateVideoThumbnail, generatePdfThumbnail, getCachedThumbnail } from '../utils/thumbnailGenerator';
import { loadPdfDocument } from '../utils/pdfRenderer';

interface VideoCardProps {
  video: VideoItem;
  theme?: ThemeMode;
  viewMode: ViewMode;
  onPlay?: (video: VideoItem) => void;
  onContextMenu?: (e: React.MouseEvent, video: VideoItem) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  theme: propTheme,
  viewMode,
  onPlay,
  onContextMenu
}) => {
  const { 
    toggleFavorite, 
    previewSpeed, 
    openInNewTab,
    showThumbnails,
    enableHoverPreview,
    theme: contextTheme,
    setActivePlayingVideo,
    setContextMenu
  } = useLibrary();

  const theme = propTheme || contextTheme;


  const [isHovered, setIsHovered] = useState(false);
  const [duration, setDuration] = useState<number>(video.duration || 0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [hasVideoError, setHasVideoError] = useState<boolean>(false);
  const [isActuallyPlaying, setIsActuallyPlaying] = useState<boolean>(false);
  
  // PDF state
  const isPdf = video.isPdf || video.extension?.toLowerCase() === '.pdf';
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRenderTaskRef = useRef<any>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isHoveredRef = useRef<boolean>(false);

  // Synchronous cache lookup
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | undefined>(() => {
    if (video.thumbnail && video.thumbnail !== 'FAILED') return video.thumbnail;
    const source = video.streamUrl || video.path;
    const mem = getCachedThumbnail(source) || getCachedThumbnail(video.path);
    return mem && mem !== 'FAILED' ? mem : undefined;
  });

  // Lazy Thumbnail Generation via IntersectionObserver
  useEffect(() => {
    if (!showThumbnails) return;
    const source = video.streamUrl || video.path;
    const mem = getCachedThumbnail(source) || getCachedThumbnail(video.path);
    if (video.thumbnail || generatedThumbnail || mem === 'FAILED') return;

    let isMounted = true;
    let observer: IntersectionObserver | null = null;

    if (cardRef.current) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (isPdf) {
              generatePdfThumbnail(source, video.id)
                .then((thumb) => {
                  if (isMounted && thumb && thumb !== 'FAILED') setGeneratedThumbnail(thumb);
                })
                .catch(() => {});
            } else {
              generateVideoThumbnail(source, video.id, duration || video.duration)
                .then((thumb) => {
                  if (isMounted && thumb && thumb !== 'FAILED') setGeneratedThumbnail(thumb);
                })
                .catch(() => {});
            }
            if (observer && cardRef.current) {
              observer.unobserve(cardRef.current);
            }
          }
        });
      }, { rootMargin: '250px' });

      observer.observe(cardRef.current);
    }

    return () => {
      isMounted = false;
      if (observer && cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [video.id, video.thumbnail, video.path, video.streamUrl, showThumbnails, isPdf, duration, video.duration, generatedThumbnail]);

  const effectiveThumbnail = video.thumbnail || generatedThumbnail;


  // ── High-Speed Instant Video Preview on Hover ──
  useEffect(() => {
    isHoveredRef.current = isHovered;
    if (isPdf || !enableHoverPreview) return;
    const vid = videoRef.current;
    if (!vid) return;

    if (isHovered && !hasVideoError) {
      vid.muted = true;
      vid.defaultMuted = true;
      vid.playbackRate = previewSpeed;
      vid.defaultPlaybackRate = previewSpeed;

      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (isHoveredRef.current) {
              setIsActuallyPlaying(true);
            } else {
              vid.pause();
            }
          })
          .catch((err) => {
            if (err.name === 'AbortError') return;
            setHasVideoError(true);
          });
      }
    } else {
      setIsActuallyPlaying(false);
      try {
        vid.pause();
      } catch (_) {}
      setCurrentTime(0);
    }
  }, [isHovered, previewSpeed, isPdf, hasVideoError, enableHoverPreview]);

  // ── PDF Page Render Helper ──
  const renderPdfPage = useCallback(async (doc: any, pageNo: number) => {
    const canvas = pdfCanvasRef.current;
    if (!canvas || !doc) return;

    if (pdfRenderTaskRef.current) {
      try {
        pdfRenderTaskRef.current.cancel();
      } catch (_) {}
      pdfRenderTaskRef.current = null;
    }

    try {
      const page = await doc.getPage(pageNo);
      const vp = page.getViewport({ scale: 1.0 });
      const targetW = canvas.clientWidth || 320;
      const targetH = canvas.clientHeight || 180;
      const scale = Math.min(targetW / vp.width, targetH / vp.height) * (window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale: Math.max(0.4, scale) });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const task = page.render({
        canvasContext: ctx,
        canvas,
        viewport,
      });
      pdfRenderTaskRef.current = task;
      await task.promise;
    } catch (err: any) {
      // Silently handled
    }
  }, []);

  // ── High-Speed Instant PDF Hover Preview & Auto Page Cycling ──
  useEffect(() => {
    if (!isPdf || !enableHoverPreview) return;
    let isMounted = true;
    let cycleTimer: any = null;

    if (isHovered) {
      const source = video.streamUrl || video.path;
      loadPdfDocument(source)
        .then((doc) => {
          if (!isMounted) return;
          setPdfDoc(doc);
          setPdfNumPages(doc.numPages);
          renderPdfPage(doc, 1);

          if (doc.numPages > 1) {
            const intervalMs = Math.max(200, Math.floor(1000 / previewSpeed));
            cycleTimer = setInterval(() => {
              setPdfPage((prevPage) => {
                const nextPage = prevPage >= doc.numPages ? 1 : prevPage + 1;
                renderPdfPage(doc, nextPage);
                return nextPage;
              });
            }, intervalMs);
          }
        })
        .catch(() => {});
    } else {
      if (cycleTimer) clearInterval(cycleTimer);
      setPdfPage(1);
    }

    return () => {
      isMounted = false;
      if (cycleTimer) clearInterval(cycleTimer);
    };
  }, [isHovered, isPdf, previewSpeed, renderPdfPage, enableHoverPreview, video.streamUrl, video.path]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (!duration && videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (isPdf) {
      if (pdfDoc && pdfNumPages > 0) {
        const targetPage = Math.max(1, Math.min(pdfNumPages, Math.floor(pos * pdfNumPages) + 1));
        setPdfPage(targetPage);
        renderPdfPage(pdfDoc, targetPage);
      }
    } else {
      if (videoRef.current && duration > 0) {
        const targetTime = pos * duration;
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
    }
  };

  const handleOpenPlayer = () => {
    if (onPlay) {
      onPlay(video);
    } else {
      setActivePlayingVideo(video);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e, video);
    } else {
      setContextMenu({ x: e.clientX, y: e.clientY, video });
    }
  };


  const isNeon = theme === 'neon';

  const progressPercent = isPdf
    ? (pdfNumPages > 0 ? (pdfPage / pdfNumPages) * 100 : 0)
    : (duration > 0 ? (currentTime / duration) * 100 : 0);

  const displayDuration = isPdf
    ? (isHovered && pdfNumPages > 0 ? `Pg ${pdfPage}/${pdfNumPages}` : pdfNumPages > 0 ? `${pdfNumPages} Pgs` : 'PDF')
    : duration > 0 ? formatDuration(duration) : video.duration > 0 ? formatDuration(video.duration) : '--:--';

  const getBadgeStyle = () => {
    if (isPdf) return 'bg-red-600 text-white border-red-400/40 shadow-sm';
    if (video.resolution.includes('4K')) return 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-sm';
    if (video.resolution.includes('1080p')) return 'bg-cyan-400 text-slate-950 font-bold border-cyan-300 shadow-sm';
    return 'bg-black/70 border-white/20 text-white';
  };

  // ── Video Preview Element ──
  const videoEl = !isPdf && enableHoverPreview && (
    !hasVideoError ? (
      <video
        ref={videoRef}
        src={video.streamUrl}
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setHasVideoError(true)}
        onLoadedMetadata={() => {
          if (videoRef.current?.duration) setDuration(videoRef.current.duration);
        }}
        onPlaying={() => {
          if (isHoveredRef.current) setIsActuallyPlaying(true);
        }}
        onTimeUpdate={handleTimeUpdate}
        className={`absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-150 ${
          isActuallyPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
    ) : (
      <canvas
        ref={fallbackCanvasRef}
        width={320}
        height={180}
        className={`absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-150 ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
    )
  );

  // ── PDF Live Preview Element ──
  const pdfEl = isPdf && enableHoverPreview && (
    <div
      className={`absolute inset-0 w-full h-full z-20 transition-opacity duration-150 flex items-center justify-center bg-black/95 ${
        isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <canvas
        ref={pdfCanvasRef}
        className="w-full h-full object-contain"
      />
    </div>
  );

  // ── COMPACT LIST VIEW ─────────────────────────────────────────────────────
  if (viewMode === 'compact') {
    return (
      <div
        ref={cardRef}
        onDoubleClick={handleOpenPlayer}
        onContextMenu={handleContextMenu}
        onAuxClick={(e) => {
          if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            openInNewTab(video, true);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative flex items-center justify-between p-2.5 border transition-all cursor-pointer select-none font-sans ${
          isNeon
            ? 'bg-surface-elevated/60 hover:bg-surface-elevated border-white/[0.1] hover:border-accent/60 hover:shadow-glow-accent'
            : 'bg-[#101420]/75 hover:bg-[#151a2a] border-white/[0.08] hover:border-white/30'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            onClick={handleOpenPlayer}
            className="relative w-28 h-16 bg-black overflow-hidden flex-shrink-0 border border-white/15 flex items-center justify-center cursor-pointer shadow-md"
          >
            {/* Live Hover Preview Layer */}
            {isPdf ? pdfEl : videoEl}

            {/* Thumbnail Poster Layer */}
            {showThumbnails && effectiveThumbnail ? (
              <img src={effectiveThumbnail} alt={video.name} className="w-full h-full object-cover" />
            ) : isPdf ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-950/50 via-slate-900 to-black">
                <FileText className="w-6 h-6 text-red-400" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-elevated text-slate-400">
                <Film className="w-6 h-6" />
              </div>
            )}

            {/* Interactive Timeline Scrubber on Hover */}
            {isHovered && enableHoverPreview && (
              <div
                onClick={handleScrubberClick}
                className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/30 z-30 cursor-ew-resize"
              >
                <div className="h-full bg-gradient-to-r from-accent to-accent-cyan duration-75" style={{ width: `${progressPercent}%` }} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono font-bold text-white truncate max-w-xl group-hover:text-accent-cyan transition-colors" title={video.name}>
                {video.name}
              </p>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 border whitespace-nowrap font-bold ${getBadgeStyle()}`}>
                {isPdf ? (isHovered && pdfNumPages > 0 ? `Pg ${pdfPage}/${pdfNumPages}` : 'PDF') : video.resolution}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
              {video.smartTags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-[9px] font-mono px-1.5 py-0.2 bg-white/[0.06] text-slate-300 font-medium border border-white/[0.08] whitespace-nowrap">
                  #{tag}
                </span>
              ))}
              <span className="text-[10px] font-mono text-slate-400 ml-1 whitespace-nowrap">
                &bull; {formatFileSize(video.size)} &bull; {displayDuration}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(video.id);
            }}
            className={`p-1.5 border transition-all ${video.isFavorite ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' : 'text-slate-500 hover:text-slate-200 border-transparent hover:border-white/10'}`}
          >
            <Star className={`w-3.5 h-3.5 ${video.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button onClick={handleContextMenu} className="p-1.5 text-slate-400 hover:text-white border border-transparent hover:border-white/15 transition-colors">
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ── GRID & POSTER VIEW ────────────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleOpenPlayer}
      onContextMenu={handleContextMenu}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          e.stopPropagation();
          openInNewTab(video, true);
        }
      }}
      className={`group relative overflow-hidden dof-card cursor-pointer border shadow-md flex flex-col justify-between select-none font-sans min-h-[220px] ${
        isNeon ? 'border-white/[0.12] bg-surface/90 hover:border-accent/70 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)]' : 'border-white/[0.08] bg-[#101420]/90 hover:border-white/30'
      }`}
    >
      {/* Live Hover Layer */}
      {isPdf ? pdfEl : videoEl}

      {/* Interactive Live Progress Scrubber */}
      {isHovered && enableHoverPreview && (
        <div
          onClick={handleScrubberClick}
          className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/30 z-30 cursor-ew-resize hover:h-2.5 transition-all"
        >
          <div
            className="h-full bg-gradient-to-r from-accent via-accent-cyan to-accent-neon transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Thumbnail / Poster Area */}
      <div
        onClick={handleOpenPlayer}
        className={`relative w-full bg-slate-950 overflow-hidden ${viewMode === 'poster' ? 'aspect-[16/11]' : 'aspect-video'}`}
      >
        {showThumbnails && effectiveThumbnail ? (
          <img
            src={effectiveThumbnail}
            alt={video.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
          />
        ) : isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-950/50 via-slate-900 to-black text-red-400">
            <FileText className="w-9 h-9 mb-1.5 stroke-[1.5]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-300">PDF Document</span>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-elevated text-slate-400">
            <Film className="w-8 h-8 mb-1.5 stroke-[1.5]" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">{video.resolution}</span>
          </div>
        )}

        {/* Ambient Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <span
            className={`px-2 py-0.2 text-[9px] font-mono uppercase tracking-wider border shadow-md font-bold whitespace-nowrap ${getBadgeStyle()}`}
          >
            {isPdf ? (isHovered && pdfNumPages > 0 ? `Pg ${pdfPage}/${pdfNumPages}` : 'PDF') : video.resolution}
          </span>

          <div className="flex items-center gap-1">
            {video.hdr && (
              <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase bg-accent-magenta/90 text-white font-bold border border-accent-magenta shadow-sm">
                HDR
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(video.id);
              }}
              className={`p-1 border transition-all ${
                video.isFavorite
                  ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-md'
                  : 'bg-black/60 text-slate-300 border-white/20 hover:text-white hover:border-white/40'
              }`}
            >
              <Star className={`w-3 h-3 ${video.isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bottom Time Overlay */}
        <div className="absolute bottom-2 right-2.5 z-10">
          <span className="px-1.5 py-0.2 text-[10px] font-mono bg-black/85 text-white border border-white/20 shadow-md font-bold">
            {displayDuration}
          </span>
        </div>
      </div>

      {/* Title & Metadata Card Footer */}
      <div className="p-3 bg-surface-elevated/70 flex flex-col justify-between flex-1 border-t border-white/[0.08]">
        <div className="min-w-0">
          <h4
            onClick={handleOpenPlayer}
            className="font-mono font-bold text-xs text-white truncate max-w-full group-hover:text-accent-cyan transition-colors"
            title={video.name}
          >
            {video.name}
          </h4>

          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {video.smartTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-mono px-1.5 py-0.2 bg-white/[0.06] text-slate-300 border border-white/[0.08] font-medium whitespace-nowrap"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-slate-400">
          <span>{formatFileSize(video.size)}</span>
          <button
            onClick={handleContextMenu}
            className="p-0.5 text-slate-400 hover:text-white transition-colors"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
