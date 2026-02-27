import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import type { Express, Request, Response } from 'express';
const axios = require('axios');
const playdl = require('play-dl');
const yts = require('yt-search');
const youtubedl = require('youtube-dl-exec');
import fs from 'node:fs';
import path from 'node:path';
import { logInfo, logWarn, logError } from './logger';

const INVIDIOUS_INSTANCES = (process.env.INVIDIOUS_INSTANCES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const YOUTUBE_INFO_TTL_MS = 30 * 60 * 1000; // 30 min cache
const ytdlFormatCache = new Map<string, { url: string; expiresAt: number }>();
const ytdlVideoCache = new Map<string, { url: string; mimeType?: string; expiresAt: number }>();
const audioResolveLocks = new Map<string, Promise<string | null>>();
const videoResolveLocks = new Map<string, Promise<{ url: string; mimeType?: string } | null>>();

const cacheDir = process.env.SOUNDVZN_USER_DATA
  ? path.join(process.env.SOUNDVZN_USER_DATA, 'cache')
  : path.join(process.cwd(), '.soundvzn_data', 'cache');
const cacheFilePath = path.join(cacheDir, 'youtube-cache.json');

function getUrlExpiryMs(url: string): number | null {
  try {
    const parsed = new URL(url);
    const exp = parsed.searchParams.get('expire');
    if (exp) {
      const ts = Number(exp);
      if (!Number.isNaN(ts) && ts > 0) {
        return ts * 1000;
      }
    }
  } catch {
    // ignore
  }
  return null;
}
let persistTimer: NodeJS.Timeout | null = null;

type CachePayload = {
  audio: Record<string, { url: string; expiresAt: number }>;
  video: Record<string, { url: string; mimeType?: string; expiresAt: number }>;
};

function loadCacheFromDisk() {
  try {
    if (!fs.existsSync(cacheFilePath)) return;
    const raw = fs.readFileSync(cacheFilePath, 'utf8');
    const parsed = JSON.parse(raw) as CachePayload;
    const now = Date.now();
    if (parsed?.audio) {
      Object.entries(parsed.audio).forEach(([id, entry]) => {
        if (entry?.url && entry?.expiresAt && entry.expiresAt > now) {
          ytdlFormatCache.set(id, entry);
        }
      });
    }
    if (parsed?.video) {
      Object.entries(parsed.video).forEach(([id, entry]) => {
        if (entry?.url && entry?.expiresAt && entry.expiresAt > now) {
          ytdlVideoCache.set(id, entry);
        }
      });
    }
  } catch (err) {
    console.warn('[YouTube Cache] Failed to load cache:', (err as any)?.message || err);
  }
}

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistCacheToDisk();
  }, 5000);
}

function persistCacheToDisk() {
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const payload: CachePayload = {
      audio: Object.fromEntries(ytdlFormatCache.entries()),
      video: Object.fromEntries(ytdlVideoCache.entries()),
    };
    fs.writeFileSync(cacheFilePath, JSON.stringify(payload));
  } catch (err) {
    console.warn('[YouTube Cache] Failed to write cache:', (err as any)?.message || err);
  }
}

process.on('exit', persistCacheToDisk);
process.on('SIGINT', () => {
  persistCacheToDisk();
  process.exit(0);
});
process.on('SIGTERM', () => {
  persistCacheToDisk();
  process.exit(0);
});

loadCacheFromDisk();

