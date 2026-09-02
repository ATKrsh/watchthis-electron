import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize, 
  RotateCw, 
  X, 
  Layers,
  ExternalLink,
  FolderSearch,
  Loader2,
  AlertCircle,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { VideoItem } from '../types/video';
import { formatFileSize } from '../utils/formatters';
import { loadPdfDocument, renderPdfPageToCanvasWithTask } from '../utils/pdfRenderer';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PdfReaderModalProps {
  video: VideoItem;
  onClose: () => void;
}

// Renders a single page as a small thumbnail — no text, just the page image
const PageThumbnailCanvas: React.FC<{
  pdfDoc: PDFDocumentProxy;
  pageNo: number;
}> = ({ pdfDoc, pageNo }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !pdfDoc) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNo);
        if (cancelled || !canvasRef.current) return;

        // Small scale for thumbnail — fast and lightweight
        const vp = page.getViewport({ scale: 0.28 });
        canvasRef.current.width = Math.floor(vp.width);
        canvasRef.current.height = Math.floor(vp.height);
        const ctx = canvasRef.current.getContext('2d', { alpha: false });
        if (!ctx || cancelled) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        const task = page.render({ canvasContext: ctx, canvas: canvasRef.current, viewport: vp });
        await task.promise;
      } catch (e) {
        // silently ignore — thumbnail stays blank white if PDF page can't render
      }
    })();

    return () => { cancelled = true; };
  }, [pdfDoc, pageNo]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-contain"
      style={{ background: 'white' }}
    />
  );
};

