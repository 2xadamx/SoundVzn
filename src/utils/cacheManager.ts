import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { UnifiedTrackMetadata } from './unifiedMusicAPI';

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
      metadata: UnifiedTrackMetadata;
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

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

export async function initCacheDB(): Promise<void> {
  if (db) return;

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
}

export async function getCachedSearch(query: string, source: string): Promise<UnifiedTrackMetadata[] | null> {
  if (!db) await initCacheDB();
  if (!db) return null;

  try {
    const key = `${source}_${query.toLowerCase()}`;
    const cached = await db.get('search-cache', key);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      await db.delete('search-cache', key);
      return null;
    }

    return cached.results;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

export async function setCachedSearch(
  query: string,
  source: string,
  results: UnifiedTrackMetadata[]
): Promise<void> {
  if (!db) await initCacheDB();
  if (!db) return;

  try {
    const key = `${source}_${query.toLowerCase()}`;
    await db.put('search-cache', {
      query: key,
      results,
      timestamp: Date.now(),
      source,
    });
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

export async function getCachedMetadata(id: string): Promise<UnifiedTrackMetadata | null> {
  if (!db) await initCacheDB();
  if (!db) return null;

  try {
    const cached = await db.get('metadata-cache', id);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      await db.delete('metadata-cache', id);
      return null;
    }

    return cached.metadata;
  } catch (error) {
    console.error('Metadata cache read error:', error);
    return null;
  }
}

export async function setCachedMetadata(id: string, metadata: UnifiedTrackMetadata): Promise<void> {
  if (!db) await initCacheDB();
  if (!db) return;

  try {
    await db.put('metadata-cache', {
      id,
      metadata,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Metadata cache write error:', error);
  }
}

export async function getCachedArtwork(url: string): Promise<string | null> {
  if (!db) await initCacheDB();
  if (!db) return null;

  try {
    const cached = await db.get('artwork-cache', url);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_DURATION) {
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

export async function clearOldCache(): Promise<void> {
  if (!db) await initCacheDB();
  if (!db) return;

  try {
    const now = Date.now();

    const searchCache = await db.getAll('search-cache');
    for (const item of searchCache) {
      if (now - item.timestamp > CACHE_DURATION) {
        await db.delete('search-cache', item.query);
      }
    }

    const metadataCache = await db.getAll('metadata-cache');
    for (const item of metadataCache) {
      if (now - item.timestamp > CACHE_DURATION) {
        await db.delete('metadata-cache', item.id);
      }
    }

    const artworkCache = await db.getAll('artwork-cache');
    for (const item of artworkCache) {
      if (now - item.timestamp > CACHE_DURATION) {
        await db.delete('artwork-cache', item.url);
      }
    }
  } catch (error) {
    console.error('Clear cache error:', error);
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
