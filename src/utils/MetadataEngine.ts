import { searchEverything as searchUnified } from './unifiedMusicAPI';
import { UnifiedTrackMetadata, Track } from '../types';
import { lastfmService } from './lastfm';
import * as Spotify from './spotifyAPI';
import { BACKEND_URL } from './apiConfig';
import { searchYouTubeMusic } from './youtubeAPI';
import * as Cache from './cacheManager';

async function fetchDeezerJson(path: string) {
    try {
        const response = await fetch(`/api-deezer${path}`);
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * MetadataEngine: The core AAA engine for SoundVizion.
 * Consolidates metadata from Spotify/Last.fm and playback from YouTube.
 */
export const MetadataEngine = {
    isLikelySpotifyId(id?: string): boolean {
        return !!id && /^[A-Za-z0-9]{22}$/.test(id);
    },
    /**
     * Performs a deep search across all connected platforms
     */
    async search(query: string) {
        console.log('🚀 MetadataEngine: Executing Deep Search for:', query);
        return await searchUnified(query);
    },

    /**
     * Fetches detailed artist biography and recommendations
     */
    async getArtistDetails(artistName: string) {
        const cached = await Cache.getCachedMetadata(`artist_${artistName}`);
        if (cached) return cached;

        const info = await lastfmService.getArtistInfo(artistName);
        return info;
    },

    /**
     * Signals the engine that a track has been played
     */
    async logPlayback(artist: string, track: string) {
        return await lastfmService.scrobble(artist, track);
    },

    /**
     * Internal mapper for Spotify tracks
     */
    mapSpotifyToUnified(track: any): UnifiedTrackMetadata {
        return {
            title: track.name,
            artist: track.artists.map((a: any) => a.name).join(', '),
            album: track.album?.name || '',
            albumArtist: track.album?.artists?.[0]?.name,
            year: track.album?.release_date ? new Date(track.album.release_date).getFullYear() : undefined,
            duration: Math.floor(track.duration_ms / 1000),
            isrc: track.external_ids?.isrc,
            artwork: {
                small: track.album?.images?.[2]?.url,
                medium: track.album?.images?.[1]?.url,
                large: track.album?.images?.[0]?.url,
                extralarge: track.album?.images?.[0]?.url,
            },
            externalIds: {
                spotify: track.id,
            },
            popularity: track.popularity,
            previewUrl: track.preview_url,
            source: 'spotify'
        };
    },

    /**
     * Fetches a complete artist profile with AAA details
     */
    async getArtistFullProfile(artistName: string, spotifyId?: string) {
        const cacheKey = `artist_profile_${spotifyId || artistName.toLowerCase().replace(/\s+/g, '_')}`;
        const cached = await Cache.getCachedMetadata(cacheKey);
        if (cached) return cached;

        const deezerArtistId = spotifyId?.startsWith('deezer-artist:') ? spotifyId.replace('deezer-artist:', '') : null;
        const [deezerSearch, deezerArtistDirect, lfmInfo, mbArtist] = await Promise.all([
            fetchDeezerJson(`/search?q=${encodeURIComponent(artistName)}&limit=20`),
            deezerArtistId ? fetchDeezerJson(`/artist/${encodeURIComponent(deezerArtistId)}`) : Promise.resolve(null),
            lastfmService.getArtistInfo(artistName),
            (async () => {
                try {
                    const response = await fetch(
                        `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(`artist:${artistName}`)}&fmt=json&limit=1`,
                        { headers: { 'User-Agent': 'SoundVzn/1.0.0 (contact@soundvzn.com)' } }
                    );
                    if (!response.ok) return null;
                    const data = await response.json();
                    return data.artists?.[0] || null;
                } catch {
                    return null;
                }
            })(),
        ]);

        const deezerArtist = deezerArtistDirect || deezerSearch?.data?.[0]?.artist || null;
        const deezerId = deezerArtist?.id ? String(deezerArtist.id) : null;
        const [deezerTop, deezerAlbums, deezerRelated] = await Promise.all([
            deezerId ? fetchDeezerJson(`/artist/${encodeURIComponent(deezerId)}/top?limit=12`) : Promise.resolve(null),
            deezerId ? fetchDeezerJson(`/artist/${encodeURIComponent(deezerId)}/albums?limit=18`) : Promise.resolve(null),
            deezerId ? fetchDeezerJson(`/artist/${encodeURIComponent(deezerId)}/related?limit=12`) : Promise.resolve(null),
        ]);

        const mbReleaseGroups = await (async () => {
            try {
                if (!mbArtist?.id) return [];
                const response = await fetch(
                    `https://musicbrainz.org/ws/2/release-group?artist=${encodeURIComponent(mbArtist.id)}&fmt=json&limit=10&type=album|ep|single`,
                    { headers: { 'User-Agent': 'SoundVzn/1.0.0 (contact@soundvzn.com)' } }
                );
                if (!response.ok) return [];
                const data = await response.json();
                return data['release-groups'] || [];
            } catch {
                return [];
            }
        })();

        const deezerTracksMapped = (deezerTop?.data || []).map((t: any) => ({
            title: t.title,
            artist: t.artist?.name || artistName,
            album: t.album?.title || '',
            duration: t.duration || 0,
            artwork: {
                small: t.album?.cover_small,
                medium: t.album?.cover_medium,
                large: t.album?.cover_big,
                extralarge: t.album?.cover_xl,
            },
            externalIds: {
                deezer: t.id?.toString(),
            },
            previewUrl: t.preview,
            source: 'deezer'
        }));

        const deezerAlbumsMapped = (deezerAlbums?.data || []).map((a: any) => ({
            id: `deezer-album:${a.id}`,
            title: a.title,
            image: a.cover_medium || a.cover_big || a.cover_xl,
            year: a.release_date ? new Date(a.release_date).getFullYear() : undefined,
            type: a.record_type || 'album'
        }));

        const relatedMapped = (deezerRelated?.data || []).map((a: any) => ({
            id: `deezer-artist:${a.id}`,
            name: a.name,
            image: a.picture_medium || a.picture_big || a.picture_xl
        }));

        // Optional Spotify enrichment: image + popularity only.
        let spotifyImage: string | undefined;
        let spotifyPopularity: number | undefined;
        let spotifyArtistId = this.isLikelySpotifyId(spotifyId) ? spotifyId : undefined;
        try {
            if (!spotifyArtistId) {
                const spotifyArtists = await Spotify.searchSpotifyArtists(artistName, 1);
                spotifyArtistId = spotifyArtists[0]?.id;
                spotifyImage = spotifyArtists[0]?.images?.[0]?.url;
                spotifyPopularity = spotifyArtists[0]?.popularity;
            } else {
                const spotifyArt = await Spotify.getSpotifyArtistInfo(spotifyArtistId);
                spotifyImage = spotifyArt?.images?.[0]?.url;
                spotifyPopularity = spotifyArt?.popularity;
            }
        } catch {
            // optional
        }

        const profile = {
            name: deezerArtist?.name || artistName,
            bio: lfmInfo?.bio,
            image: spotifyImage || deezerArtist?.picture_big || deezerArtist?.picture_medium || lfmInfo?.image,
            listeners: lfmInfo?.listeners || deezerArtist?.nb_fan,
            playcount: lfmInfo?.playcount,
            tags: lfmInfo?.tags,
            popularity: spotifyPopularity,
            topTracks: deezerTracksMapped,
            albums: [
                ...deezerAlbumsMapped,
                ...mbReleaseGroups.map((a: any) => ({
                    id: `mb:${a.id}`,
                    title: a.title,
                    image: a.id ? `https://coverartarchive.org/release-group/${a.id}/front-500` : spotifyImage,
                    year: a['first-release-date'] ? new Date(a['first-release-date']).getFullYear() : undefined,
                    type: a['primary-type'] || 'Album'
                })),
            ].slice(0, 16),
            related: relatedMapped
        };

        await Cache.setCachedMetadata(cacheKey, profile);
        return profile;
    },

    async getAlbumInfo(albumId: string) {
        const deezerId = albumId.startsWith('deezer-album:') ? albumId.replace('deezer-album:', '') : null;
        if (deezerId) {
            const data = await fetchDeezerJson(`/album/${encodeURIComponent(deezerId)}`);
            if (!data) return null;
            return {
                id: `deezer-album:${data.id}`,
                title: data.title,
                artist: data.artist?.name,
                image: data.cover_xl || data.cover_big || data.cover_medium,
                thumbnail: data.cover_medium || data.cover,
                year: data.release_date ? new Date(data.release_date).getFullYear() : undefined,
                genres: (data.genres?.data || []).map((g: any) => g.name)
            };
        }

        const itunesId = albumId.startsWith('itunes-album:') ? albumId.replace('itunes-album:', '') : null;
        if (itunesId) {
            try {
                const response = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(itunesId)}&entity=song`);
                if (!response.ok) return null;
                const data = await response.json();
                const album = (data.results || []).find((r: any) => r.wrapperType === 'collection');
                if (!album) return null;
                return {
                    id: `itunes-album:${album.collectionId}`,
                    title: album.collectionName,
                    artist: album.artistName,
                    image: album.artworkUrl100?.replace('100x100bb.jpg', '1200x1200bb.jpg'),
                    thumbnail: album.artworkUrl100?.replace('100x100bb.jpg', '600x600bb.jpg'),
                    year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : undefined,
                    genres: album.primaryGenreName ? [album.primaryGenreName] : []
                };
            } catch {
                return null;
            }
        }

        const mbId = albumId.startsWith('mb:') ? albumId.replace('mb:', '') : null;
        if (mbId) {
            try {
                const response = await fetch(
                    `https://musicbrainz.org/ws/2/release-group/${encodeURIComponent(mbId)}?fmt=json`,
                    { headers: { 'User-Agent': 'SoundVzn/1.0.0 (contact@soundvzn.com)' } }
                );
                if (!response.ok) return null;
                const data = await response.json();
                return {
                    id: `mb:${data.id}`,
                    title: data.title,
                    artist: data['artist-credit']?.[0]?.name,
                    image: data.id ? `https://coverartarchive.org/release-group/${data.id}/front-1200` : undefined,
                    thumbnail: data.id ? `https://coverartarchive.org/release-group/${data.id}/front-500` : undefined,
                    year: data['first-release-date'] ? new Date(data['first-release-date']).getFullYear() : undefined,
                    genres: []
                };
            } catch {
                return null;
            }
        }

        if (!this.isLikelySpotifyId(albumId)) {
            return null;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/spotify/albums/${albumId}`);
            if (!response.ok) return null;
            const data = await response.json();
            return {
                id: data.id,
                title: data.name,
                artist: data.artists?.[0]?.name,
                image: data.images?.[0]?.url,
                thumbnail: data.images?.[1]?.url,
                year: data.release_date ? new Date(data.release_date).getFullYear() : undefined,
                genres: data.genres
            };
        } catch (error) {
            return null;
        }
    },

    /**
     * Gets data for the Home/Dashboard view
     */
    async getHomeDashboard(seedTrack?: Track | null, forceRefresh = false) {
        const DASHBOARD_CACHE_KEY = 'home_dashboard_v3'; // Renombrado para forzar purga
        const TWO_MINUTES = 2 * 60 * 1000;

        try {
            if (!forceRefresh) {
                const cachedWrap = await Cache.getCachedMetadata(DASHBOARD_CACHE_KEY);
                const now = Date.now();

                if (cachedWrap && (now - cachedWrap.timestamp < TWO_MINUTES)) {
                    return cachedWrap.data;
                }
            }
        } catch (e) {
            console.warn('Dashboard cache read failed, proceeding without cache.');
        }

        const normalize = (t: string) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const keyOf = (title: string, artist: string) => `${normalize(title)}|${normalize((artist || '').split(',')[0])}`;
        const mapDeezerTrack = (t: any): UnifiedTrackMetadata => ({
            title: t.title,
            artist: t.artist?.name || '',
            album: t.album?.title || '',
            duration: t.duration || 0,
            popularity: typeof t.rank === 'number' ? Math.min(100, Math.floor(t.rank / 10000)) : undefined,
            artwork: {
                small: t.album?.cover_small,
                medium: t.album?.cover_medium,
                large: t.album?.cover_big,
                extralarge: t.album?.cover_xl,
            },
            externalIds: {
                deezer: t.id?.toString(),
            },
            previewUrl: t.preview,
            source: 'deezer'
        });

        const [chart, chartSpainData] = await Promise.all([
            fetchDeezerJson('/chart/0/tracks?limit=50'),
            fetchDeezerJson('/chart/1175/tracks?limit=10')
        ]);

        const chartTracks: any[] = chart?.data || [];
        const trending = chartTracks.map(mapDeezerTrack);
        const topSpain = (chartSpainData?.data || []).map(mapDeezerTrack);

        const seedArtist = seedTrack?.artist || '';
        const seedTitle = seedTrack?.title || '';
        const seedKey = keyOf(seedTitle, seedArtist);

        const spotlight = trending.find((t) => keyOf(t.title, t.artist) !== seedKey) || trending[0] || null;

        let sameArtistPool: UnifiedTrackMetadata[] = [];
        let relatedPool: UnifiedTrackMetadata[] = [];
        let emergentPool: UnifiedTrackMetadata[] = [];
        let recommendedArtists: Array<{ id: string; name: string; image?: string }> = [];

        if (seedArtist) {
            const artistSearch = await fetchDeezerJson(`/search/artist?q=${encodeURIComponent(seedArtist)}&limit=1`);
            const artistId = artistSearch?.data?.[0]?.id;

            if (artistId) {
                const [artistTop, related] = await Promise.all([
                    fetchDeezerJson(`/artist/${encodeURIComponent(String(artistId))}/top?limit=20`),
                    fetchDeezerJson(`/artist/${encodeURIComponent(String(artistId))}/related?limit=10`),
                ]);

                sameArtistPool = (artistTop?.data || [])
                    .map(mapDeezerTrack)
                    .filter((t: UnifiedTrackMetadata) => keyOf(t.title, t.artist) !== seedKey);

                const relatedArtists = (related?.data || []).slice(0, 5);
                recommendedArtists = relatedArtists.map((a: any) => ({
                    id: `deezer-artist:${a.id}`,
                    name: a.name,
                    image: a.picture_medium || a.picture_big || a.picture_xl,
                }));

                const relatedTop = await Promise.all(
                    relatedArtists.map((a: any) => fetchDeezerJson(`/artist/${encodeURIComponent(String(a.id))}/top?limit=4`))
                );
                relatedPool = relatedTop.flatMap((r: any) => (r?.data || []).map(mapDeezerTrack));
            }
        }

        emergentPool = trending
            .filter((t: UnifiedTrackMetadata) => normalize(t.artist) !== normalize(seedArtist))
            .slice(0, 20);

        const seen = new Set<string>();
        const takeUnique = (list: UnifiedTrackMetadata[], count: number) => {
            const out: UnifiedTrackMetadata[] = [];
            for (const t of list) {
                const k = keyOf(t.title, t.artist);
                if (!k || seen.has(k) || k === seedKey) continue;
                seen.add(k);
                out.push(t);
                if (out.length >= count) break;
            }
            return out;
        };

        // 40/40/20 => 4 + 4 + 2
        const recommendations = [
            ...takeUnique(sameArtistPool, 4),
            ...takeUnique(relatedPool, 4),
            ...takeUnique(emergentPool, 2),
        ];

        const remixSearch = await fetchDeezerJson(`/search?q=${encodeURIComponent(`${seedArtist || 'top'} remix`)}&limit=20`);
        const remixes = ((remixSearch?.data || []) as any[])
            .filter((t: any) => {
                const title = (t?.title || '').toLowerCase();
                return title.includes('remix') || title.includes('version') || title.includes('edit');
            })
            .map(mapDeezerTrack)
            .slice(0, 10);

        if (recommendedArtists.length === 0) {
            const artistMap = new Map<string, { id: string; name: string; image?: string }>();
            for (const t of chartTracks) {
                const a = t.artist;
                if (!a?.id || artistMap.has(String(a.id))) continue;
                artistMap.set(String(a.id), {
                    id: `deezer-artist:${a.id}`,
                    name: a.name,
                    image: a.picture_medium || a.picture_big || a.picture_xl,
                });
                if (artistMap.size >= 8) break;
            }
            recommendedArtists = Array.from(artistMap.values());
        }

        const dashboard = {
            spotlight,
            recommendations,
            topSpain,
            trends: trending.slice(0, 18),
            remixes,
            artists: recommendedArtists,
            newReleases: trending.slice(0, 12),
            trending: trending.slice(0, 12),
        };

        try {
            await Cache.setCachedMetadata(DASHBOARD_CACHE_KEY, {
                data: dashboard,
                timestamp: Date.now()
            });
        } catch (e) {
            console.warn('Failed to save dashboard to cache:', e);
        }
        return dashboard;
    },

    async getAlbumTracks(albumId: string) {
        const cacheKey = `album_tracks_${albumId}`;
        const cached = await Cache.getCachedMetadata(cacheKey);
        if (cached) return cached;

        const deezerId = albumId.startsWith('deezer-album:') ? albumId.replace('deezer-album:', '') : null;
        if (deezerId) {
            const data = await fetchDeezerJson(`/album/${encodeURIComponent(deezerId)}`);
            const albumTracks = data?.tracks?.data || [];
            const mapped = albumTracks.map((s: any) => ({
                title: s.title,
                artist: s.artist?.name || data?.artist?.name || '',
                album: data?.title || '',
                duration: s.duration || 0,
                artwork: {
                    small: data?.cover_small,
                    medium: data?.cover_medium,
                    large: data?.cover_big,
                    extralarge: data?.cover_xl,
                },
                externalIds: {
                    deezer: s.id?.toString(),
                    albumDeezer: data?.id?.toString(),
                },
                previewUrl: s.preview,
                source: 'deezer'
            }));
            await Cache.setCachedMetadata(cacheKey, mapped);
            return mapped;
        }

        const itunesId = albumId.startsWith('itunes-album:') ? albumId.replace('itunes-album:', '') : null;
        if (itunesId) {
            try {
                const response = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(itunesId)}&entity=song`);
                if (!response.ok) return [];
                const data = await response.json();
                const results = data.results || [];
                const album = results.find((r: any) => r.wrapperType === 'collection');
                const songs = results.filter((r: any) => r.wrapperType === 'track' || r.kind === 'song');
                const mapped = songs.map((s: any) => ({
                    title: s.trackName,
                    artist: s.artistName,
                    album: s.collectionName,
                    duration: Math.floor((s.trackTimeMillis || 0) / 1000),
                    artwork: {
                        small: s.artworkUrl60,
                        medium: s.artworkUrl100,
                        large: s.artworkUrl100?.replace('100x100bb.jpg', '600x600bb.jpg'),
                        extralarge: s.artworkUrl100?.replace('100x100bb.jpg', '1200x1200bb.jpg'),
                    },
                    externalIds: {
                        appleMusic: s.trackId?.toString(),
                        albumAppleMusic: album?.collectionId?.toString()
                    },
                    previewUrl: s.previewUrl,
                    source: 'itunes'
                }));
                await Cache.setCachedMetadata(cacheKey, mapped);
                return mapped;
            } catch {
                return [];
            }
        }

        const mbId = albumId.startsWith('mb:') ? albumId.replace('mb:', '') : null;
        if (mbId) {
            try {
                const response = await fetch(
                    `https://musicbrainz.org/ws/2/release?release-group=${encodeURIComponent(mbId)}&fmt=json&inc=recordings&limit=1`,
                    { headers: { 'User-Agent': 'SoundVzn/1.0.0 (contact@soundvzn.com)' } }
                );
                if (!response.ok) return [];
                const data = await response.json();
                const release = data.releases?.[0];
                const tracks = (release?.media || []).flatMap((m: any) => m.tracks || []);
                const unifiedTracks = tracks.map((t: any) => ({
                    title: t.title,
                    artist: release?.['artist-credit']?.[0]?.name || '',
                    album: release?.title || '',
                    duration: Math.floor((t.length || 0) / 1000),
                    artwork: {
                        small: mbId ? `https://coverartarchive.org/release-group/${mbId}/front-500` : undefined,
                        medium: mbId ? `https://coverartarchive.org/release-group/${mbId}/front-500` : undefined,
                        large: mbId ? `https://coverartarchive.org/release-group/${mbId}/front-1200` : undefined,
                        extralarge: mbId ? `https://coverartarchive.org/release-group/${mbId}/front-1200` : undefined,
                    },
                    externalIds: { musicbrainz: t.id },
                    source: 'musicbrainz'
                }));
                await Cache.setCachedMetadata(cacheKey, unifiedTracks);
                return unifiedTracks;
            } catch {
                return [];
            }
        }

        if (!this.isLikelySpotifyId(albumId)) {
            return [];
        }

        // Fetch primary album metadata to inherit artwork
        const albumData = await this.getAlbumInfo(albumId);

        const tracks = await Spotify.getSpotifyAlbumTracks(albumId);
        const unifiedTracks = tracks.map((t: any) => {
            const unified = this.mapSpotifyToUnified(t);
            // Inherit artwork if missing (Spotify album tracks endpoint often lacks it)
            if (albumData && (!unified.artwork.large || unified.artwork.large.includes('placeholder'))) {
                unified.artwork = {
                    small: albumData.thumbnail,
                    medium: albumData.thumbnail,
                    large: albumData.image,
                    extralarge: albumData.image
                };
                unified.album = albumData.title;
            }
            return unified;
        });

        await Cache.setCachedMetadata(cacheKey, unifiedTracks);
        return unifiedTracks;
    },

    /**
     * Flujo correcto: 1) Preview iTunes/Spotify 30s si existe y es válido.
     * 2) Si no hay preview → buscar en YouTube y reproducir con YouTube Player.
     */
    async resolvePlayableTrack(metadata: any): Promise<Track | null> {
        if (metadata.isLive || metadata.format === 'Radio') {
            return metadata as Track;
        }

        // Si ya es una URL de Proxy (localhost:3000), no re-resolver
        if (typeof metadata.filePath === 'string' && metadata.filePath.includes('/api/youtube/stream/')) {
            return metadata as Track;
        }

        // Si es un archivo local (no empieza con http), transformar a URL de Proxy local
        if (typeof metadata.filePath === 'string' && metadata.filePath.trim() !== '' && !metadata.filePath.startsWith('http')) {
            const track = { ...metadata };
            track.filePath = `http://localhost:3000/api/local/file?path=${encodeURIComponent(metadata.filePath)}`;
            return track as Track;
        }

          // Resolver directo si ya tenemos YouTube ID
          const directId = metadata.externalIds?.youtubeId || (metadata.format === 'YouTube' && typeof metadata.id === 'string' ? metadata.id : null);
          if (directId && directId.length === 11) {
              return {
                  id: directId,
                  title: metadata.title || 'YouTube Track',
                  artist: metadata.artist || 'Unknown Artist',
                  album: metadata.album || 'SoundVizion Stream',
                  duration: metadata.duration || 0,
                  filePath: `${BACKEND_URL}/api/youtube/stream/${directId}/proxy`,
                  format: 'YouTube',
                  bitrate: 192,
                  sampleRate: 48000,
                  artwork: metadata.artwork?.large || metadata.artwork?.medium || '',
                  favorite: false,
                  dateAdded: new Date().toISOString(),
                  playCount: 0,
                  externalIds: {
                      spotify: metadata.externalIds?.spotify,
                      isrc: metadata.isrc,
                      youtubeId: directId
                  }
              };
          }

          // const previewUrl = metadata.previewUrl ?? metadata.preview_url;
          // const hasValidPreview = typeof previewUrl === 'string' && previewUrl.trim().length > 0 && previewUrl.startsWith('http');

        try {
            const rawTitle = (metadata.title || '').trim();
            const rawArtist = (metadata.artist || '').trim();
            const baseTitle = rawTitle.replace(/\(.*?\)|\[.*?\]/g, ' ').trim();
            const baseArtist = rawArtist.split(',')[0].trim();

            const queries = [
                `${rawArtist} ${rawTitle}`, // Exacta (Remix, ft, etc)
                `${baseArtist} ${baseTitle} official audio`,
                `${baseArtist} ${baseTitle} music video`,
                `${baseArtist} ${baseTitle} topic`,
                `${baseArtist} ${baseTitle}`
            ].filter((q, i, self) => q.length > 0 && self.indexOf(q) === i);

            for (const query of queries) {
                const ytResults = await searchYouTubeMusic(query, 5);
                const yt = ytResults.find((r) => {
                    const t = (r.title || '').toLowerCase();
                    return !t.includes('live') && !t.includes('cover') && !t.includes('karaoke');
                }) || ytResults[0];

                if (yt?.videoId) {
                    return {
                        id: yt.videoId,
                        title: metadata.title || yt.title,
                        artist: metadata.artist || yt.artist,
                        album: metadata.album || 'SoundVizion Stream',
                        duration: metadata.duration || 0,
                        filePath: `${BACKEND_URL}/api/youtube/stream/${yt.videoId}/proxy`,
                        format: 'YouTube',
                        bitrate: 192,
                        sampleRate: 48000,
                        artwork: metadata.artwork?.large || metadata.artwork?.medium || yt.thumbnail,
                        favorite: false,
                        dateAdded: new Date().toISOString(),
                        playCount: 0,
                        externalIds: {
                            spotify: metadata.externalIds?.spotify,
                            isrc: metadata.isrc,
                            youtubeId: yt.videoId
                        }
                    };
                }
            }
        } catch (error) {
            console.error('YouTube resolution error:', error);
        }

        console.warn('YouTube resolution failed for:', metadata.title, '- Returning null to avoid 30s limit.');
        return null;
    },
    /**
     * Discovery v2: Fetches high-quality recommendations based on musical relationship using Deezer
     */
    async getTrendingAlbums(limit = 20) {
        const cacheKey = `trending_albums_${limit}`;
        const cached = await Cache.getCachedMetadata(cacheKey);
        if (cached) return cached;

        try {
            const data = await fetchDeezerJson(`/chart/0/albums?limit=${limit}`);
            const albums = (data?.data || []).map((a: any) => ({
                id: `deezer-album:${a.id}`,
                title: a.title,
                artist: a.artist?.name || 'Unknown Artist',
                art: a.cover_big || a.cover_medium || a.cover_xl || a.cover,
                badge: a.explicit_lyrics ? 'EXPLICIT' : 'Hi-Res'
            }));

            if (albums.length > 0) {
                await Cache.setCachedMetadata(cacheKey, albums);
            }
            return albums;
        } catch (error) {
            console.error('Failed to fetch trending albums:', error);
            return [];
        }
    },

    async getDiscoveryQueue(seedTrack: Track): Promise<UnifiedTrackMetadata[]> {
        try {
            const seedArtist = seedTrack.artist.split(',')[0].trim();
            const artistSearch = await fetchDeezerJson(`/search/artist?q=${encodeURIComponent(seedArtist)}&limit=1`);
            const artist = artistSearch?.data?.[0];

            if (!artist?.id) return [];

            const [related, topTracks] = await Promise.all([
                fetchDeezerJson(`/artist/${artist.id}/related?limit=5`),
                fetchDeezerJson(`/artist/${artist.id}/top?limit=10`)
            ]);

            const relatedArtists = related?.data || [];
            const seedTopTracks = (topTracks?.data || []).map((t: any) => this.mapDeezerTrack(t));

            const relatedTopTracksResults = await Promise.all(
                relatedArtists.map((a: any) => fetchDeezerJson(`/artist/${a.id}/top?limit=5`))
            );

            const relatedTopTracks = relatedTopTracksResults.flatMap((r: any) => (r?.data || []).map((t: any) => this.mapDeezerTrack(t)));

            const combined = [
                ...seedTopTracks.slice(0, 5),
                ...relatedTopTracks
            ].filter((t, index, self) =>
                self.findIndex(s => s.title.toLowerCase() === t.title.toLowerCase()) === index &&
                t.title.toLowerCase() !== seedTrack.title.toLowerCase()
            );

            return combined.sort(() => Math.random() - 0.5).slice(0, 15);
        } catch (error) {
            console.error('Discovery v2 failed:', error);
            return [];
        }
    },

    /**
     * Internal mapper for Deezer tracks
     */
    mapDeezerTrack(t: any): UnifiedTrackMetadata {
        return {
            title: t.title,
            artist: t.artist?.name || '',
            album: t.album?.title || '',
            duration: t.duration || 0,
            popularity: typeof t.rank === 'number' ? Math.min(100, Math.floor(t.rank / 10000)) : undefined,
            artwork: {
                small: t.album?.cover_small,
                medium: t.album?.cover_medium,
                large: t.album?.cover_big,
                extralarge: t.album?.cover_xl,
            },
            externalIds: {
                deezer: t.id?.toString(),
            },
            previewUrl: t.preview,
            source: 'deezer'
        };
    }
};

export default MetadataEngine;