async function getYouTubeStreamUrl(videoId: string): Promise<string | null> {
  const cached = ytdlFormatCache.get(videoId);
  const hasFreshCache = cached && cached.expiresAt > Date.now();
  if (hasFreshCache) {
    return cached!.url;
  }
  if (cached && cached.expiresAt <= Date.now()) {
    ytdlFormatCache.delete(videoId);
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // play-dl optimization: Skip detailed video info if it flakes
    const info = await playdl.video_info(videoUrl).catch(() => {
      console.warn(`[play-dl] video_info failed for ${videoId}, trying stream directly...`);
      return null;
    });

    let best: any = null;

    if (info && info.format) {
      const audioFormats = (info.format as any[]).filter(
        (f) => f.mimeType?.includes('audio') && f.url
      );

      if (audioFormats.length > 0) {
        // Prioritize Opus for speed/quality, then AAC
        const opus = audioFormats.find((f) => f.mimeType?.includes('opus'));
        const aac = audioFormats.find((f) => f.mimeType?.includes('mp4') || f.mimeType?.includes('aac'));
        best = opus || aac || audioFormats[0];
      }
    }

    // Si play-dl no dio formatos via video_info, intentamos playdl.stream (otra vía interna)
    if (!best) {
      try {
        const stream = await playdl.stream(videoUrl, { quality: 0 }); // 0 = audio only best
        if (stream && stream.url) {
          best = { url: stream.url, mimeType: 'audio/mpeg' }; // Aproximado
        }
      } catch { /* ignore and fallback to yt-dlp */ }
    }

    if (best && best.url) {
      const url: string = best.url;
      const urlExpiry = getUrlExpiryMs(url);
      const expiresAt = urlExpiry ? Math.max(Date.now() + 60_000, urlExpiry - 60_000) : Date.now() + YOUTUBE_INFO_TTL_MS;
      ytdlFormatCache.set(videoId, { url, expiresAt });
      schedulePersist();
      console.log(`[getYouTubeStreamUrl] URL obtenida para ${videoId}, type: ${best.mimeType || 'unknown'}`);
      logInfo(`Track resolved via play-dl videoId=${videoId} mime=${best.mimeType || 'unknown'}`);
      return url;
    } else {
      throw new Error(`play-dl returned no valid formats for ${videoId}`);
    }
  } catch (err: any) {
    console.warn(`[getYouTubeStreamUrl] Error play-dl para ${videoId}:`, err.message);
    logWarn(`play-dl failed videoId=${videoId} error=${err.message || err}`);
  }

  // FALLBACK a yt-dlp: Solo pedir JSON plano, sin playlist ni info extra
  try {
    console.log(`[getYouTubeStreamUrl] Iniciando yt-dlp fallback (FAST mode) para ${videoId}...`);
    const raw = await youtubedl(`https://www.youtube.com/watch?v=${videoId}`, {
      dumpSingleJson: true, // Faster than dumpJson
      noPlaylist: true,
      format: 'bestaudio',
      noCheckCertificates: true,
      noWarnings: true,
      skipDownload: true, // Critical speedup
    }) as any;

    if (raw && raw.url) {
      const url = raw.url;
      const urlExpiry = getUrlExpiryMs(url);
      const expiresAt = urlExpiry ? Math.max(Date.now() + 60_000, urlExpiry - 60_000) : Date.now() + YOUTUBE_INFO_TTL_MS;
      ytdlFormatCache.set(videoId, { url, expiresAt });
      schedulePersist();
      console.log(`[getYouTubeStreamUrl] (Fallback yt-dlp) URL obtenida para ${videoId}`);
      logInfo(`Track resolved via yt-dlp videoId=${videoId}`);
      return url;
    }
  } catch (fallbackErr: any) {
    console.error(`[getYouTubeStreamUrl] yt-dlp fallback fallo para ${videoId}:`, fallbackErr.message);
    logError(`yt-dlp failed videoId=${videoId} error=${fallbackErr.message || fallbackErr}`);
  }

  return null;
}

