import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { UnifiedTrackMetadata } from '../types';

interface CacheDB extends DBSchema {
  'search-cache': {
    key: string;
    value: {
      query: string;
      results: UnifiedTrackMetadata[];
      timestamp: number;
      source: string;
    };
  };
  'metadata-cache': {
    key: string;
    value: {
      id: string;
      metadata: any;
      timestamp: number;
    };
  };
  'artwork-cache': {
    key: string;
    value: {
      url: string;
      blob: Blob;
      timestamp: number;
    };
  };
}

let db: IDBPDatabase<CacheDB> | null = null;
let isCacheEnabled = true;

const SEARCH_TTL = 24 * 60 * 60 * 1000; // 24 hours
const METADATA_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const ARTWORK_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function initCacheDB(): Promise<void> {
  if (!isCacheEnabled) return;
  if (db) return;

  try {
    // Check if IndexedDB is even available
    if (typeof indexedDB === 'undefined') {
      isCacheEnabled = false;
      return;
    }

    db = await openDB<CacheDB>('soundvzn-cache', 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('search-cache')) {
          database.createObjectStore('search-cache', { keyPath: 'query' });
        }
        if (!database.objectStoreNames.contains('metadata-cache')) {
          database.createObjectStore('metadata-cache', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('artwork-cache')) {
          database.createObjectStore('artwork-cache', { keyPath: 'url' });
        }
      },
    });
  } catch (error) {
    console.warn('[CacheManager] IndexedDB blocked or corrupted. Disabling cache.', error);
    isCacheEnabled = false;
    db = null;
  }
}

export async function getCachedSearch(query: string, source: string): Promise<UnifiedTrackMetadata[] | null> {
  if (!isCacheEnabled) return null;
  if (!db) await initCacheDB();
  if (!db || !isCacheEnabled) return null;

  try {
    const key = `${source}_${query.toLowerCase()}`;
    const cached = await db.get('search-cache', key);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > SEARCH_TTL) {
      await db.delete('search-cache', key);
      return null;
    }

    return cached.results;
  } catch (error) {
    console.error('Cache read error (disabling cache for session):', error);
    isCacheEnabled = false;
    return null;
  }
}

export async function setCachedSearch(
  query: string,
  source: string,
  results: UnifiedTrackMetadata[]
): Promise<void> {
  if (!isCacheEnabled) return;
  if (!db) await initCacheDB();
  if (!db || !isCacheEnabled) return;

  try {
    const key = `${source}_${query.toLowerCase()}`;
    await db.put('search-cache', {
      query: key,
      results,
      timestamp: Date.now(),
      source,
    });
  } catch (error) {
    console.error('Cache write error (disabling cache for session):', error);
    isCacheEnabled = false;
  }
}

export async function getCachedMetadata(id: string): Promise<any | null> {
  if (!isCacheEnabled) return null;
  if (!db) await initCacheDB();
  if (!db || !isCacheEnabled) return null;

  try {
    const cached = await db.get('metadata-cache', id);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > METADATA_TTL) {
      await db.delete('metadata-cache', id);
      return null;
    }

    return cached.metadata;
  } catch (error) {
    console.error('Metadata cache read error (disabling cache for session):', error);
    isCacheEnabled = false;
    return null;
  }
}

export async function setCachedMetadata(id: string, metadata: any): Promise<void> {
  if (!isCacheEnabled) return;
  if (!db) await initCacheDB();
  if (!db || !isCacheEnabled) return;

  try {
    await db.put('metadata-cache', {
      id,
      metadata,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Metadata cache write error (disabling cache for session):', error);
    isCacheEnabled = false;
  }
}

export async function getCachedArtwork(url: string): Promise<string | null> {
  if (!db) await initCacheDB();
  if (!db) return null;

  try {
    const cached = await db.get('artwork-cache', url);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > ARTWORK_TTL) {
      await db.delete('artwork-cache', url);
      return null;
    }

    return URL.createObjectURL(cached.blob);
  } catch (error) {
    console.error('Artwork cache read error:', error);
    return null;
  }
}

export async function setCachedArtwork(url: string, blob: Blob): Promise<void> {
  if (!db) await initCacheDB();
  if (!db) return;

  try {
    await db.put('artwork-cache', {
      url,
      blob,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Artwork cache write error:', error);
  }
}

export async function clearMetadataCache(): Promise<void> {
  if (!db) await initCacheDB();
  if (!db) return;
  try {
    await db.clear('metadata-cache');
    await db.clear('search-cache');
    console.log('[CacheManager] Metadata and Search cache cleared manually.');
  } catch (error) {
    console.error('Failed to clear metadata cache:', error);
  }
}

export async function forceClearAll(): Promise<void> {
  if (!db) await initCacheDB();
  if (!db) return;
  try {
    await db.clear('metadata-cache');
    await db.clear('search-cache');
    await db.clear('artwork-cache');
    console.log('[CacheManager] Full cache wipe completed.');
  } catch (error) {
    console.error('Failed to wipe all cache:', error);
  }
}

/**
 * Proactive cleanup: remove expired items and limit artwork cache size.
 */
export async function performMaintenance(): Promise<void> {
  if (!db) await initCacheDB();
  if (!db || !isCacheEnabled) return;

  try {
    const now = Date.now();

    // 1. Cleanup expired search & metadata
    const tx = db.transaction(['search-cache', 'metadata-cache', 'artwork-cache'], 'readwrite');

    // Manual iteration for search-cache
    let searchStore = tx.objectStore('search-cache');
    let searchCursor = await searchStore.openCursor();
    while (searchCursor) {
      if (now - searchCursor.value.timestamp > SEARCH_TTL) {
        await searchCursor.delete();
      }
      searchCursor = await searchCursor.continue();
    }

    // Manual iteration for metadata-cache
    let metaStore = tx.objectStore('metadata-cache');
    let metaCursor = await metaStore.openCursor();
    while (metaCursor) {
      if (now - metaCursor.value.timestamp > METADATA_TTL) {
        await metaCursor.delete();
      }
      metaCursor = await metaCursor.continue();
    }

    // 2. Limit artwork cache (Max 200 items, LRU-ish by timestamp)
    let artStore = tx.objectStore('artwork-cache');
    const count = await artStore.count();
    if (count > 200) {
      const artworks = await artStore.getAll();
      artworks.sort((a, b) => a.timestamp - b.timestamp);
      const toDelete = artworks.slice(0, count - 200);
      for (const item of toDelete) {
        await artStore.delete(item.url);
      }
    }

    await tx.done;
    console.log('[CacheManager] Maintenance completed.');
  } catch (error) {
    console.warn('[CacheManager] Maintenance failed:', error);
  }
}

export async function getCacheStats(): Promise<{
  searchCount: number;
  metadataCount: number;
  artworkCount: number;
}> {
  if (!db) await initCacheDB();
  if (!db) return { searchCount: 0, metadataCount: 0, artworkCount: 0 };

  try {
    const [searchCount, metadataCount, artworkCount] = await Promise.all([
      db.count('search-cache'),
      db.count('metadata-cache'),
      db.count('artwork-cache'),
    ]);

    return { searchCount, metadataCount, artworkCount };
  } catch (error) {
    console.error('Cache stats error:', error);
    return { searchCount: 0, metadataCount: 0, artworkCount: 0 };
  }
}
