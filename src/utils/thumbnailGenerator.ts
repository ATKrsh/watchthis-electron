// High-Performance Concurrency-Throttled Parallel Thumbnail Generator (Videos & PDFs)
// Persistent IndexedDB Caching + Random Near-Middle Frame Extraction + Zero-Freeze Architecture

import { loadPdfDocument } from './pdfRenderer';
import { getMemoryThumbnail, setMemoryThumbnail, getStoredThumbnail, setStoredThumbnail } from './thumbnailDb';

const pendingPromises = new Map<string, Promise<string>>();

// Concurrency pools: 10 parallel video workers, 4 parallel PDF workers
const MAX_VIDEO_CONCURRENT = 10;
const MAX_PDF_CONCURRENT = 4;

let activeVideoWorkers = 0;
let activePdfWorkers = 0;

const videoTaskQueue: Array<() => void> = [];
const pdfTaskQueue: Array<() => void> = [];

function processVideoQueue() {
  while (activeVideoWorkers < MAX_VIDEO_CONCURRENT && videoTaskQueue.length > 0) {
    const nextTask = videoTaskQueue.shift();
    if (nextTask) {
      activeVideoWorkers++;
      nextTask();
    }
  }
}

function processPdfQueue() {
  while (activePdfWorkers < MAX_PDF_CONCURRENT && pdfTaskQueue.length > 0) {
    const nextTask = pdfTaskQueue.shift();
    if (nextTask) {
      activePdfWorkers++;
      nextTask();
    }
  }
}

/**
 * Generates a stable pseudo-random ratio in the range [0.35, 0.65] (near-middle)
 * based on a seed string (e.g., video ID or URL) to ensure each video or PDF gets a unique,
 * representative frame near its midpoint without causing frame flickering on re-renders.
 */
export function getStableRandomRatio(seed: string): number {
  if (!seed) return 0.5;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash % 10000) / 10000;
  // Span between 35% and 65% of the total duration or page count (near middle)
  return 0.35 + normalized * 0.30;
}

/**
 * Synchronous in-memory cache lookup for instantaneous 0ms rendering
 */
export function getCachedThumbnail(urlOrPath: string): string | undefined {
  if (!urlOrPath) return undefined;
  return getMemoryThumbnail(urlOrPath);
}

/**
 * Generates a crisp random near-middle frame thumbnail for a given video.
 * Uses high-concurrency throttling (10 workers), persistent IndexedDB caching,
 * and smart fallback seeking to guarantee lightning-fast indexing.
 */
export async function generateVideoThumbnail(
  videoUrl: string,
  seedOrId?: string,
  fallbackDuration?: number
): Promise<string> {
  if (!videoUrl) return '';

  // 1. Instant Synchronous Memory Cache
  const memoryHit = getMemoryThumbnail(videoUrl);
  if (memoryHit) return memoryHit;

  // 2. Pending In-Flight Request Deduplication
  if (pendingPromises.has(videoUrl)) {
    return pendingPromises.get(videoUrl)!;
  }

  // 3. Persistent IndexedDB Lookup before spawning decoder
  const promise = (async () => {
    try {
      const stored = await getStoredThumbnail(videoUrl);
      if (stored) {
        setMemoryThumbnail(videoUrl, stored);
        return stored;
      }
    } catch (_) {}

    return new Promise<string>((resolve) => {
      const executeTask = () => {
        let isSettled = false;
        let hasFallbackAttempted = false;

        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.defaultMuted = true;
        video.preload = 'auto';
        video.playsInline = true;

        const cleanUp = () => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timeoutId);
          video.onloadedmetadata = null;
          video.onseeked = null;
          video.onerror = null;
          video.oncanplay = null;
          video.removeAttribute('src');
          try {
            video.load();
          } catch (_) {}
          activeVideoWorkers--;
          pendingPromises.delete(videoUrl);
          processVideoQueue();
        };

        // 2.8-second safety timeout per video
        const timeoutId = setTimeout(() => {
          if (!isSettled) {
            // Attempt instant frame capture before full abort
            tryCaptureFrame();
          }
          cleanUp();
          resolve('');
        }, 2800);

        const tryCaptureFrame = (): boolean => {
          try {
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            if (vw > 0 && vh > 0) {
              const canvas = document.createElement('canvas');
              const targetWidth = 380;
              const targetHeight = Math.max(120, Math.round((targetWidth / vw) * vh)) || 214;

              canvas.width = targetWidth;
              canvas.height = targetHeight;
              const ctx = canvas.getContext('2d', { alpha: false });

              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.80);

                if (dataUrl && dataUrl.length > 50) {
                  setMemoryThumbnail(videoUrl, dataUrl);
                  setStoredThumbnail(videoUrl, dataUrl).catch(() => {});
                  cleanUp();
                  resolve(dataUrl);
                  return true;
                }
              }
            }
          } catch (e) {
            console.warn('[ThumbnailGenerator] Capture exception:', videoUrl, e);
          }
          return false;
        };

        video.onloadedmetadata = () => {
          try {
            const rawDuration = video.duration;
            const duration = (Number.isFinite(rawDuration) && rawDuration > 0)
              ? rawDuration
              : (fallbackDuration && fallbackDuration > 0 ? fallbackDuration : 12);

            const ratio = getStableRandomRatio(seedOrId || videoUrl);
            // Target random frame near the middle (35% - 65%)
            let targetTime = duration * ratio;
            if (targetTime <= 0 || !Number.isFinite(targetTime)) {
              targetTime = 0.5;
            } else {
              targetTime = Math.max(0.1, Math.min(duration - 0.2, targetTime));
            }
            video.currentTime = targetTime;
          } catch (err) {
            if (!hasFallbackAttempted) {
              hasFallbackAttempted = true;
              try { video.currentTime = 0.5; } catch (_) {}
            } else {
              cleanUp();
              resolve('');
            }
          }
        };

        video.onseeked = () => {
          if (!tryCaptureFrame()) {
            if (!hasFallbackAttempted) {
              hasFallbackAttempted = true;
              try {
                video.currentTime = 0.2;
                return;
              } catch (_) {}
            }
            cleanUp();
            resolve('');
          }
        };

        video.onerror = () => {
          cleanUp();
          resolve('');
        };

        try {
          video.src = videoUrl;
        } catch (err) {
          cleanUp();
          resolve('');
        }
      };

      videoTaskQueue.push(executeTask);
      processVideoQueue();
    });
  })();

  pendingPromises.set(videoUrl, promise);
  return promise;
}

