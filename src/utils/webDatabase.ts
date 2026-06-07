/**
 * webDatabase.ts
 * ──────────────────────────────────────────────────
 * IndexedDB relational database for SoundVizion Web.
 *
 * Schema (all stores):
 *   tracks          – primary audio library
 *   playlists       – user playlists (header data)
 *   playlist_tracks – join table: {playlistId, trackId, position}
 *   artists         – liked / followed artists
 *   profile         – single-row user preferences
 *   play_history    – timestamped play events
 *
 * All writes return Promises and are transactional.
 */

const DB_NAME = 'soundvzn_web';
const DB_VERSION = 2;

// ── Types ─────────────────────────────────────────

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  duration: number;
  youtubeId?: string;
  filePath?: string;
  format?: string;
  bitrate?: number;
  artwork?: string;
  favorite: boolean;
  addedDate: number;
  lastPlayed?: number;
  playCount: number;
  externalIds?: Record<string, string>;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  artwork?: string;
  createdDate: number;
  updatedDate: number;
  isPublic: boolean;
}

export interface PlaylistTrack {
  id: string;       // composite: `${playlistId}::${trackId}`
  playlistId: string;
  trackId: string;
  position: number;
  addedDate: number;
}

export interface Artist {
  id: string;       // artist name, normalized
  name: string;
  image?: string;
  likedDate: number;
}

export interface UserProfile {
  id: 'local';
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  tier: 'standard' | 'pro';
  theme?: string;
  language?: string;
}

export interface PlayEvent {
  id: number;       // auto-increment
  trackId: string;
  playedAt: number;
  durationMs: number;
}

// ── DB singleton ──────────────────────────────────

