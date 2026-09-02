import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

export interface ThumbnailMetadata {
  key: string;
  originalPath?: string;
  name?: string;
  mtime?: number;
  size?: number;
  duration?: number;
  resolution?: string;
  codec?: string;
  smartTags?: string[];
  isPdf?: boolean;
}

export interface CachedItem {
  key: string;
  dataUrl: string;
  metadata?: ThumbnailMetadata;
}

// In-memory runtime caches for 0ms synchronous lookups
const inMemoryThumbnails = new Map<string, string>();
const inMemoryManifest = new Map<string, ThumbnailMetadata>();

let isInitialized = false;
let isDirty = false;
let flushTimer: NodeJS.Timeout | null = null;
const FLUSH_DEBOUNCE_MS = 600;

/**
 * Resolves the persistent 'dump' directory located alongside the application executable.
 */
export function getDumpDirectory(): string {
  let baseDir: string;
  
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    baseDir = process.env.PORTABLE_EXECUTABLE_DIR;
  } else if (app.isPackaged) {
    baseDir = path.dirname(process.execPath);
  } else {
    baseDir = process.cwd();
  }

  const dumpDir = path.join(baseDir, 'dump');
  try {
    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });
    }
  } catch (err) {
    console.warn('[ZipCache] Could not create dump directory at baseDir, falling back to appData:', err);
    const fallbackDir = path.join(app.getPath('userData'), 'dump');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
  return dumpDir;
}

/**
 * Path to the ZIP cache archive inside the dump folder.
 */
export function getZipCachePath(): string {
  return path.join(getDumpDirectory(), 'thumbnails_cache.zip');
}

/**
 * Hash key helper to create clean alphanumeric file names inside the zip archive.
 */
export function generateKeyForSource(sourceOrPath: string): string {
  if (!sourceOrPath) return 'unknown';
  return crypto.createHash('md5').update(sourceOrPath.toLowerCase().replace(/\\/g, '/')).digest('hex');
}

/**
 * Initialize ZIP cache on application startup.
 * Loads all thumbnails and metadata into memory for instant access.
 */
export async function initZipCache(): Promise<void> {
  if (isInitialized) return;
  const zipPath = getZipCachePath();

  try {
    if (fs.existsSync(zipPath)) {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      let manifestData: Record<string, ThumbnailMetadata> = {};
      const manifestEntry = zipEntries.find(e => e.entryName === 'manifest.json');
      if (manifestEntry) {
        try {
          const raw = manifestEntry.getData().toString('utf8');
          manifestData = JSON.parse(raw);
          for (const [k, v] of Object.entries(manifestData)) {
            inMemoryManifest.set(k, v);
          }
        } catch (e) {
          console.warn('[ZipCache] Manifest parse warning:', e);
        }
      }

      // Load image entries into in-memory base64 cache
      let loadedCount = 0;
      for (const entry of zipEntries) {
        if (entry.entryName.endsWith('.jpg') || entry.entryName.endsWith('.jpeg')) {
          const key = entry.entryName.replace(/\.jpe?g$/i, '');
          const buffer = entry.getData();
          if (buffer && buffer.length > 0) {
            const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            inMemoryThumbnails.set(key, dataUrl);
            loadedCount++;
          }
        }
      }

      console.log(`[ZipCache] Successfully primed ${loadedCount} thumbnails from ${zipPath}`);
    } else {
      console.log(`[ZipCache] No existing cache found at ${zipPath}. Will create on first thumbnail generation.`);
    }
  } catch (err) {
    console.error('[ZipCache] Error initializing ZIP cache:', err);
  } finally {
    isInitialized = true;
  }
}

/**
 * Returns all primed thumbnails and metadata for instant hydration in the renderer.
 */
export function getAllCachedThumbnails(): {
  thumbnails: Record<string, string>;
  manifest: Record<string, ThumbnailMetadata>;
} {
  const thumbnails: Record<string, string> = {};
  for (const [k, v] of inMemoryThumbnails.entries()) {
    thumbnails[k] = v;
  }

  const manifest: Record<string, ThumbnailMetadata> = {};
  for (const [k, v] of inMemoryManifest.entries()) {
    manifest[k] = v;
  }

  return { thumbnails, manifest };
}

/**
 * Get a specific thumbnail from memory.
 */
export function getCachedThumbnail(keyOrPath: string): string | null {
  const key = generateKeyForSource(keyOrPath);
  return inMemoryThumbnails.get(key) || inMemoryThumbnails.get(keyOrPath) || null;
}

/**
 * Save a single generated thumbnail to in-memory cache and schedule a debounced flush to the ZIP archive.
 */
export function saveThumbnailToZip(
  sourceOrPath: string,
  dataUrl: string,
  metadata?: ThumbnailMetadata
): void {
  if (!sourceOrPath || !dataUrl) return;

  const key = generateKeyForSource(sourceOrPath);
  inMemoryThumbnails.set(key, dataUrl);
  // Also index by raw source for fast dual lookup
  inMemoryThumbnails.set(sourceOrPath, dataUrl);

  if (metadata) {
    inMemoryManifest.set(key, { ...metadata, key });
  } else if (!inMemoryManifest.has(key)) {
    inMemoryManifest.set(key, { key, originalPath: sourceOrPath });
  }

  isDirty = true;
  scheduleFlush();
}

/**
 * Save multiple thumbnails in batch.
 */
export function saveBatchThumbnailsToZip(items: CachedItem[]): void {
  if (!items || items.length === 0) return;

  for (const item of items) {
    if (!item.key || !item.dataUrl) continue;
    const key = generateKeyForSource(item.key);
    inMemoryThumbnails.set(key, item.dataUrl);
    inMemoryThumbnails.set(item.key, item.dataUrl);
    if (item.metadata) {
      inMemoryManifest.set(key, { ...item.metadata, key });
    }
  }

  isDirty = true;
  scheduleFlush();
}

/**
 * Debounced background flush to write changes to dump/thumbnails_cache.zip.
 */
function scheduleFlush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushToDisk().catch((err) => console.error('[ZipCache] Disk flush error:', err));
  }, FLUSH_DEBOUNCE_MS);
}

/**
 * Flushes all in-memory thumbnails and manifest into the dump/thumbnails_cache.zip file.
 */
export async function flushToDisk(): Promise<void> {
  if (!isDirty) return;
  isDirty = false;

  const zipPath = getZipCachePath();
  try {
    const zip = new AdmZip();

    // 1. Add manifest.json
    const manifestObj: Record<string, ThumbnailMetadata> = {};
    for (const [k, v] of inMemoryManifest.entries()) {
      manifestObj[k] = v;
    }
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifestObj, null, 2), 'utf8'));

    // 2. Add thumbnail JPEG image buffers
    for (const [key, dataUrl] of inMemoryThumbnails.entries()) {
      // Only write hashed keys into the zip archive to prevent path syntax conflicts
      if (/^[a-f0-9]{32}$/i.test(key)) {
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        if (imageBuffer.length > 0) {
          zip.addFile(`${key}.jpg`, imageBuffer);
        }
      }
    }

    // Ensure parent dump folder exists
    const dumpDir = getDumpDirectory();
    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });
    }

    // Write zip atomically
    await zip.writeZipPromise(zipPath);
    console.log(`[ZipCache] Persisted ${inMemoryThumbnails.size} thumbnails into ${zipPath}`);
  } catch (err) {
    console.error('[ZipCache] Failed to write zip cache to disk:', err);
    // Mark dirty so it retries on next update
    isDirty = true;
  }
}