async function getYouTubeVideoStreamUrl(videoId: string, prefer: 'auto' | 'mp4' | 'webm' = 'auto'): Promise<{ url: string; mimeType?: string } | null> {
  const cached = ytdlVideoCache.get(videoId);
  const hasFreshCache = cached && cached.expiresAt > Date.now();
  if (hasFreshCache && prefer === 'auto') {
    return { url: cached!.url, mimeType: cached!.mimeType };
  }
  if (cached && cached.expiresAt <= Date.now()) {
    ytdlVideoCache.delete(videoId);
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await playdl.video_info(videoUrl);

    // Buscar video (mp4/webm) sin audio preferiblemente, o con audio.
    // Prioridad: mp4 + avc1 (H.264) por compatibilidad.
    // Luego: 720p (Equilibrio perfecto) > 360p (Rapido) > 1080p (Lento).
    const formats = info.format as any[];

    // Filtrar solo video
    const videoFormats = formats.filter(f => f.mimeType?.includes('video'));

    if (!videoFormats.length) return null;

    const isMp4 = (f: any) => typeof f.mimeType === 'string' && f.mimeType.includes('mp4');
    const isWebm = (f: any) => typeof f.mimeType === 'string' && f.mimeType.includes('webm');
    const isAvc1 = (f: any) => {
      const mime = typeof f.mimeType === 'string' ? f.mimeType : '';
      const codecs = typeof f.codecs === 'string' ? f.codecs : '';
      return mime.includes('avc1') || codecs.includes('avc1');
    };

    // Ordenar por calidad (aproximada por bitrate o height)
    // play-dl formats tienen 'qualityLabel' (e.g. '1080p', '720p')
    let bestVideo: any | undefined;
    if (prefer === 'webm') {
      bestVideo = videoFormats.find(f => f.qualityLabel === '720p' && isWebm(f)) ||
        videoFormats.find(f => f.qualityLabel === '360p' && isWebm(f)) ||
        videoFormats.find(f => isWebm(f));
    } else if (prefer === 'mp4') {
      bestVideo = videoFormats.find(f => f.qualityLabel === '720p' && isMp4(f) && isAvc1(f)) ||
        videoFormats.find(f => f.qualityLabel === '360p' && isMp4(f) && isAvc1(f)) ||
        videoFormats.find(f => isMp4(f) && isAvc1(f)) ||
        videoFormats.find(f => f.qualityLabel === '720p' && isMp4(f)) ||
        videoFormats.find(f => f.qualityLabel === '360p' && isMp4(f)) ||
        videoFormats.find(f => isMp4(f));
    } else {
      bestVideo = videoFormats.find(f => f.qualityLabel === '720p' && isMp4(f) && isAvc1(f)) ||
        videoFormats.find(f => f.qualityLabel === '360p' && isMp4(f) && isAvc1(f)) ||
        videoFormats.find(f => isMp4(f) && isAvc1(f)) ||
        videoFormats.find(f => f.qualityLabel === '720p' && isMp4(f)) ||
        videoFormats.find(f => f.qualityLabel === '360p' && isMp4(f)) ||
        videoFormats.find(f => isMp4(f)) ||
        videoFormats.find(f => f.qualityLabel === '720p' && isWebm(f)) ||
        videoFormats.find(f => f.qualityLabel === '360p' && isWebm(f)) ||
        videoFormats.find(f => isWebm(f));
    }
    if (!bestVideo) {
      bestVideo = videoFormats[0];
    }

    if (bestVideo && bestVideo.url) {
      if (prefer === 'auto') {
        const urlExpiry = getUrlExpiryMs(bestVideo.url);
        const expiresAt = urlExpiry ? Math.max(Date.now() + 60_000, urlExpiry - 60_000) : Date.now() + YOUTUBE_INFO_TTL_MS;
        ytdlVideoCache.set(videoId, { url: bestVideo.url, mimeType: bestVideo.mimeType, expiresAt });
        schedulePersist();
      }
      console.log(`[getYouTubeVideoStreamUrl] Video URL obtenida para ${videoId}: ${bestVideo.qualityLabel} (${bestVideo.mimeType || 'unknown'}) prefer=${prefer}`);
      logInfo(`Video resolved via play-dl videoId=${videoId} prefer=${prefer} mime=${bestVideo.mimeType || 'unknown'}`);
      return { url: bestVideo.url, mimeType: bestVideo.mimeType };
    }
  } catch (err) {
    console.error(`[getYouTubeVideoStreamUrl] Error getting video for ${videoId}:`, err);
    logWarn(`play-dl video resolve failed videoId=${videoId} error=${(err as any)?.message || err}`);
  }

  // Fallback a yt-dlp para video
  try {
    console.log(`[getYouTubeVideoStreamUrl] Iniciando yt-dlp fallback para ${videoId} (prefer=${prefer})...`);
    const format =
      prefer === 'webm'
        ? 'bestvideo[ext=webm]/bestvideo'
        : 'bestvideo[ext=mp4][vcodec*=avc1]/bestvideo[ext=mp4]/bestvideo';
    const raw = await youtubedl(`https://www.youtube.com/watch?v=${videoId}`, {
      dumpSingleJson: true,
      noPlaylist: true,
      format,
      noCheckCertificates: true,
      noWarnings: true,
      skipDownload: true,
    }) as any;

    if (raw && raw.url) {
      const mimeType = raw.ext ? `video/${raw.ext}` : undefined;
      if (prefer === 'auto') {
        const urlExpiry = getUrlExpiryMs(raw.url);
        const expiresAt = urlExpiry ? Math.max(Date.now() + 60_000, urlExpiry - 60_000) : Date.now() + YOUTUBE_INFO_TTL_MS;
        ytdlVideoCache.set(videoId, { url: raw.url, mimeType, expiresAt });
        schedulePersist();
      }
      console.log(`[getYouTubeVideoStreamUrl] (Fallback yt-dlp) URL obtenida para ${videoId} (${mimeType || 'unknown'})`);
      logInfo(`Video resolved via yt-dlp videoId=${videoId} prefer=${prefer} mime=${mimeType || 'unknown'}`);
      return { url: raw.url, mimeType };
    }
  } catch (fallbackErr: any) {
    console.error(`[getYouTubeVideoStreamUrl] yt-dlp fallback fallo para ${videoId}:`, fallbackErr.message);
    logError(`yt-dlp video resolve failed videoId=${videoId} prefer=${prefer} error=${fallbackErr.message || fallbackErr}`);
  }

  return null;
}

