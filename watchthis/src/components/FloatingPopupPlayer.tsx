import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Move,
  FastForward,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { VideoItem, ThemeMode } from '../types/video';
import { formatDuration } from '../utils/formatters';
import { loadPdfDocument } from '../utils/pdfRenderer';

interface FloatingPopupPlayerProps {
  video: VideoItem;
  originRect?: DOMRect;
  theme: ThemeMode;
  onClose: () => void;
  onOpenWorkstation: (video: VideoItem) => void;
}

export const FloatingPopupPlayer: React.FC<FloatingPopupPlayerProps> = ({
  video,
  originRect,
  theme,
  onClose,
  onOpenWorkstation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRenderTaskRef = useRef<any>(null);

  const isPdf = Boolean(video.isPdf || video.extension?.toLowerCase() === '.pdf');

  // Position and Dimension
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (originRect) {
      return { x: originRect.left, y: originRect.top };
    }
    return { x: window.innerWidth - 380, y: window.innerHeight - 250 };
  });

  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    if (originRect) {
      return { width: Math.max(320, originRect.width), height: Math.max(190, originRect.height) };
    }
    return { width: 360, height: 210 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSnapping, setIsSnapping] = useState(false);
  const [isEntered, setIsEntered] = useState(false);

  // Video / PDF playback states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [speed, setSpeed] = useState(1);

  // PDF Document states
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [pdfPage, setPdfPage] = useState<number>(1);

  const isNeon = theme === 'neon';

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEntered(true);
      if (originRect) {
        setPosition({
          x: Math.max(20, window.innerWidth - 400),
          y: Math.max(20, window.innerHeight - 260)
        });
        setSize({ width: 380, height: 220 });
      }
    }, 20);
    return () => clearTimeout(timer);
  }, [originRect]);

  // Dragging logic
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Resizing logic
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(10, Math.min(window.innerWidth - size.width - 10, e.clientX - dragOffset.x));
        const newY = Math.max(10, Math.min(window.innerHeight - size.height - 10, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });

        // Detect snap-back zone if originRect is present
        if (originRect) {
          const dist = Math.hypot(newX - originRect.left, newY - originRect.top);
          if (dist < 60) {
            triggerSnapBack();
          }
        }
      } else if (isResizing) {
        const newW = Math.max(260, Math.min(850, e.clientX - position.x));
        const newH = Math.max(160, Math.min(600, e.clientY - position.y));
        setSize({ width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, size, position, originRect]);

  // Snap-Back Animation
  const triggerSnapBack = () => {
    if (originRect && !isSnapping) {
      setIsSnapping(true);
      setPosition({ x: originRect.left, y: originRect.top });
      setSize({ width: originRect.width || 300, height: originRect.height || 200 });
      setTimeout(() => {
        onClose();
      }, 250);
    } else {
      onClose();
    }
  };

  // PDF Page Render Helper
  const renderPdfPage = useCallback(async (doc: any, pageNo: number) => {
    const canvas = pdfCanvasRef.current;
    if (!canvas || !doc) return;

    if (pdfRenderTaskRef.current) {
      try { pdfRenderTaskRef.current.cancel(); } catch (_) {}
      pdfRenderTaskRef.current = null;
    }

    try {
      const page = await doc.getPage(pageNo);
      const vp = page.getViewport({ scale: 1.0 });
      const targetW = size.width * (window.devicePixelRatio || 1);
      const targetH = size.height * (window.devicePixelRatio || 1);
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
  }, [size.width, size.height]);

  // Load PDF & Auto-flip interval
  useEffect(() => {
    if (!isPdf) return;
    let isMounted = true;

    loadPdfDocument(video.streamUrl || video.path)
      .then((doc) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setPdfNumPages(doc.numPages);
        renderPdfPage(doc, pdfPage);
      })
      .catch((err) => {
        console.warn('[PDF Popup Load Error]', err);
      });

    return () => {
      isMounted = false;
      if (pdfRenderTaskRef.current) {
        try { pdfRenderTaskRef.current.cancel(); } catch (_) {}
      }
    };
  }, [isPdf, video.streamUrl, video.path]);

  // Handle page render whenever page or size changes
  useEffect(() => {
    if (isPdf && pdfDoc) {
      renderPdfPage(pdfDoc, pdfPage);
    }
  }, [isPdf, pdfDoc, pdfPage, size.width, size.height, renderPdfPage]);

  // PDF Auto-Play Timer
  useEffect(() => {
    if (!isPdf || !isPlaying || !pdfDoc || pdfNumPages <= 1) return;
    const intervalMs = Math.max(250, Math.floor(1500 / speed));
    const timer = setInterval(() => {
      setPdfPage((prev) => (prev % pdfNumPages) + 1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPdf, isPlaying, pdfDoc, pdfNumPages, speed]);

  // Cycle speed (0.1x -> 0.2x -> ... -> 5x)
  const cycleSpeed = () => {
    const speeds = [0.1, 0.2, 0.3, 0.5, 0.6, 0.8, 1, 2, 3, 4, 5];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const togglePlay = () => {
    if (isPdf) {
      setIsPlaying((prev) => !prev);
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && duration === 0) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (isPdf) {
      if (!pdfDoc || pdfNumPages <= 0) return;
      const target = Math.max(1, Math.min(pdfNumPages, Math.floor(pos * pdfNumPages) + 1));
      setPdfPage(target);
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
      ref={containerRef}
      onMouseDown={handleMouseDownDrag}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transition: isSnapping ? 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : isEntered ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
      }}
      className={`fixed z-[150] overflow-hidden shadow-2xl select-none group cursor-move bg-black ${
        isNeon 
          ? 'border border-accent-cyan/60 shadow-[0_0_18px_rgba(0,240,255,0.25)]' 
          : 'border border-white/25 shadow-[0_0_16px_rgba(255,255,255,0.1)]'
      } ${isEntered ? '' : 'scale-90 opacity-0'}`}
    >
      {/* 1. Full Media Canvas - Edge-to-Edge and Titleless */}
      <div 
        onClick={togglePlay}
        className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center cursor-pointer"
      >
        {isPdf ? (
          <div className="w-full h-full flex items-center justify-center bg-black/90">
            <canvas ref={pdfCanvasRef} className="w-full h-full object-contain" />
          </div>
        ) : (
          <video
            ref={videoRef}
            src={video.streamUrl}
            autoPlay
            muted={isMuted}
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.playbackRate = speed;
                if (videoRef.current.duration) setDuration(videoRef.current.duration);
              }
            }}
            className="w-full h-full object-cover"
          />
        )}

        {/* 2. Top Floating Controls Bar (Appears on Hover, Titleless) */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 right-2 flex items-center justify-between z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          {/* Left: Drag Handle & Speed Pill */}
          <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md px-2 py-0.5 border border-white/15">
            <Move className="w-3 h-3 text-slate-400 cursor-move" />
            <button
              onClick={cycleSpeed}
              title={isPdf ? "Cycle Auto Page-Flip Rate (1x-5x)" : "Cycle Speed (1x-5x)"}
              className="px-1.5 py-0.2 bg-white/10 hover:bg-accent hover:text-white text-[9px] font-mono text-accent-cyan font-semibold transition-colors"
            >
              {speed}x
            </button>
          </div>

          {/* Right: Snap-Back, Expand, Close */}
          <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md px-1.5 py-0.5 border border-white/15">
            {/* Snap-Back */}
            <button
              onClick={triggerSnapBack}
              title="Snap back to dashboard"
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Minimize2 className="w-3 h-3" />
            </button>

            {/* Expand to Full Workstation */}
            <button
              onClick={() => {
                onClose();
                onOpenWorkstation(video);
              }}
              title={isPdf ? "Open Full PDF Reader" : "Open Full Player"}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title="Close popup"
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 3. Center Play/Pause Overlay Indicator on Hover */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-accent/90 text-white flex items-center justify-center shadow-lg">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </div>
        </div>

        {/* 4. Bottom Floating Time & Audio / Navigation Bar on Hover */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 left-2 right-2 px-2.5 py-1 bg-black/85 backdrop-blur-md border border-white/15 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs z-30"
        >
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="text-slate-300 hover:text-white p-0.5 transition-colors"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            </button>


            {isPdf ? (
              <>
                <button
                  onClick={() => setPdfPage(p => Math.max(1, p - 1))}
                  disabled={pdfPage <= 1}
                  className="p-0.5 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setPdfPage(p => Math.min(pdfNumPages || 1, p + 1))}
                  disabled={pdfPage >= pdfNumPages}
                  className="p-0.5 text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono text-slate-300 font-light">
                  Pg {pdfPage} / {pdfNumPages || '...'}
                </span>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className="text-slate-300 hover:text-white p-0.5 rounded transition-colors"
                >
                  {isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3" />}
                </button>
                <span className="text-[10px] font-mono text-slate-300 font-light">
                  {formatDuration(currentTime)} / {formatDuration(duration || video.duration)}
                </span>
              </>
            )}
          </div>

          <span className="text-[9px] font-mono text-accent-neon font-light">
            {isPdf ? 'PDF POPUP' : 'POPUP'}
          </span>
        </div>

        {/* 5. Glowing Bottom Timeline Scrubber */}
        <div 
          onClick={handleScrubberClick}
          className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 z-20 cursor-ew-resize hover:h-2.5 transition-all"
        >
          <div
            className="h-full bg-gradient-to-r from-accent via-accent-cyan to-accent-neon transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 6. Subtle Resizing Handle Corner */}
      <div
        onMouseDown={handleMouseDownResize}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center text-accent-cyan hover:text-white z-40 opacity-70 group-hover:opacity-100"
      >
        <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-current" />
      </div>
    </div>
  );
};