let _db: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (_db) return _db;

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // tracks
      if (!db.objectStoreNames.contains('tracks')) {
        const ts = db.createObjectStore('tracks', { keyPath: 'id' });
        ts.createIndex('by_artist',   'artist',     { unique: false });
        ts.createIndex('by_album',    'album',      { unique: false });
        ts.createIndex('by_favorite', 'favorite',   { unique: false });
        ts.createIndex('by_added',    'addedDate',  { unique: false });
        ts.createIndex('by_played',   'lastPlayed', { unique: false });
        ts.createIndex('by_youtube',  'youtubeId',  { unique: false });
      }

      // playlists
      if (!db.objectStoreNames.contains('playlists')) {
        const ps = db.createObjectStore('playlists', { keyPath: 'id' });
        ps.createIndex('by_updated', 'updatedDate', { unique: false });
      }

      // playlist_tracks (join table)
      if (!db.objectStoreNames.contains('playlist_tracks')) {
        const pts = db.createObjectStore('playlist_tracks', { keyPath: 'id' });
        pts.createIndex('by_playlist', 'playlistId', { unique: false });
        pts.createIndex('by_track',    'trackId',    { unique: false });
        pts.createIndex('by_position', ['playlistId', 'position'], { unique: false });
      }

      // artists
      if (!db.objectStoreNames.contains('artists')) {
        db.createObjectStore('artists', { keyPath: 'id' });
      }

      // profile (single row, key = 'local')
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }

      // play_history
      if (!db.objectStoreNames.contains('play_history')) {
        const ph = db.createObjectStore('play_history', { keyPath: 'id', autoIncrement: true });
        ph.createIndex('by_track',  'trackId',  { unique: false });
        ph.createIndex('by_time',   'playedAt', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

// ── Generic helpers ───────────────────────────────

function tx(db: IDBDatabase, stores: string | string[], mode: IDBTransactionMode = 'readonly') {
  return db.transaction(stores, mode);
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly') {
  const db = await openDB();
  return tx(db, storeName, mode).objectStore(storeName);
}

// ── Tracks ────────────────────────────────────────

export async function upsertTrack(track: Track): Promise<void> {
  const store = await getStore('tracks', 'readwrite');
  await promisify(store.put(track));
}

export async function getTrack(id: string): Promise<Track | undefined> {
  const store = await getStore('tracks');
  return promisify(store.get(id));
}

export async function getAllTracks(): Promise<Track[]> {
  const store = await getStore('tracks');
  const tracks: Track[] = await promisify(store.getAll());
  return tracks.sort((a, b) => b.addedDate - a.addedDate);
}

export async function getFavorites(): Promise<Track[]> {
  const store = await getStore('tracks');
  // IDB stores booleans as 0/1 depending on engine — fetch all + filter safer
  const tracks: Track[] = await promisify(store.getAll());
  return tracks.filter(t => t.favorite).sort((a, b) => b.addedDate - a.addedDate);
}

export async function toggleFavorite(trackId: string, value: boolean): Promise<void> {
  const db = await openDB();
  const t = tx(db, 'tracks', 'readwrite');
  const store = t.objectStore('tracks');
  const track: Track = await promisify(store.get(trackId));
  if (!track) return;
  track.favorite = value;
  await promisify(store.put(track));
}

export async function updatePlayCount(trackId: string): Promise<void> {
  const db = await openDB();
  const t = tx(db, ['tracks', 'play_history'], 'readwrite');
  const trackStore = t.objectStore('tracks');
  const histStore  = t.objectStore('play_history');

  const track: Track = await promisify(trackStore.get(trackId));
  if (!track) return;

  track.playCount  = (track.playCount || 0) + 1;
  track.lastPlayed = Date.now();
  trackStore.put(track);

  const event: Omit<PlayEvent, 'id'> = {
    trackId,
    playedAt:   Date.now(),
    durationMs: 0,
  };
  histStore.add(event);
}

export async function searchTracks(query: string): Promise<Track[]> {
  const all = await getAllTracks();
  const q = query.toLowerCase();
  return all.filter(
    t =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.album || '').toLowerCase().includes(q)
  );
}

export async function deleteTrack(id: string): Promise<void> {
  const store = await getStore('tracks', 'readwrite');
  await promisify(store.delete(id));
}

// ── Playlists ─────────────────────────────────────

export async function createPlaylist(name: string, description?: string): Promise<string> {
  const id = `pl_${Date.now()}`;
  const playlist: Playlist = {
    id, name, description,
    createdDate: Date.now(),
    updatedDate: Date.now(),
    isPublic: false,
  };
  const store = await getStore('playlists', 'readwrite');
  await promisify(store.put(playlist));
  return id;
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  const store = await getStore('playlists');
  const list: Playlist[] = await promisify(store.getAll());
  return list.sort((a, b) => b.updatedDate - a.updatedDate);
}

export async function getPlaylist(id: string): Promise<Playlist | undefined> {
  const store = await getStore('playlists');
  return promisify(store.get(id));
}

export async function updatePlaylist(id: string, data: Partial<Playlist>): Promise<void> {
  const db = await openDB();
  const t = tx(db, 'playlists', 'readwrite');
  const store = t.objectStore('playlists');
  const p: Playlist = await promisify(store.get(id));
  if (!p) return;
  await promisify(store.put({ ...p, ...data, updatedDate: Date.now() }));
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await openDB();
  const t = tx(db, ['playlists', 'playlist_tracks'], 'readwrite');

  t.objectStore('playlists').delete(id);

  // Remove all join rows for this playlist
  const ptsStore = t.objectStore('playlist_tracks');
  const idx = ptsStore.index('by_playlist');
  const keys: IDBValidKey[] = await promisify(idx.getAllKeys(IDBKeyRange.only(id)));
  keys.forEach(k => ptsStore.delete(k));
}

// ── Playlist ↔ Track relations ────────────────────

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  const db = await openDB();
  const t = tx(db, ['playlists', 'playlist_tracks'], 'readwrite');

  const ptsStore = t.objectStore('playlist_tracks');
  const idx = ptsStore.index('by_playlist');
  const existing: PlaylistTrack[] = await promisify(idx.getAll(IDBKeyRange.only(playlistId)));

  // Avoid duplicates
  if (existing.some(e => e.trackId === trackId)) return;

  const pt: PlaylistTrack = {
    id: `${playlistId}::${trackId}`,
    playlistId,
    trackId,
    position: existing.length,
    addedDate: Date.now(),
  };
  ptsStore.put(pt);

  // Touch playlist updatedDate
  const plStore = t.objectStore('playlists');
  const pl: Playlist = await promisify(plStore.get(playlistId));
  if (pl) plStore.put({ ...pl, updatedDate: Date.now() });
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
  const store = await getStore('playlist_tracks', 'readwrite');
  await promisify(store.delete(`${playlistId}::${trackId}`));
}

export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  const db = await openDB();
  const t = tx(db, ['playlist_tracks', 'tracks'], 'readonly');

  const ptsStore = t.objectStore('playlist_tracks');
  const idx = ptsStore.index('by_playlist');
  const rows: PlaylistTrack[] = await promisify(idx.getAll(IDBKeyRange.only(playlistId)));
  rows.sort((a, b) => a.position - b.position);

  const trackStore = t.objectStore('tracks');
  const tracks = await Promise.all(rows.map(r => promisify<Track>(trackStore.get(r.trackId))));
  return tracks.filter(Boolean);
}

// ── Artists ───────────────────────────────────────

export async function likeArtist(name: string, image?: string): Promise<void> {
  const artist: Artist = {
    id: name.toLowerCase().replace(/\s+/g, '_'),
    name,
    image,
    likedDate: Date.now(),
  };
  const store = await getStore('artists', 'readwrite');
  await promisify(store.put(artist));
}

export async function unlikeArtist(name: string): Promise<void> {
  const id = name.toLowerCase().replace(/\s+/g, '_');
  const store = await getStore('artists', 'readwrite');
  await promisify(store.delete(id));
}

export async function getLikedArtists(): Promise<Artist[]> {
  const store = await getStore('artists');
  const list: Artist[] = await promisify(store.getAll());
  return list.sort((a, b) => b.likedDate - a.likedDate);
}

export async function isArtistLiked(name: string): Promise<boolean> {
  const id = name.toLowerCase().replace(/\s+/g, '_');
  const store = await getStore('artists');
  const result = await promisify(store.get(id));
  return !!result;
}

