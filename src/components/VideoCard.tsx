import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { Film, FastForward, Star, MoreVertical, FileText } from 'lucide-react';
import { VideoItem, ViewMode } from '../types/video';
import { useLibrary } from '../context/LibraryContext';
import { formatDuration, formatFileSize } from '../utils/formatters';
import { getCachedThumbnail, generateVideoThumbnail, generatePdfThumbnail } from '../utils/thumbnailGenerator';
import { loadPdfDocument } from '../utils/pdfRenderer';

interface VideoCardProps {
  video: VideoItem;
  viewMode: ViewMode;
}

const VideoCardComponent: React.FC<VideoCardProps> = ({ video, viewMode }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRenderTaskRef = useRef<any>(null);
  const isHoveredRef = useRef(false);

  const [isHovered, setIsHovered] = useState(false);
  const [isActuallyPlaying, setIsActuallyPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(() =>
    video.streamUrl ? (getCachedThumbnail(video.streamUrl) || null) : null
  );

  // PDF Preview State
  const isPdf = Boolean(video.isPdf || video.extension?.toLowerCase() === '.pdf');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [pdfPage, setPdfPage] = useState<number>(1);

  const { setActivePlayingVideo, toggleFavorite, previewSpeed, cyclePreviewSpeed, setContextMenu, theme, openInNewTab } = useLibrary();
  const isNeon = theme === 'neon';

  // Synchronize thumbnail if streamUrl changes
  useEffect(() => {
    setHasVideoError(false);
    if (video.streamUrl) {
      const cached = getCachedThumbnail(video.streamUrl);
      if (cached) setGeneratedThumbnail(cached);
    }
  }, [video.id, video.streamUrl]);

  // Fast asynchronous / IndexedDB thumbnail loader with IntersectionObserver
  useEffect(() => {
    if (video.thumbnail) return;

    const cached = getCachedThumbnail(video.streamUrl);
    if (cached) {
      setGeneratedThumbnail(cached);
      return;
    }

    let isMounted = true;
    let observer: IntersectionObserver | null = null;

    const loadThumbnail = async () => {
      try {
        const source = video.streamUrl || video.path;
        const dataUrl = isPdf
          ? await generatePdfThumbnail(source, video.id || video.name)
          : await generateVideoThumbnail(
              video.streamUrl,
              video.id || video.name,
              duration || video.duration
            );
        if (isMounted && dataUrl) {
          setGeneratedThumbnail(dataUrl);
        }
      } catch (_) {}
    };

    const el = cardRef.current;
    if (el && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          loadThumbnail();
          observer?.disconnect();
        }
      }, { rootMargin: '300px' });
      observer.observe(el);
    } else {
      loadThumbnail();
    }

    return () => {
      isMounted = false;
      if (observer) observer.disconnect();
    };
  }, [video.streamUrl, video.id, video.name, video.thumbnail, isPdf, duration, video.duration]);

  const effectiveThumbnail = video.thumbnail || generatedThumbnail;

  // ── High-Speed Instant Video Preview on Hover ──
  useEffect(() => {
    isHoveredRef.current = isHovered;
    if (isPdf) return;
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
  }, [isHovered, previewSpeed, isPdf, hasVideoError]);

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
      if (err?.name !== 'RenderingCancelledException' && !err?.message?.includes('cancelled')) {
        // Silently handled
      }
    }
  }, []);

  // ── High-Speed Instant PDF Hover Preview & Auto Page Cycling ──
  useEffect(() => {
    if (!isPdf) return;
    let isMounted = true;
    let cycleTimer: any = null;

    if (isHovered) {
      const source = video.streamUrl || video.path;
      loadPdfDocument(source)
        .then((doc) => {
          if (!isMounted) return;
          setPdfDoc(doc);
          setPdfNumPages(doc.numPages);
          // Render initial page
          renderPdfPage(doc, 1);

          // If document has multiple pages, start auto-flip cycle
          if (doc.numPages > 1) {
            const intervalMs = Math.max(200, Math.floor(1000 / previewSpeed));
            cycleTimer = setInterval(() => {
              setPdfPage((prevPage) => {
                const nextPage = (prevPage % doc.numPages) + 1;
                renderPdfPage(doc, nextPage);
                return nextPage;
              });
            }, intervalMs);
          }
        })
        .catch((err) => {
          console.warn('[PDF Preview Load Error]', err);
        });
    } else {
      if (pdfRenderTaskRef.current) {
        try {
          pdfRenderTaskRef.current.cancel();
        } catch (_) {}
        pdfRenderTaskRef.current = null;
      }
      setPdfPage(1);
    }

    return () => {
      isMounted = false;
      if (cycleTimer) clearInterval(cycleTimer);
      if (pdfRenderTaskRef.current) {
        try {
          pdfRenderTaskRef.current.cancel();
        } catch (_) {}
      }
    };
  }, [isHovered, isPdf, video.streamUrl, video.path, previewSpeed, renderPdfPage]);

  // ── Fallback Canvas Waveform for Unsupported Video Codecs ──
  useEffect(() => {
    if (!hasVideoError || !isHovered || isPdf) return;
    let animId: number;
    let frame = 0;
    const canvas = fallbackCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      frame += 0.05 * previewSpeed;
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const bars = 24;
      const bw = canvas.width / bars;
      for (let i = 0; i < bars; i++) {
        const h = Math.abs(Math.sin(frame + i * 0.3)) * (canvas.height * 0.7);
        const y = (canvas.height - h) / 2;
        ctx.fillStyle = isNeon ? `hsl(${180 + i * 5}, 100%, 65%)` : `rgba(255,255,255,0.7)`;
        ctx.fillRect(i * bw + 2, y, bw - 4, h);
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [hasVideoError, isHovered, isPdf, previewSpeed, isNeon]);

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (vid) {
      setCurrentTime(vid.currentTime);
      if (vid.duration && duration === 0) setDuration(vid.duration);
      if (!isActuallyPlaying && isHovered) {
        setIsActuallyPlaying(true);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, video });
  };

  const handleOpenPlayer = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    openInNewTab(video, true);
    setActivePlayingVideo(video);
  };

  // Interactive scrubber seek on hover (Works for Video & PDF)
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (isPdf) {
      if (!pdfDoc || pdfNumPages <= 0) return;
      const targetPage = Math.max(1, Math.min(pdfNumPages, Math.floor(pos * pdfNumPages) + 1));
      setPdfPage(targetPage);
      renderPdfPage(pdfDoc, targetPage);
    } else {
      const vid = videoRef.current;
      if (!vid || duration <= 0) return;
      vid.currentTime = pos * duration;
      setCurrentTime(pos * duration);
    }
  };

  const progressPercent = isPdf
    ? (pdfNumPages > 0 ? (pdfPage / pdfNumPages) * 100 : 0)
    : (duration > 0 ? (currentTime / duration) * 100 : 0);

  const displayDuration = isPdf
    ? (isHovered && pdfNumPages > 0 ? `Pg ${pdfPage}/${pdfNumPages}` : pdfNumPages > 0 ? `${pdfNumPages} Pgs` : 'PDF')
    : duration > 0 ? formatDuration(duration) : video.duration > 0 ? formatDuration(video.duration) : '--:--';

  // Dynamic Badge Color Calculator
  const getBadgeStyle = () => {
    if (isPdf) return 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-400/40 shadow-sm';
    if (video.resolution.includes('4K')) return 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold border-amber-300 shadow-sm';
    if (video.resolution.includes('1080p')) return 'bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-bold border-cyan-300 shadow-sm';
    return 'bg-black/70 border-white/20 text-white';
  };

  // ── Video Preview Element ──
  const videoEl = !isPdf && (
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
        className={`absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-200 ${
          isActuallyPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
    ) : (
      <canvas
        ref={fallbackCanvasRef}
        width={320}
        height={180}
        className={`absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
    )
  );

  // ── PDF Live Preview Element ──
  const pdfEl = isPdf && (
    <div
      className={`absolute inset-0 w-full h-full z-20 transition-opacity duration-200 flex items-center justify-center bg-black/90 ${
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
        className={`group relative flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none font-sans ${
          isNeon
            ? 'bg-surface-elevated/60 hover:bg-surface-elevated border-white/[0.08] hover:border-accent/50 hover:shadow-glow-accent'
            : 'bg-[#101420]/75 hover:bg-[#151a2a] border-white/[0.06] hover:border-white/25'
        }`}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            onClick={handleOpenPlayer}
            className="relative w-28 h-16 rounded-xl bg-black overflow-hidden flex-shrink-0 border border-white/15 flex items-center justify-center cursor-pointer shadow-md"
          >
            {/* Live Hover Preview Layer (Video or PDF) */}
            {isPdf ? pdfEl : videoEl}

            {/* Thumbnail Poster Layer */}
            {effectiveThumbnail ? (
              <img src={effectiveThumbnail} alt={video.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : isPdf ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-950/50 via-slate-900 to-black">
                <FileText className="w-7 h-7 text-red-400" />
              </div>
            ) : (
              <Film className="w-6 h-6 text-slate-500" />
            )}

            {/* Interactive Timeline Scrubber on Hover */}
            {isHovered && (
              <div
                onClick={handleScrubberClick}
                className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/25 z-30 cursor-ew-resize"
              >
                <div className="h-full bg-gradient-to-r from-accent to-accent-cyan duration-75 shadow-sm" style={{ width: `${progressPercent}%` }} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2.5">
              <p className="text-sm font-medium text-white truncate max-w-xl group-hover:text-accent-cyan transition-colors" title={video.name}>
                {video.name}
              </p>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${getBadgeStyle()}`}>
                {isPdf ? (isHovered && pdfNumPages > 0 ? `Pg ${pdfPage}/${pdfNumPages}` : 'PDF') : video.resolution}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
              {video.smartTags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 font-medium border border-white/[0.05]">
                  #{tag}
                </span>
              ))}
              <span className="text-xs font-mono text-slate-400 ml-1">
                &bull; {formatFileSize(video.size)} &bull; {displayDuration}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              cyclePreviewSpeed();
            }}
            title="Preview Speed / Page Flip Rate"
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-accent hover:text-white text-xs font-mono text-accent-cyan font-medium transition-colors"
          >
            {previewSpeed}x
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(video.id);
            }}
            className={`p-2 rounded-xl transition-all ${video.isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-500 hover:text-slate-200 hover:bg-white/10'}`}
          >
            <Star className={`w-4 h-4 ${video.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button onClick={handleContextMenu} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <MoreVertical className="w-4 h-4" />
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
      className={`group relative rounded-2xl overflow-hidden glass-panel dof-card cursor-pointer border shadow-lg flex flex-col justify-between select-none font-sans min-h-[230px] ${
        isNeon ? 'border-white/[0.08] hover:border-accent/60' : 'border-white/[0.06] hover:border-white/25'
      }`}
    >
      {/* Live Hover Layer (Video or PDF) */}
      {isPdf ? pdfEl : videoEl}

      {/* Speed badge (Video and PDF preview on hover) */}
      {isHovered && (
        <div className="absolute top-3 left-3 z-30 animate-in fade-in duration-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              cyclePreviewSpeed();
            }}
            title={isPdf ? "Cycle Page Flip Speed (1x-5x)" : "Cycle Video Preview Speed"}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-accent-cyan/50 text-accent-neon text-xs font-mono font-medium hover:bg-accent hover:text-white transition-colors shadow-lg"
          >
            <FastForward className="w-3 h-3 fill-current" />
            <span>{previewSpeed}x</span>
          </button>
        </div>
      )}

      {/* Interactive Live Progress Scrubber (Video and PDF on hover) */}
      {isHovered && (
        <div
          onClick={handleScrubberClick}
          className="absolute bottom-0 left-0 right-0 h-2 bg-white/20 z-30 cursor-ew-resize hover:h-3 transition-all"
        >
          <div
            className="h-full bg-gradient-to-r from-accent via-accent-cyan to-accent-neon transition-all duration-75 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Thumbnail / Poster Area */}
      <div
        onClick={handleOpenPlayer}
        className={`relative w-full bg-slate-950 overflow-hidden ${viewMode === 'poster' ? 'aspect-[16/11]' : 'aspect-video'}`}
      >
        {effectiveThumbnail ? (
          <img
            src={effectiveThumbnail}
            alt={video.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-950/50 via-slate-900 to-black text-red-400">
            <FileText className="w-10 h-10 mb-2 stroke-[1.5]" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-red-300">PDF Document</span>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-elevated via-slate-900 to-black text-slate-500">
            <Film className="w-9 h-9 mb-2 stroke-[1.5]" />
          </div>
        )}

        {/* Ambient Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono uppercase tracking-wider backdrop-blur-md border shadow-md font-semibold ${getBadgeStyle()}`}
          >
            {isPdf ? (isHovered && pdfNumPages > 0 ? `Pg ${pdfPage}/${pdfNumPages}` : 'PDF') : video.resolution}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(video.id);
            }}
            className={`p-2 rounded-full backdrop-blur-md transition-all active:scale-90 shadow-md ${
              video.isFavorite ? 'bg-yellow-400 text-slate-950 shadow-glow-amber' : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${video.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Bottom Details Badges */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs font-mono z-10">
          <span className="bg-black/80 px-2.5 py-0.5 rounded-lg backdrop-blur-md border border-white/15 text-slate-200 font-medium">
            {displayDuration}
          </span>
          <span className="bg-black/80 px-2.5 py-0.5 rounded-lg backdrop-blur-md border border-white/15 text-slate-300 font-medium">
            {formatFileSize(video.size)}
          </span>
        </div>
      </div>

      {/* Info Card Body */}
      <div onClick={handleOpenPlayer} className="p-3.5 bg-surface/95 flex-1 flex flex-col justify-between border-t border-white/[0.06]">
        <p className="font-sans font-medium text-xs text-white leading-snug break-all line-clamp-2 group-hover:text-accent-cyan transition-colors" title={video.name}>
          {video.name}
        </p>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 overflow-hidden flex-wrap max-h-6">
            {video.smartTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-elevated text-slate-300 border border-white/[0.06] font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
          {video.codec && !isPdf && (
            <span className="text-[10px] font-mono text-accent-cyan bg-accent/15 px-2 py-0.5 rounded-md border border-accent/25 flex-shrink-0 font-medium">
              {video.codec}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const VideoCard = memo(VideoCardComponent);