export async function getYouTubeStreamUrlLocked(videoId: string): Promise<string | null> {
  const existing = audioResolveLocks.get(videoId);
  if (existing) return existing;
  const promise = getYouTubeStreamUrl(videoId)
    .finally(() => {
      audioResolveLocks.delete(videoId);
    });
  audioResolveLocks.set(videoId, promise);
  return promise;
}

async function getYouTubeVideoStreamUrlLocked(videoId: string, prefer: 'auto' | 'mp4' | 'webm' = 'auto'): Promise<{ url: string; mimeType?: string } | null> {
  const key = `${videoId}:${prefer}`;
  const existing = videoResolveLocks.get(key);
  if (existing) return existing;
  const promise = getYouTubeVideoStreamUrl(videoId, prefer)
    .finally(() => {
      videoResolveLocks.delete(key);
    });
  videoResolveLocks.set(key, promise);
  return promise;
}

async function searchInvidious(query: string, limit = 12, userAgent: string) {
  const instances = INVIDIOUS_INSTANCES.length ? INVIDIOUS_INSTANCES : [
    'https://invidious.snopyta.org',
    'https://invidious.kavin.rocks',
    'https://vid.plusday.net',
    'https://invidious.sethforprivacy.com',
    'https://invi.mazuun.tk',
    'https://yewtu.be',
    'https://invidious.fdn.fr'
  ];
  for (const base of instances) {
    try {
      console.log(`Trying Invidious search on ${base}...`);
      const response = await axios.get(`${base}/api/v1/search`, {
        params: { q: query, type: 'video' },
        timeout: 4000,
        headers: { 'User-Agent': userAgent },
        validateStatus: (s: number) => s === 200,
      });
      const items = Array.isArray(response.data) ? response.data : [];
      const results = items
        .filter((item: any) => item.type === 'video' && item.videoId && item.title)
        .slice(0, limit)
        .map((item: any) => ({
          videoId: item.videoId,
          title: item.title,
          duration: item.lengthSeconds ? String(item.lengthSeconds) : item.duration,
          thumbnail: item.videoThumbnails?.[0]?.url,
          channel: item.author,
          url: `https://www.youtube.com/watch?v=${item.videoId}`,
        }));
      if (results.length) {
        console.log(`Invidious search successful on ${base}`);
        return results;
      }
    } catch {
      // Silencio para no llenar el log
    }
  }
  return [];
}

