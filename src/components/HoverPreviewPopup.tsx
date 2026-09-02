import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, FastForward, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { VideoItem } from '../types/video';
import { formatDuration, formatFileSize } from '../utils/formatters';
import { getCachedThumbnail, generatePdfThumbnail } from '../utils/thumbnailGenerator';
import { loadPdfDocument } from '../utils/pdfRenderer';

interface HoverPreviewPopupProps {
  data: {
    video: VideoItem;
    rect: DOMRect;
  } | null;
  onOpenWorkstation: (video: VideoItem) => void;
  onClose?: () => void;
}

export const HoverPreviewPopup: React.FC<HoverPreviewPopupProps> = ({ data, onOpenWorkstation, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRenderTaskRef = useRef<any>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pdfThumbnail, setPdfThumbnail] = useState<string | null>(null);

  // PDF Preview states
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);

  const video = data?.video;
  const isPdf = Boolean(video?.isPdf || video?.extension?.toLowerCase() === '.pdf');

  // PDF render page helper
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
      const targetW = 360 * (window.devicePixelRatio || 1);
      const targetH = 200 * (window.devicePixelRatio || 1);
      const scale = Math.min(targetW / vp.width, targetH / vp.height);
      const viewport = page.getViewport({ scale: Math.max(0.4, scale) });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const task = page.render({ canvasContext: ctx, canvas, viewport });
      pdfRenderTaskRef.current = task;
      await task.promise;
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!video) return;

    if (isPdf) {
      const source = video.streamUrl || video.path;
      const cached = getCachedThumbnail(source);
      if (cached) {
        setPdfThumbnail(cached);
      } else {
        generatePdfThumbnail(source, video.id || video.name)
          .then(thumb => { if (thumb) setPdfThumbnail(thumb); })
          .catch(() => {});
      }

      let isMounted = true;
      let cycleTimer: any = null;

      loadPdfDocument(source)
        .then((doc) => {
          if (!isMounted) return;
          setPdfDoc(doc);
          setPdfNumPages(doc.numPages);
          renderPdfPage(doc, 1);

          if (doc.numPages > 1) {
            cycleTimer = setInterval(() => {
              setPdfPage((prev) => {
                const next = (prev % doc.numPages) + 1;
                renderPdfPage(doc, next);
                return next;
              });
            }, 800);
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
        if (cycleTimer) clearInterval(cycleTimer);
        if (pdfRenderTaskRef.current) {
          try { pdfRenderTaskRef.current.cancel(); } catch (_) {}
        }
      };
    }

    let active = true;
    const vid = videoRef.current;
    if (vid) {
      vid.muted = true;
      vid.defaultMuted = true;
      vid.playbackRate = 2.0;
      vid.defaultPlaybackRate = 2.0;

      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (active) setIsPlaying(true);
          })
          .catch(() => {
            if (active && vid) {
              vid.muted = true;
              vid.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          });
      }
    }

    return () => {
      active = false;
      setIsPlaying(false);
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (e) {}
      }
    };
  }, [video, isPdf, renderPdfPage]);

  if (!data || !video) return null;

  const { rect } = data;

  // Calculate smart screen position so preview never overflows viewport
  const popupWidth = 360;
  const popupHeight = 270;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = rect.left + (rect.width / 2) - (popupWidth / 2);
  let top = rect.top - popupHeight - 16;

  // Check top overflow
  if (top < 70) {
    top = rect.bottom + 16;
  }
  // Check left/right overflow
  if (left < 16) {
    left = 16;
  } else if (left + popupWidth > viewportWidth - 16) {
    left = viewportWidth - popupWidth - 16;
  }
  // Check bottom overflow
  if (top + popupHeight > viewportHeight - 16) {
    top = Math.max(70, viewportHeight - popupHeight - 16);
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && duration === 0) {
        setDuration(videoRef.current.duration);
      }
      if (!isPlaying) setIsPlaying(true);
    }
  };

  const handleScrubberSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    if (isPdf) {
      if (!pdfDoc || pdfNumPages <= 0) return;
      const target = Math.max(1, Math.min(pdfNumPages, Math.floor(pos * pdfNumPages) + 1));
      setPdfPage(target);
      renderPdfPage(pdfDoc, target);
    } else {
      if (videoRef.current && duration > 0) {
        videoRef.current.currentTime = pos * duration;
        setCurrentTime(pos * duration);
      }
    }
  };

  const progressPercent = isPdf
    ? (pdfNumPages > 0 ? (pdfPage / pdfNumPages) * 100 : 0)
    : (duration > 0 ? (currentTime / duration) * 100 : 0);

  return (
    <div
      className="fixed z-50 pointer-events-auto select-none transition-all duration-200"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${popupWidth}px`,
      }}
      onMouseLeave={onClose}
      onDoubleClick={() => onOpenWorkstation(video)}
    >
      {/* 3D Depth-of-Field Container */}
      <div className="relative rounded-2xl overflow-hidden glass-panel-elevated border-2 border-accent/60 shadow-dof-float transform transition-transform duration-300 hover:scale-[1.03]">
        {/* Media Container */}
        <div className="relative aspect-video w-full bg-black/90 overflow-hidden flex items-center justify-center">
          {isPdf ? (
            <>
              {pdfThumbnail || video.thumbnail ? (
                <img
                  src={pdfThumbnail || video.thumbnail}
                  alt={video.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-950/50 via-slate-900 to-black text-red-400">
                  <FileText className="w-10 h-10 mb-2 stroke-[1.2]" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-red-300">PDF Document</span>
                </div>
              )}
              {/* Active PDF canvas */}
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/90">
                <canvas ref={pdfCanvasRef} className="w-full h-full object-contain" />
              </div>
            </>
          ) : (
            <>
              {video.thumbnail && (
                <img
                  src={video.thumbnail}
                  alt={video.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <video
                ref={videoRef}
                src={video.streamUrl}
                muted
                loop
                playsInline
                onTimeUpdate={handleTimeUpdate}
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  isPlaying ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </>
          )}

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20">
            {isPdf ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/90 text-white text-[10px] font-mono font-light shadow-sm">
                <FileText className="w-3 h-3" /> {pdfNumPages > 0 ? `Pg ${pdfPage}/${pdfNumPages}` : 'PDF DOCUMENT'}
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-magenta/90 text-white text-[10px] font-mono font-light shadow-glow-magenta animate-pulse">
                <FastForward className="w-3 h-3 fill-current" /> 2.0x PREVIEW
              </span>
            )}
            {video.hdr && !isPdf && (
              <span className="px-1.5 py-0.5 rounded-md bg-accent-cyan/90 text-slate-950 text-[9px] font-mono font-light">
                HDR
              </span>
            )}
          </div>

          <div className="absolute top-2.5 right-2.5 z-20">
            <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-white text-[10px] font-mono font-light">
              {isPdf ? `${pdfNumPages || '...'} Pgs` : video.resolution}
            </span>
          </div>

          {/* Quick Double-Click Hint Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3 pointer-events-none">
            <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span className="text-white font-light truncate max-w-[200px]">{video.cleanTitle || video.name}</span>
              {isPdf ? (
                <span className="text-accent-cyan font-light">
                  {pdfNumPages > 0 ? `Page ${pdfPage} of ${pdfNumPages}` : 'PDF'}
                </span>
              ) : (
                <span className="text-accent-neon font-light">
                  {formatDuration(currentTime)} / {formatDuration(duration || video.duration)}
                </span>
              )}
            </div>
          </div>

          {/* Live Progress Scrubber (Video & PDF) */}
          <div
            onClick={handleScrubberSeek}
            className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 z-30 cursor-ew-resize hover:h-2.5 transition-all"
          >
            <div
              className="h-full bg-gradient-to-r from-accent via-accent-cyan to-accent-neon transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Info & Action Bar */}
        <div className="p-3 bg-surface-elevated/90 backdrop-blur-md flex items-center justify-between text-xs border-t border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px] font-light">{formatFileSize(video.size)}</span>
            {video.codec && !isPdf && (
              <span className="text-[10px] font-mono text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded font-light">
                {video.codec}
              </span>
            )}
          </div>

          <button
            onClick={() => onOpenWorkstation(video)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent hover:bg-accent-hover text-white text-[11px] font-light shadow-glow-accent transition-all"
          >
            {isPdf ? (
              <>
                <FileText className="w-3 h-3" /> Open Reader
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" /> Open Player
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

