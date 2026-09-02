// High-Performance Persistent IndexedDB & Dump ZIP Thumbnail Database for Instant 0ms Cache Hits

const DB_NAME = 'watchthis_thumbnails_v1';
const STORE_NAME = 'thumbnails';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memoryCache = new Map<string, string>();
const manifestCache = new Map<string, any>();
const MAX_MEMORY_CACHE = 5000;

let isZipHydrated = false;
let zipHydrationPromise: Promise<void> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          resolve(db);
        };
        request.onerror = (err) => {
          console.warn('[ThumbnailDb] IndexedDB open error, falling back to memory:', err);
          resolve(null);
        };
      } catch (e) {
        console.warn('[ThumbnailDb] IndexedDB init exception:', e);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

/**
 * Hydrate all cached thumbnails directly from the 'dump/thumbnails_cache.zip' file on startup.
 */
export async function initZipCacheLoader(): Promise<void> {
  if (isZipHydrated) return;
  if (zipHydrationPromise) return zipHydrationPromise;

  zipHydrationPromise = (async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.loadZipCache) {
        const { thumbnails, manifest } = await window.electronAPI.loadZipCache();
        
        let count = 0;
        if (thumbnails) {
          for (const [k, v] of Object.entries(thumbnails)) {
            if (v && v.startsWith('data:image')) {
              setMemoryThumbnail(k, v);
              count++;
            }
          }
        }

        if (manifest) {
          for (const [k, v] of Object.entries(manifest)) {
            manifestCache.set(k, v);
            if (v.originalPath && thumbnails[k]) {
              setMemoryThumbnail(v.originalPath, thumbnails[k]);
            }
          }
        }

        console.log(`[ThumbnailDb] Hydrated ${count} thumbnails from dump ZIP cache on startup.`);
      }
    } catch (err) {
      console.warn('[ThumbnailDb] Zip cache hydration warning:', err);
    } finally {
      isZipHydrated = true;
    }
  })();

  return zipHydrationPromise;
}

// Auto-trigger hydration on module load in browser / Electron environment
if (typeof window !== 'undefined') {
  initZipCacheLoader().catch(() => {});
}

export function getMemoryThumbnail(key: string): string | undefined {
  if (!key) return undefined;
  return memoryCache.get(key);
}

export function getZipCachedMetadata(key: string): any | undefined {
  if (!key) return undefined;
  return manifestCache.get(key);
}

export function setMemoryThumbnail(key: string, dataUrl: string) {
  if (!key || !dataUrl) return;
  if (memoryCache.size >= MAX_MEMORY_CACHE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, dataUrl);
}

export async function getStoredThumbnail(key: string): Promise<string | null> {
  if (!key) return null;
  const mem = memoryCache.get(key);
  if (mem) return mem;

  // Make sure zip hydration has executed
  if (!isZipHydrated && zipHydrationPromise) {
    await zipHydrationPromise;
    const memAfterZip = memoryCache.get(key);
    if (memAfterZip) return memAfterZip;
  }

  try {
    const db = await getDb();
    if (!db) return null;

    return new Promise<string | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          const result = req.result as string | undefined;
          if (result) {
            setMemoryThumbnail(key, result);
            resolve(result);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  } catch (e) {
    return null;
  }
}

export async function setStoredThumbnail(
  key: string, 
  dataUrl: string, 
  metadata?: any
): Promise<void> {
  if (!key || !dataUrl) return;
  setMemoryThumbnail(key, dataUrl);

  // 1. Persist to Electron 'dump/thumbnails_cache.zip'
  if (typeof window !== 'undefined' && window.electronAPI?.saveZipThumbnail) {
    try {
      window.electronAPI.saveZipThumbnail(key, dataUrl, metadata).catch(() => {});
    } catch (_) {}
  }

  // 2. Persist to local IndexedDB
  try {
    const db = await getDb();
    if (!db) return;

    return new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(dataUrl, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  } catch (e) {
    // Non-fatal, memory cache still holds it
  }
}

export async function clearAllStoredThumbnails(): Promise<void> {
  memoryCache.clear();
  manifestCache.clear();
  try {
    const db = await getDb();
    if (!db) return;
    return new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  } catch (e) {}
}