// ── Profile ───────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  id: 'local',
  name: 'Cargando...',
  email: '',
  tier: 'standard',
  language: 'es',
};

export async function getProfile(): Promise<UserProfile> {
  const store = await getStore('profile');
  const p = await promisify<UserProfile>(store.get('local'));
  return p || DEFAULT_PROFILE;
}

export async function updateProfile(data: Partial<UserProfile>): Promise<void> {
  const db = await openDB();
  const t = tx(db, 'profile', 'readwrite');
  const store = t.objectStore('profile');
  const current = await promisify<UserProfile>(store.get('local'));
  await promisify(store.put({ ...(current || DEFAULT_PROFILE), ...data, id: 'local' }));
}

// ── Play History ──────────────────────────────────

export async function getRecentTracks(limit = 20): Promise<Track[]> {
  const all = await getAllTracks();
  return all
    .filter(t => t.lastPlayed)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .slice(0, limit);
}

export async function getTopTracks(limit = 20): Promise<Track[]> {
  const all = await getAllTracks();
  return all
    .filter(t => t.playCount > 0)
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit);
}

// ── Stats ─────────────────────────────────────────

export async function getLibraryStats(): Promise<{
  totalTracks: number;
  totalFavorites: number;
  totalPlaylists: number;
  totalMinutes: number;
  topArtist: string;
  topGenre: string;
}> {
  const [tracks, favorites, playlists] = await Promise.all([
    getAllTracks(),
    getFavorites(),
    getAllPlaylists(),
  ]);

  const totalMinutes = Math.floor(
    tracks.reduce((acc, t) => acc + (t.playCount || 0) * (t.duration || 0), 0) / 60
  );

  const artistCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};

  for (const t of tracks) {
    if (t.artist) artistCounts[t.artist] = (artistCounts[t.artist] || 0) + (t.playCount || 1);
    if (t.genre)  genreCounts[t.genre]   = (genreCounts[t.genre]   || 0) + (t.playCount || 1);
  }

  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  const topGenre  = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return {
    totalTracks:    tracks.length,
    totalFavorites: favorites.length,
    totalPlaylists: playlists.length,
    totalMinutes,
    topArtist,
    topGenre,
  };
}

// ── Migrate from localStorage (one-time) ──────────

export async function migrateFromLocalStorage(): Promise<void> {
  const migrated = localStorage.getItem('svzn_idb_migrated');
  if (migrated) return;

  console.log('[WebDB] Migrating from localStorage to IndexedDB...');

  try {
    // Find any localStorage tracks key
    const keys = Object.keys(localStorage).filter(k => k.includes('soundvzn_tracks'));
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const tracks = JSON.parse(raw);
      if (!Array.isArray(tracks)) continue;

      for (const t of tracks) {
        await upsertTrack({
          id:         t.id || `m_${Date.now()}_${Math.random()}`,
          title:      t.title || 'Unknown',
          artist:     t.artist || 'Unknown',
          album:      t.album || '',
          year:       t.year,
          genre:      t.genre,
          duration:   t.duration || 0,
          youtubeId:  t.youtubeId || t.externalIds?.youtube,
          filePath:   t.filePath,
          format:     t.format,
          bitrate:    t.bitrate,
          artwork:    typeof t.artwork === 'string' ? t.artwork : t.artwork?.large || t.artwork?.medium,
          favorite:   !!t.favorite,
          addedDate:  t.addedDate || Date.now(),
          lastPlayed: t.lastPlayed,
          playCount:  t.playCount || 0,
          externalIds: t.externalIds,
        });
      }
      console.log(`[WebDB] Migrated ${tracks.length} tracks from ${key}`);
    }

    // Playlists
    const plKeys = Object.keys(localStorage).filter(k => k.includes('soundvzn_playlists'));
    for (const key of plKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const playlists = JSON.parse(raw);
      if (!Array.isArray(playlists)) continue;

      for (const pl of playlists) {
        await upsertPlaylistRaw(pl);
      }
    }

    localStorage.setItem('svzn_idb_migrated', '1');
    console.log('[WebDB] Migration complete.');
  } catch (err) {
    console.warn('[WebDB] Migration failed (non-critical):', err);
  }
}

async function upsertPlaylistRaw(pl: any): Promise<void> {
  const playlist: Playlist = {
    id:          pl.id || `pl_${Date.now()}`,
    name:        pl.name || 'Playlist',
    description: pl.description,
    artwork:     pl.artwork,
    createdDate: pl.createdDate || Date.now(),
    updatedDate: pl.updatedDate || Date.now(),
    isPublic:    !!pl.isPublic,
  };
  const store = await getStore('playlists', 'readwrite');
  await promisify(store.put(playlist));
}

// ── Init ──────────────────────────────────────────

export async function initWebDatabase(): Promise<void> {
  await openDB();
  await migrateFromLocalStorage();

  // Ensure default playlist exists
  const playlists = await getAllPlaylists();
  if (playlists.length === 0) {
    await createPlaylist('Mis Favoritos', 'Tu colección personal.');
  }

  console.log('[WebDB] Ready. IndexedDB schema v' + DB_VERSION);
}
