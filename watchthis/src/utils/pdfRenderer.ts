import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure standard Web Worker module for PDF.js in browser/Vite/Electron
if (typeof window !== 'undefined' && 'Worker' in window) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
      new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url),
      { type: 'module' }
    );
  } catch (e) {
    console.warn('[PDF.js] Worker initialization fallback:', e);
  }
}

export interface PdfDocumentInfo {
  numPages: number;
  title?: string;
  author?: string;
  fingerprint: string;
}

// In-memory document cache with LRU eviction and in-flight promise deduplication
const pdfDocCache = new Map<string, pdfjsLib.PDFDocumentProxy>();
const pdfDocPending = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>();
const MAX_CACHED_DOCS = 24;

function getCacheKey(source: string | ArrayBuffer | Uint8Array): string {
  if (typeof source === 'string') return source;
  if (source instanceof Uint8Array) return `uint8_${source.byteLength}_${source.byteOffset}`;
  if (source instanceof ArrayBuffer) return `ab_${source.byteLength}`;
  return 'unknown_source';
}

/**
 * Load PDF data from ArrayBuffer, Uint8Array, or URL with in-process workerless fallback
 */
export async function loadPdfDocument(source: string | ArrayBuffer | Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
  const cacheKey = getCacheKey(source);

  // Return cached doc if available
  if (pdfDocCache.has(cacheKey)) {
    const cached = pdfDocCache.get(cacheKey)!;
    // Refresh LRU position
    pdfDocCache.delete(cacheKey);
    pdfDocCache.set(cacheKey, cached);
    return cached;
  }

  // Deduplicate in-flight loading requests
  if (pdfDocPending.has(cacheKey)) {
    return pdfDocPending.get(cacheKey)!;
  }

  const loadPromise = (async () => {
    let data: Uint8Array | undefined;

    if (typeof source === 'string') {
      // Electron direct buffer loading optimization
      if (typeof window !== 'undefined' && window.electronAPI?.readPdfBuffer) {
        let localPath = source;
        if (source.startsWith('media-stream://local/')) {
          try {
            localPath = decodeURIComponent(source.replace(/^media-stream:\/\/local\//, ''));
            if (localPath.startsWith('/') && /^\/[a-zA-Z]:/.test(localPath)) {
              localPath = localPath.slice(1);
            }
          } catch (_) {}
        }
        if (localPath && !localPath.startsWith('http')) {
          try {
            const buf = await window.electronAPI.readPdfBuffer(localPath);
            if (buf && (buf as any).byteLength > 0) {
              data = new Uint8Array(buf);
            }
          } catch (e) {
            console.warn('[PDF.js] Direct Electron buffer read fallback:', e);
          }
        }
      }

      if (!data && (
        source.startsWith('data:') || 
        source.startsWith('blob:') || 
        source.startsWith('http:') || 
        source.startsWith('https:') || 
        source.startsWith('media-stream:')
      )) {
        try {
          const resp = await fetch(source);
          if (resp.ok) {
            const ab = await resp.arrayBuffer();
            if (ab && ab.byteLength > 0) {
              data = new Uint8Array(ab);
            }
          }
        } catch (fetchErr) {
          console.warn('[PDF.js] Fetch string source error, passing URL directly:', fetchErr);
        }
      }
    } else if (source instanceof Uint8Array) {
      data = new Uint8Array(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
    } else if (source instanceof ArrayBuffer) {
      data = new Uint8Array(source.slice(0));
    } else if (source && typeof source === 'object' && (source as any).buffer) {
      const buf = (source as any).buffer;
      const offset = (source as any).byteOffset || 0;
      const length = (source as any).byteLength || buf.byteLength;
      data = new Uint8Array(buf.slice(offset, offset + length));
    }

    const baseOptions: any = data ? { data } : { url: source };
    baseOptions.cMapPacked = true;
    baseOptions.isEvalSupported = false;
    baseOptions.useSystemFonts = true;

    try {
      const loadingTask = pdfjsLib.getDocument(baseOptions);
      const doc = await loadingTask.promise;

      // Store in LRU cache
      if (pdfDocCache.size >= MAX_CACHED_DOCS) {
        const oldestKey = pdfDocCache.keys().next().value;
        if (oldestKey) pdfDocCache.delete(oldestKey);
      }
      pdfDocCache.set(cacheKey, doc);
      return doc;
    } catch (err: any) {
      console.warn('[PDF.js] Primary document load error:', err);
      throw err;
    } finally {
      pdfDocPending.delete(cacheKey);
    }
  })();

  pdfDocPending.set(cacheKey, loadPromise);
  return loadPromise;
}

export const getPdfDocumentCached = loadPdfDocument;


/**
 * Render a specific page of a PDF document onto an HTML canvas with cancellation support
 */
export function renderPdfPageToCanvasWithTask(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.0,
  rotation: number = 0
): { cancel: () => void; promise: Promise<{ width: number; height: number }> } {
  let cancelled = false;
  let renderTask: any = null;

  const promise = (async () => {
    const page = await pdfDoc.getPage(pageNumber);
    if (cancelled) return { width: 0, height: 0 };

    const viewport = page.getViewport({ scale, rotation });
    const outputScale = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Cannot get 2d context for canvas');

    ctx.save();
    ctx.scale(outputScale, outputScale);

    const renderContext = {
      canvasContext: ctx,
      canvas: canvas,
      viewport: viewport,
    };

    renderTask = page.render(renderContext);
    try {
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException' || err?.message?.includes('cancelled')) {
        return { width: viewport.width, height: viewport.height };
      }
      throw err;
    } finally {
      ctx.restore();
    }

    return { width: viewport.width, height: viewport.height };
  })();

  return {
    cancel: () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {}
      }
    },
    promise
  };
}

/**
 * Render a specific page of a PDF document onto an HTML canvas
 */
export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.0,
  rotation: number = 0
): Promise<{ width: number; height: number }> {
  const { promise } = renderPdfPageToCanvasWithTask(pdfDoc, pageNumber, canvas, scale, rotation);
  return await promise;
}

/**
 * Render thumbnail data URL for Page 1 of a PDF
 */
export async function renderPdfThumbnail(
  source: string | ArrayBuffer | Uint8Array,
  maxWidth: number = 380
): Promise<string | null> {
  try {
    const doc = await loadPdfDocument(source);
    const page = await doc.getPage(1);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(2.0, maxWidth / unscaledViewport.width);
    const viewport = page.getViewport({ scale: Math.max(0.3, scale) });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderTask = page.render({
      canvasContext: ctx,
      canvas: canvas,
      viewport: viewport,
    });

    await renderTask.promise;
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (e) {
    console.warn('[PDF Thumbnail Render Error]', e);
    return null;
  }
}