/**
 * Generates a crisp random near-middle page thumbnail for a given PDF document.
 * Runs on a dedicated PDF worker queue with IndexedDB persistence.
 */
export async function generatePdfThumbnail(
  source: string,
  seedOrId?: string,
  maxWidth: number = 380
): Promise<string> {
  if (!source) return '';

  // 1. Instant Synchronous Memory Cache
  const memoryHit = getMemoryThumbnail(source);
  if (memoryHit) return memoryHit;

  // 2. In-flight Deduplication
  if (pendingPromises.has(source)) {
    return pendingPromises.get(source)!;
  }

  // 3. Persistent IndexedDB Lookup
  const promise = (async () => {
    try {
      const stored = await getStoredThumbnail(source);
      if (stored) {
        setMemoryThumbnail(source, stored);
        return stored;
      }
    } catch (_) {}

    return new Promise<string>((resolve) => {
      const executeTask = async () => {
        try {
          let doc: any = null;

          // Priority 1: High-Speed Direct Electron File Buffer Read
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
                  doc = await loadPdfDocument(buf);
                }
              } catch (_) {}
            }
          }

          // Priority 2: Streaming URL Fetch
          if (!doc) {
            doc = await Promise.race([
              loadPdfDocument(source),
              new Promise<never>((_, rej) => setTimeout(() => rej(new Error('PDF load timeout')), 7000))
            ]);
          }

          const numPages = doc.numPages || 1;
          let targetPageNum = 1;
          if (numPages > 1) {
            const ratio = getStableRandomRatio(seedOrId || source);
            // Target random page near the middle (35% - 65%)
            targetPageNum = Math.max(1, Math.min(numPages, Math.round(numPages * ratio)));
          }

          let page: any = null;
          try {
            page = await doc.getPage(targetPageNum);
          } catch (_) {
            page = await doc.getPage(1);
          }

          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const scale = Math.min(2.0, maxWidth / unscaledViewport.width);
          const viewport = page.getViewport({ scale: Math.max(0.3, scale) });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d', { alpha: false });

          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const renderTask = page.render({
              canvasContext: ctx,
              canvas: canvas,
              viewport: viewport,
            });

            await Promise.race([
              renderTask.promise,
              new Promise<never>((_, rej) => setTimeout(() => {
                try { renderTask.cancel(); } catch (_) {}
                rej(new Error('Page render timeout'));
              }, 5000))
            ]);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            setMemoryThumbnail(source, dataUrl);
            setStoredThumbnail(source, dataUrl).catch(() => {});

            activePdfWorkers--;
            pendingPromises.delete(source);
            processPdfQueue();
            resolve(dataUrl);
            return;
          }
        } catch (err) {
          console.warn('[PDF Thumbnail Generation Warning]', source, err);
        }

        activePdfWorkers--;
        pendingPromises.delete(source);
        processPdfQueue();
        resolve('');
      };

      pdfTaskQueue.push(executeTask);
      processPdfQueue();
    });
  })();

  pendingPromises.set(source, promise);
  return promise;
}