async function searchYouTubeByQuery(query: string, limit = 12, userAgent: string) {
  const safeLimit = Math.min(limit, 20);
  console.log(`[Backend Search] Query: "${query}" (limit: ${safeLimit})`);

  try {
    // FASE 3: Usar yt-search (mas estable que ytsr)
    const searchResults = await yts(query);

    if (searchResults && searchResults.videos.length > 0) {
      const results = searchResults.videos
        .slice(0, safeLimit)
        .map((item: any) => ({
          videoId: item.videoId,
          title: item.title,
          duration: item.duration?.timestamp || String(item.seconds) || 'N/A',
          thumbnail: item.thumbnail || item.image || '',
          channel: item.author?.name || 'Unknown Channel',
          url: item.url,
        }));

      console.log(`[Backend Search] yt-search found ${results.length} results.`);
      return results;
    }
    console.log(`[Backend Search] yt-search returned 0 results.`);
  } catch (error: any) {
    console.error('[Backend Search] yt-search error:', error.message || error);
  }

  console.log('[Backend Search] Falling back to Invidious...');
  const invidiousResults = await searchInvidious(query, safeLimit, userAgent);
  console.log(`[Backend Search] Invidious found ${invidiousResults.length} results.`);
  return invidiousResults;
}

export function registerYouTubeRoutes(app: Express, userAgent: string) {
  app.get('/api/youtube/search', async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }

    try {
      const results = await searchYouTubeByQuery(query, limit, userAgent);
      return res.json({ query, count: results.length, results });
    } catch (error: any) {
      console.error('Error buscando YouTube en backend:', error.message || error);
      return res.status(500).json({ error: 'Search error' });
    }
  });

  app.get('/api/youtube/stream/:videoId/preload', async (req: Request, res: Response) => {
    const videoId = req.params.videoId as string;
    try {
      const streamUrl = await getYouTubeStreamUrlLocked(videoId);
      return res.json({ videoId, available: !!streamUrl });
    } catch {
      return res.status(500).json({ error: 'Preload failed' });
    }
  });

  app.get('/api/youtube/stream/:videoId', async (req: Request, res: Response) => {
    const videoId = req.params.videoId as string;
    const streamUrl = await getYouTubeStreamUrlLocked(videoId);
    if (!streamUrl) {
      return res.status(404).json({ error: 'Stream URL not available' });
    }
    return res.json({ videoId, streamUrl });
  });

  app.get('/api/youtube/stream/:videoId/proxy', async (req: Request, res: Response) => {
    const videoId = req.params.videoId as string;
    if (!videoId || videoId.length < 11) {
      return res.status(400).json({ error: 'Invalid video id' });
    }

    try {
      console.log(`[YouTube Proxy] Resolviendo stream para ${videoId}...`);
      const directUrl = await getYouTubeStreamUrlLocked(videoId);

      if (!directUrl) {
        console.warn(`[YouTube Proxy] No se pudo obtener URL para ${videoId}`);
        return res.status(404).json({ error: 'Stream not found' });
      }

      // Configuración de cabeceras para el proxy
      const headers: Record<string, string> = {
        'User-Agent': userAgent,
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
        'Accept': '*/*',
      };

      // BUG FIX (Arquitectura 7.1): Soporte nativo de Range para evitar cortes en tracks largos
      if (req.headers.range) {
        headers['Range'] = String(req.headers.range);
        console.log(`[YouTube Proxy] Request Range: ${req.headers.range} for ${videoId}`);
      }

      const controller = new AbortController();
      req.on('close', () => {
        controller.abort();
      });

      const response = await axios.get(directUrl, {
        responseType: 'stream',
        headers,
        signal: controller.signal,
        timeout: 0, // Inifinito para streams largos
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: (s: number) => s >= 200 && s < 400,
      });

      // Forwarding exact status (200 or 206 Partial Content)
      res.status(response.status);

      // Mapeo detallado de cabeceras de respuesta
      const responseHeaders = response.headers;
      if (responseHeaders['content-type']) res.setHeader('Content-Type', responseHeaders['content-type']);
      if (responseHeaders['content-length']) res.setHeader('Content-Length', responseHeaders['content-length']);
      if (responseHeaders['accept-ranges']) res.setHeader('Accept-Ranges', responseHeaders['accept-ranges']);
      if (responseHeaders['content-range']) res.setHeader('Content-Range', responseHeaders['content-range']);
      if (responseHeaders['cache-control']) res.setHeader('Cache-Control', responseHeaders['cache-control']);

      // Asegurar que siempre haya Accept-Ranges si es posible
      if (!res.getHeader('Accept-Ranges')) res.setHeader('Accept-Ranges', 'bytes');

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Connection', 'keep-alive');

      response.data.pipe(res);

      response.data.on('error', (err: any) => {
        if (err.code !== 'ABORTED' && err.code !== 'ECONNRESET' && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
          console.error(`[YouTube Proxy] Stream data error for ${videoId}:`, err.message);
        }
      });

      // Asegurar que el socket se cierre si hay error
      res.on('error', () => {
        controller.abort();
        response.data.destroy();
      });

    } catch (error: any) {
      if (axios.isCancel(error)) return;

      console.error(`[YouTube Proxy] Error fatal en ${videoId}:`, error.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Failed to proxy stream' });
      }
    }
  });

  // Endpoint para VIDEO (Visuals)
  app.get('/api/youtube/video-stream/:videoId', async (req: Request, res: Response) => {
    const videoId = req.params.videoId as string;
    const preferRaw = String(req.query.format || 'auto').toLowerCase();
    const prefer = (preferRaw === 'webm' || preferRaw === 'mp4') ? preferRaw : 'auto';

    try {
      console.log(`[YouTube Video Proxy] Buscando video para ${videoId} (prefer=${prefer})...`);
      const direct = await getYouTubeVideoStreamUrlLocked(videoId, prefer as 'auto' | 'mp4' | 'webm');

      if (!direct) {
        return res.status(404).json({ error: 'Video stream not found' });
      }

      const headers: Record<string, string> = {
        'User-Agent': userAgent,
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
      };
      if (req.headers.range) {
        headers['Range'] = String(req.headers.range);
      }

      const controller = new AbortController();
      req.on('close', () => controller.abort());

      const response = await axios.get(direct.url, {
        responseType: 'stream',
        headers,
        signal: controller.signal,
        timeout: 0,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: (s: number) => s >= 200 && s < 400,
      });

      res.status(response.status);

      // Copiar headers
      const keysToCopy = ['content-type', 'content-length', 'accept-ranges', 'content-range', 'cache-control'];
      keysToCopy.forEach(key => {
        if (response.headers[key]) res.setHeader(key, response.headers[key]);
      });
      if (!response.headers['content-type'] && direct.mimeType) {
        res.setHeader('Content-Type', direct.mimeType);
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Connection', 'keep-alive');
      response.data.pipe(res);

    } catch (error: any) {
      console.error(`[YouTube Video Proxy] Error:`, error.message);
      if (!res.headersSent) res.status(502).json({ error: 'Failed to proxy video' });
    }
  });
}
