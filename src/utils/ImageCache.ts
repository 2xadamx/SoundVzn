/**
 * ImageCache Utility
 * Manages local persistence of remote album artwork using CacheStorage API.
 */

const CACHE_NAME = 'soundvzn-artwork-cache-v1';

// Helper to safely check if caches is available and not failing internally
async function getSafeCache() {
    try {
        if (typeof caches === 'undefined') return null;
        return await caches.open(CACHE_NAME);
    } catch (e) {
        console.warn('[ImageCache] Storage is unavailable or corrupted:', e);
        return null;
    }
}

/**
 * Checks if an image is already in cache, otherwise fetches and caches it.
 * Returns the cached blob URL or the original URL if caching fails.
 */
export async function getCachedImage(url: string): Promise<string> {
    if (!url || !url.startsWith('http')) return url;

    try {
        const cache = await getSafeCache();
        if (!cache) return url;

        const cachedResponse = await cache.match(url);

        if (cachedResponse) {
            const blob = await cachedResponse.blob();
            return URL.createObjectURL(blob);
        }

        // Not in cache, fetch and store
        const response = await fetch(url);
        if (!response.ok) return url;

        // Clone response before putting it in cache because it's a stream
        try {
            await cache.put(url, response.clone());
        } catch (e) {
            console.warn('[ImageCache] Could not write to cache:', e);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.warn(`[ImageCache] Failed to process: ${url}`, error);
        return url;
    }
}

/**
 * Pre-caches an array of image URLs.
 */
export async function precacheImages(urls: string[]): Promise<void> {
    try {
        const cache = await getSafeCache();
        if (!cache) return;

        const uniqueUrls = [...new Set(urls.filter(u => u && u.startsWith('http')))];

        // Process in small batches to avoid blocking
        const batchSize = 5;
        for (let i = 0; i < uniqueUrls.length; i += batchSize) {
            const batch = uniqueUrls.slice(i, i + batchSize);
            await Promise.allSettled(batch.map(async (url) => {
                const exists = await cache.match(url);
                if (!exists) {
                    try {
                        const response = await fetch(url);
                        if (response.ok) await cache.put(url, response);
                    } catch (e) { }
                }
            }));
        }
    } catch (e) {
        console.warn('[ImageCache] Precache failed:', e);
    }
}

/**
 * Clears the entire image cache.
 */
export async function clearImageCache(): Promise<void> {
    try {
        if (typeof caches !== 'undefined') {
            await caches.delete(CACHE_NAME);
        }
    } catch (e) {
        console.error('[ImageCache] Clear failed:', e);
    }
}