export const PdfReaderModal: React.FC<PdfReaderModalProps> = ({ video, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeRenderRef = useRef<{ cancel: () => void } | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<'fit-width' | 'fit-height' | 'custom'>('fit-width');
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState('1');
  const [showFsHint, setShowFsHint] = useState(false);

  // Load PDF
  const loadPdf = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let doc: PDFDocumentProxy | null = null;

      // 1. Direct local file buffer loading in Electron
      if (typeof window !== 'undefined' && window.electronAPI?.readPdfBuffer && video.path) {
        try {
          const buffer = await window.electronAPI.readPdfBuffer(video.path);
          if (buffer && (buffer as any).byteLength > 0) {
            doc = await loadPdfDocument(buffer);
          }
        } catch (bufErr) {
          console.warn('[PDF Modal] readPdfBuffer fallback to streamUrl:', bufErr);
        }
      }

      // 2. Stream URL fetch fallback
      if (!doc) {
        doc = await loadPdfDocument(video.streamUrl || video.path);
      }

      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setIsLoading(false);
    } catch (err: any) {
      console.error('[PDF Load Error]', err);
      setErrorMessage(err.message || 'Failed to load PDF document');
      setIsLoading(false);
    }
  }, [video]);

  useEffect(() => { loadPdf(); }, [loadPdf]);

  // Render current page — canvas is always in DOM so ref is always valid
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !mainCanvasRef.current) return;

    if (activeRenderRef.current) {
      activeRenderRef.current.cancel();
      activeRenderRef.current = null;
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
      let calculatedScale = zoom / 100;

      if (fitMode === 'fit-width' && scrollContainerRef.current) {
        const sidebarW = isFullscreen ? 0 : (showThumbnails ? 240 : 0);
        const containerW = scrollContainerRef.current.clientWidth - sidebarW - (isFullscreen ? 0 : 48);
        calculatedScale = Math.max(0.4, (containerW / unscaledViewport.width) * (zoom / 100));
      } else if (fitMode === 'fit-height' && scrollContainerRef.current) {
        const containerH = scrollContainerRef.current.clientHeight - (isFullscreen ? 0 : 48);
        calculatedScale = Math.max(0.4, (containerH / unscaledViewport.height) * (zoom / 100));
      }

      const task = renderPdfPageToCanvasWithTask(pdfDoc, currentPage, mainCanvasRef.current, calculatedScale, rotation);
      activeRenderRef.current = task;
      await task.promise;
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException' && !e?.message?.includes('cancelled')) {
        console.warn('[PDF Page Render Error]', e);
      }
    }
  }, [pdfDoc, currentPage, zoom, rotation, fitMode, showThumbnails, isFullscreen]);

  useEffect(() => {
    renderCurrentPage();
    setPageInput(currentPage.toString());
    return () => {
      if (activeRenderRef.current) { activeRenderRef.current.cancel(); activeRenderRef.current = null; }
    };
  }, [renderCurrentPage, currentPage]);

  const goToPrevPage = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), []);
  const goToNextPage = useCallback(() => setCurrentPage(p => Math.min(numPages, p + 1)), [numPages]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      setCurrentPage(parsed);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setShowFsHint(true);
        setTimeout(() => setShowFsHint(false), 3000);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Keyboard + scroll wheel navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goToPrevPage(); }
      else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); goToNextPage(); }
      else if (e.key === 'Home') { e.preventDefault(); setCurrentPage(1); }
      else if (e.key === 'End') { e.preventDefault(); setCurrentPage(numPages); }
      else if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFullscreen(); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); setFitMode('custom'); setZoom(z => Math.min(300, z + 15)); }
      else if (e.key === '-') { e.preventDefault(); setFitMode('custom'); setZoom(z => Math.max(40, z - 15)); }
      else if (e.key.toLowerCase() === 'r') { e.preventDefault(); setRotation(r => (r + 90) % 360); }
      else if (e.key === 'Escape') {
        if (isFullscreen) document.exitFullscreen().catch(() => {});
        else onClose();
      }
    };

    // Scroll wheel always cycles pages
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) goToNextPage();
      else if (e.deltaY < 0) goToPrevPage();
    };

    window.addEventListener('keydown', handleKeyDown);
    const el = containerRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (el) el.removeEventListener('wheel', handleWheel);
    };
  }, [numPages, goToPrevPage, goToNextPage, isFullscreen, onClose, toggleFullscreen]);

  const handleOpenExternal = async () => {
    if (window.electronAPI?.openExternal && video.path) await window.electronAPI.openExternal(video.path);
    else window.open(video.streamUrl, '_blank');
  };

  const handleReveal = async () => {
    if (window.electronAPI?.revealInExplorer && video.path) await window.electronAPI.revealInExplorer(video.path);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[160] flex flex-col overflow-hidden select-none font-sans"
      style={{ background: isFullscreen ? '#000' : '#07090e' }}
    >
      {/* ── FULLSCREEN HINT OVERLAY ── fades after 3s */}
      {isFullscreen && showFsHint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none animate-in fade-in duration-300">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-light">
            <span>Scroll to cycle pages</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-accent-cyan">ESC to exit fullscreen</span>
          </div>
        </div>
      )}

      {/* ── PAGE COUNTER (fullscreen only) ── */}
      {isFullscreen && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono font-light">
            {currentPage} / {numPages}
          </div>
        </div>
      )}

      {/* ── FULLSCREEN NAVIGATION CLICK ZONES ── */}
      {isFullscreen && (
        <>
          <button onClick={goToPrevPage} disabled={currentPage <= 1}
            className="absolute left-0 top-0 w-16 h-full z-[190] opacity-0 hover:opacity-100 flex items-center justify-center bg-gradient-to-r from-black/40 to-transparent transition-opacity disabled:pointer-events-none">
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
          <button onClick={goToNextPage} disabled={currentPage >= numPages}
            className="absolute right-0 top-0 w-16 h-full z-[190] opacity-0 hover:opacity-100 flex items-center justify-center bg-gradient-to-l from-black/40 to-transparent transition-opacity disabled:pointer-events-none">
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
          <button onClick={() => document.exitFullscreen().catch(() => {})}
            className="absolute top-4 right-4 z-[200] opacity-0 hover:opacity-100 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white transition-opacity">
            <Minimize className="w-5 h-5" />
          </button>
        </>
      )}

      {/* ── TOP HEADER ── hidden in fullscreen via CSS */}
      {!isFullscreen && (
        <header className="h-14 pl-5 pr-[165px] bg-surface-elevated/95 border-b border-white/[0.08] backdrop-blur-xl flex items-center justify-between z-50 flex-shrink-0 app-drag-region">
          <div className="flex items-center gap-3 min-w-0 app-no-drag">
            <button onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-light backdrop-blur-md transition-all active:scale-95 flex-shrink-0">
              <ChevronLeft className="w-4 h-4" /><span>Explorer</span>
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-light text-white truncate max-w-md" title={video.name}>{video.name}</span>
                <span className="text-[10px] font-mono text-slate-400 font-light flex items-center gap-2">
                  <span>PDF &bull; {formatFileSize(video.size)}</span>
                  {numPages > 0 && <span className="text-accent-neon">&bull; {numPages} pages</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Page Navigation */}
          {numPages > 0 && (
            <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-2xl border border-white/10 app-no-drag">
              <button onClick={goToPrevPage} disabled={currentPage <= 1}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all active:scale-90">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <form onSubmit={handlePageSubmit} className="flex items-center gap-1 text-xs font-mono">
                <input type="text" value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={() => setPageInput(currentPage.toString())}
                  className="w-10 h-6 text-center bg-surface-elevated border border-white/15 rounded-lg text-white font-light focus:outline-none focus:border-accent" />
                <span className="text-slate-400 font-light">/ {numPages}</span>
              </form>
              <button onClick={goToNextPage} disabled={currentPage >= numPages}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all active:scale-90">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2 app-no-drag flex-shrink-0">
            <button onClick={() => setShowThumbnails(p => !p)} title="Toggle Thumbnails"
              className={`p-2 rounded-xl border transition-all ${showThumbnails ? 'bg-accent/20 border-accent text-accent-neon' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
              <Layers className="w-4 h-4" />
            </button>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-xl border border-white/10">
              <button onClick={() => { setFitMode('custom'); setZoom(z => Math.max(40, z - 15)); }}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setFitMode('fit-width'); setZoom(100); }}
                title="Fit Width"
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded transition-colors ${fitMode === 'fit-width' ? 'text-accent-neon bg-accent/20' : 'text-slate-300 hover:text-accent-cyan'}`}>
                Fit W
              </button>
              <button onClick={() => { setFitMode('fit-height'); setZoom(100); }}
                title="Fit Height"
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded transition-colors ${fitMode === 'fit-height' ? 'text-accent-neon bg-accent/20' : 'text-slate-300 hover:text-accent-cyan'}`}>
                Fit H
              </button>
              {fitMode === 'custom' && (
                <span className="text-[11px] font-mono text-slate-300 px-1">{zoom}%</span>
              )}
              <button onClick={() => { setFitMode('custom'); setZoom(z => Math.min(300, z + 15)); }}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button onClick={() => setRotation(r => (r + 90) % 360)} title="Rotate [R]"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
              <RotateCw className="w-4 h-4" />
            </button>

            <button onClick={handleOpenExternal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-mono border border-white/10 transition-all font-light">
              <ExternalLink className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="hidden sm:inline">System App</span>
            </button>

            <button onClick={toggleFullscreen} title="Fullscreen [F]"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-accent hover:text-white text-slate-200 border border-white/15 text-xs font-mono transition-all active:scale-95 font-light">
              <Maximize className="w-4 h-4" />
              <span className="hidden md:inline">Fullscreen</span>
            </button>

            <button onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* ── MAIN READER AREA ── always rendered (canvas never unmounted) */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden min-h-0">

        {/* Thumbnail Sidebar — hidden in fullscreen */}
        {showThumbnails && !isFullscreen && numPages > 0 && (
          <aside className="w-[200px] h-full bg-[#0a0c13] border-r border-white/[0.07] flex flex-col overflow-hidden flex-shrink-0 z-20 animate-in slide-in-from-left duration-200">
            <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400 font-light flex-shrink-0">
              <span>Pages ({numPages})</span>
              <BookOpen className="w-3.5 h-3.5 text-accent-cyan" />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNo => (
                <div
                  key={pageNo}
                  onClick={() => setCurrentPage(pageNo)}
                  className={`relative p-1.5 rounded-xl border cursor-pointer transition-all ${
                    currentPage === pageNo
                      ? 'bg-accent/20 border-accent/60 shadow-glow-cyan'
                      : 'bg-surface-elevated/40 border-white/[0.04] hover:bg-surface-elevated hover:border-white/20'
                  }`}
                >
                  {/* Actual page render — no text labels */}
                  <div className="w-full aspect-[1/1.414] bg-white rounded-md overflow-hidden">
                    {pdfDoc && <PageThumbnailCanvas pdfDoc={pdfDoc} pageNo={pageNo} />}
                  </div>
                  {/* Page number indicator only on active */}
                  {currentPage === pageNo && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-[8px] font-mono text-white">{pageNo}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* ── MAIN CANVAS AREA ── ALWAYS in DOM, scroll container adjusts */}
        <div
          ref={scrollContainerRef}
          className={`flex-1 h-full overflow-auto flex items-center justify-center relative transition-all duration-200 ${
            isFullscreen ? 'bg-black p-2' : 'bg-[#0d1017] p-6'
          }`}
        >
          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
              <div className="w-14 h-14 rounded-3xl bg-accent/20 border border-accent-cyan/40 flex items-center justify-center text-accent-cyan">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h3 className="text-sm font-light text-white tracking-wider">Loading PDF...</h3>
            </div>
          )}

          {errorMessage && (
            <div className="max-w-md p-6 rounded-3xl bg-surface-elevated border border-red-500/30 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-light text-white">Could not load PDF</h3>
              <p className="text-xs font-mono text-slate-400 font-light break-all">{errorMessage}</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button onClick={loadPdf}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-light transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /><span>Retry</span>
                </button>
                <button onClick={handleOpenExternal}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-light transition-all">
                  <ExternalLink className="w-3.5 h-3.5" /><span>Open in App</span>
                </button>
                {video.path && (
                  <button onClick={handleReveal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-light transition-all">
                    <FolderSearch className="w-3.5 h-3.5" /><span>Reveal</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 
            IMPORTANT: Canvas is ALWAYS in DOM so mainCanvasRef is always valid.
            Opacity hides it while loading/error — never conditionally unmounted.
          */}
          <div className={`transition-opacity duration-200 ${isLoading || errorMessage ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'}`}>
            <div className={`bg-white overflow-hidden ${isFullscreen ? 'shadow-2xl' : 'rounded-lg shadow-2xl border border-white/20 ring-1 ring-black/40'}`}>
              <canvas ref={mainCanvasRef} className="block max-w-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── hidden in fullscreen */}
      {!isFullscreen && (
        <footer className="h-8 px-6 bg-surface-elevated/95 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400 font-light flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>Page {currentPage} of {numPages}</span>
            <span>&bull;</span>
            <span className="text-accent-cyan">Scroll: Page Turn &bull; [←][→] Navigate &bull; [+][-] Zoom &bull; [R] Rotate &bull; [F] Fullscreen</span>
          </div>
          <span className="text-accent-neon font-light">PDF.js Engine</span>
        </footer>
      )}
    </div>
  );
};
