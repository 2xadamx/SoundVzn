interface TrackDB {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  duration: number;
  filePath: string;
  format?: string;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  lossless?: boolean;
  artwork?: string;
  favorite: boolean;
  addedDate: number;
  lastPlayed?: number;
  playCount: number;
}

interface PlaylistDB {
  id: string;
  name: string;
  description?: string;
  createdDate: number;
  updatedDate: number;
  artwork?: string;
  trackIds: string[];
  isPublic: boolean;
}

const TRACKS_KEY = 'svzn_tracks';
const PLAYLISTS_KEY = 'svzn_playlists';
const FOLLOWED_PLAYLISTS_KEY = 'svzn_followed_playlists';
const LIKED_ARTISTS_KEY = 'svzn_liked_artists';
const PROFILE_KEY = 'svzn_user';
const AUTH_TOKEN_KEY = 'svzn_token';

// Helper to get namespaced key without triggering expensive lookups
function getNsKey(baseKey: string): string {
  try {
    const profileStr = localStorage.getItem(PROFILE_KEY);
    let userId = 'guest';
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      // Compatibility logic: prioritize how IDs were generated in previous versions
      userId = profile.svzn_id ? profile.svzn_id.toString().padStart(6, '0') : (profile.id || profile.email || 'guest');
    }
    return `${userId.toString().toLowerCase()}_${baseKey}`;
  } catch {
    return `guest_${baseKey}`;
  }
}

interface UserProfile {
  name: string;
  email: string;
  svzn_id?: string | number;
  bio?: string;
  avatar?: string;
  banner?: string;
  tier: 'standard' | 'pro';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stats: {
    songs: number;
    hours: number;
    favorites: number;
    playlists: number;
  };
  anthem?: any;
}

export const TIER_LIMITS = {
  standard: {
    playlists: 9999,
    favorites: 9999,
    storageGB: -1
  },
  pro: {
    playlists: 9999,
    favorites: 9999,
    storageGB: -1
  }
};

let isDbInitialized = false;
let dbInitializationPromise: Promise<void> | null = null;

export async function clearAuthSession(): Promise<void> {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem('auth_access_token');
  localStorage.removeItem('auth_refresh_token');
  localStorage.removeItem('user_profile');

  if ((window as any).electron?.saveData) {
    await (window as any).electron.saveData(AUTH_TOKEN_KEY, null);
    await (window as any).electron.saveData(PROFILE_KEY, null);
    await (window as any).electron.saveData('auth_access_token', null);
    await (window as any).electron.saveData('auth_refresh_token', null);
    await (window as any).electron.saveData('user_profile', null);
  }
}

async function safeParse(key: string, defaultValue: any) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'null' || raw === 'undefined') return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[DB] JSON Parse error for ${key}, resetting to default.`, err);
    localStorage.removeItem(key);
    return defaultValue;
  }
}

export async function initDatabase(): Promise<void> {
  if (isDbInitialized) return;
  if (dbInitializationPromise) return dbInitializationPromise;

  dbInitializationPromise = (async () => {
    console.log('[DB] Starting initialization...');
    try {
      const isElectron = !!((window as any).electron && (window as any).electron.ipcRenderer);
      console.log(`[DB] Engine detected: ${isElectron ? 'Electron' : 'Web/Pure'}`);

      if (isElectron) {
        // Load from filesystem (only in desktop)
        const fsToken = await (window as any).electron.loadData(AUTH_TOKEN_KEY);
        if (fsToken && typeof fsToken === 'string') localStorage.setItem(AUTH_TOKEN_KEY, fsToken);

        let fsProfile = null;
        try { fsProfile = await (window as any).electron.loadData(PROFILE_KEY); } catch (e) { }
        if (fsProfile && typeof fsProfile === 'object') {
          localStorage.setItem(PROFILE_KEY, JSON.stringify(fsProfile));
        }
      }

      let finalProfile = await safeParse(PROFILE_KEY, {
        name: "Usuario",
        email: "",
        tier: "standard",
        bio: "No bio yet",
        created_at: Date.now()
      });
      console.log(`[Database] Initializing for User: ${finalProfile.name} (SV${(finalProfile.svzn_id || 0).toString().padStart(6, '0')})`);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(finalProfile));

      // Load full namespaced profile if available
      const nsProfileKey = getNsKey(PROFILE_KEY);
      console.log(`[DB] Looking for namespaced profile: ${nsProfileKey}`);
      let fsNsProfile = null;
      if (isElectron) {
        try { fsNsProfile = await (window as any).electron.loadData(nsProfileKey); } catch (e) { }
        if (fsNsProfile && typeof fsNsProfile === 'object') {
          console.log('[DB] Namespaced profile found, restoring session...');
          localStorage.setItem(nsProfileKey, JSON.stringify(fsNsProfile));
          localStorage.setItem(PROFILE_KEY, JSON.stringify(fsNsProfile));
          finalProfile = fsNsProfile;
        }
      }

      console.log(`[DB] Loading data for namespace: ${getNsKey('')}`);

      const tKey = getNsKey(TRACKS_KEY);
      const pKey = getNsKey(PLAYLISTS_KEY);

      let fsTracks = null;
      let fsPlaylists = null;
      if (isElectron) {
        try { fsTracks = await (window as any).electron.loadData(tKey); } catch (e) { }
        try { fsPlaylists = await (window as any).electron.loadData(pKey); } catch (e) { }

        if (Array.isArray(fsTracks)) localStorage.setItem(tKey, JSON.stringify(fsTracks));
        if (Array.isArray(fsPlaylists)) localStorage.setItem(pKey, JSON.stringify(fsPlaylists));
      }

      let userTracks = await safeParse(tKey, []);
      let userPlaylists = await safeParse(pKey, []);

      if (!Array.isArray(userPlaylists) || userPlaylists.length === 0) {
        const demoPlaylists: PlaylistDB[] = [{
          id: 'pl_demo_1',
          name: 'Mis Favoritos',
          description: 'Tu colección personal.',
          createdDate: Date.now(),
          updatedDate: Date.now(),
          trackIds: [],
          isPublic: false
        }];
        localStorage.setItem(pKey, JSON.stringify(demoPlaylists));
        await syncToFs(pKey, demoPlaylists);
      }

      // Migration
      if (finalProfile?.email && finalProfile.email !== 'guest') {
        if (userTracks.length === 0) {
          console.log('[DB] New user detected, attempting migration from guest...');
          // Check both possible guest keys
          const guestTracks = await safeParse('guest_svzn_tracks', null) || await safeParse('guest_tracks', []);

          if (guestTracks && guestTracks.length > 0) {
            console.log(`[DB] Migrating ${guestTracks.length} tracks.`);
            localStorage.setItem(tKey, JSON.stringify(guestTracks));
            await syncToFs(tKey, guestTracks);
          }
        }
        
        // Also migrate playlists
        if (userPlaylists.length <= 1) { // 1 is the default demo playlist
          const guestPlaylists = await safeParse('guest_svzn_playlists', null) || await safeParse('guest_playlists', []);
          if (guestPlaylists && guestPlaylists.length > 0) {
            console.log(`[DB] Migrating ${guestPlaylists.length} playlists.`);
            localStorage.setItem(pKey, JSON.stringify(guestPlaylists));
            await syncToFs(pKey, guestPlaylists);
          }
        }
      }

      isDbInitialized = true;

      // Basic Quota Management Cleanup (Background)
      setTimeout(() => cleanupOldTracks(), 5000);

      console.log('[DB] Initialization complete. isDbInitialized flag set to true.');

    } catch (err) {
      console.error('[DB] CRITICAL ERROR IN INIT DATABASE:', err);
      isDbInitialized = true;
    } finally {
      isDbInitialized = true;
    }
  })();

  // Security timeout to prevent absolute blank screens
  setTimeout(() => {
    if (!isDbInitialized) {
      console.warn('[DB] Forced initialization after timeout.');
      isDbInitialized = true;
    }
  }, 2000);

  return dbInitializationPromise;
}

async function cleanupOldTracks() {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks: any[] = await safeParse(key, []);
    if (tracks.length < 500) return;

    // Keep favorites and recently added
    const toKeep = tracks.filter((t: any) => t.favorite);
    const others = tracks.filter((t: any) => !t.favorite)
      .sort((a: any, b: any) => b.addedDate - a.addedDate);

    const cleaned = [...toKeep, ...others.slice(0, 300)];
    if (cleaned.length < tracks.length) {
      console.log(`[DB] Quota cleanup: reduced from ${tracks.length} to ${cleaned.length} tracks.`);
      localStorage.setItem(key, JSON.stringify(cleaned));
      await syncToFs(key, cleaned);
    }
  } catch (e) {
    console.warn('[DB] Cleanup failed', e);
  }
}





async function syncToFs(key: string, data: any) {
  try {
    const isElectron = !!(window as any).electron;
    if (isElectron) {
      console.log(`[DB] Syncing to FS: ${key}`, Array.isArray(data) ? `(Array[${data.length}])` : '(Object)');
      await (window as any).electron.saveData(key, data);
      console.log(`[DB] Sync to FS SUCCESS: ${key}`);
    }
  } catch (err) {
    console.error(`[DB] Sync to FS failed for ${key}:`, err);
  }
}

export function saveDatabase(): void {
}

export async function addTrack(track: any): Promise<void> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks: any[] = await safeParse(key, []);

    const trackId = track.id || `ext-${Date.now()}`;
    const existingIndex = tracks.findIndex(t => t.id === trackId);

    const trackDB: any = {
      id: trackId,
      title: track.title,
      artist: track.artist,
      album: track.album || "",
      year: track.year,
      genre: track.genre,
      duration: track.duration,
      filePath: track.filePath || "",
      format: track.format || "Cloud",
      bitrate: track.bitrate,
      sampleRate: track.sampleRate,
      bitDepth: track.bitDepth,
      lossless: track.lossless,
      artwork: typeof track.artwork === 'string' ? track.artwork : (track.artwork?.large || track.artwork?.medium || ""),
      favorite: track.favorite || false,
      addedDate: track.addedDate || Date.now(),
      lastPlayed: track.lastPlayed,
      playCount: track.playCount || 0,
      externalIds: track.externalIds || {}
    };

    if (existingIndex >= 0) {
      tracks[existingIndex] = { ...tracks[existingIndex], ...trackDB };
    } else {
      tracks.push(trackDB);
    }

    localStorage.setItem(key, JSON.stringify(tracks));
    await syncToFs(key, tracks);
  } catch (error) {
    console.error('Error adding track:', error);
  }
}

export async function ensureTrack(track: any): Promise<any> {
  const tracks = await getAllTracks();
  const existing = tracks.find(t =>
    (t.id && t.id === track.id) ||
    (track.externalIds?.spotify && t.externalIds?.spotify === track.externalIds.spotify) ||
    (t.title === track.title && t.artist === track.artist)
  );

  if (existing) return existing;

  const newId = track.id || `ext-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const newTrack = { ...track, id: newId };
  await addTrack(newTrack);
  return newTrack;
}

export async function updateTrackMetadata(id: string, metadata: Partial<TrackDB>): Promise<void> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks: TrackDB[] = await safeParse(key, []);
    const idx = tracks.findIndex(t => t.id === id);
    if (idx !== -1) {
      tracks[idx] = { ...tracks[idx], ...metadata };
      localStorage.setItem(key, JSON.stringify(tracks));
      await syncToFs(key, tracks);
    }
  } catch (error) {
    console.error('Error updating track metadata:', error);
  }
}

export async function getAllTracks(): Promise<any[]> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks = await safeParse(key, []);
    return tracks.sort((a: TrackDB, b: TrackDB) => b.addedDate - a.addedDate);
  } catch {
    return [];
  }
}

export async function searchTracks(query: string, filters?: { format?: string[], minYear?: number, maxYear?: number, minBitrate?: number, limit?: number }): Promise<any[]> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks: TrackDB[] = await safeParse(key, []);
    const lowerQuery = query.toLowerCase();

    return tracks
      .filter(track => {
        const matchesQuery = track.title.toLowerCase().includes(lowerQuery) ||
          track.artist.toLowerCase().includes(lowerQuery) ||
          (track.album && track.album.toLowerCase().includes(lowerQuery));

        if (!matchesQuery) return false;

        if (filters) {
          if (filters.format && filters.format.length > 0 && !filters.format.includes(track.format || '')) return false;
          if (filters.minYear && (track.year || 0) < filters.minYear) return false;
          if (filters.maxYear && (track.year || 0) > filters.maxYear) return false;
          if (filters.minBitrate && (track.bitrate || 0) < filters.minBitrate) return false;
        }

        return true;
      })
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, filters?.limit || 50);
  } catch {
    return [];
  }
}

export async function updatePlayCount(trackId: string): Promise<void> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks: TrackDB[] = await safeParse(key, []);
    const track = tracks.find(t => t.id === trackId);

    if (track) {
      track.playCount = (track.playCount || 0) + 1;
      track.lastPlayed = Date.now();

      const playedTracks = tracks
        .filter(t => t.lastPlayed)
        .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));

      if (playedTracks.length > 200) {
        const toClean = playedTracks.slice(200);
        toClean.forEach(t => {
          const original = tracks.find(ot => ot.id === t.id);
          if (original) delete original.lastPlayed;
        });
      }

      localStorage.setItem(key, JSON.stringify(tracks));
      await syncToFs(key, tracks);
    }
  } catch (error) {
    console.error('Error updating play count:', error);
  }
}

export async function toggleFavorite(track: any, favorite: boolean): Promise<void> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks: TrackDB[] = await safeParse(key, []);
    const existingIndex = tracks.findIndex(t => t.id === track.id);

    if (existingIndex >= 0) {
      tracks[existingIndex].favorite = favorite;
    } else if (favorite) {
      const trackDB: TrackDB = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album || '',
        duration: track.duration || 0,
        filePath: track.filePath || '',
        format: track.format || 'YouTube',
        artwork: track.artwork?.large || track.artwork?.medium || track.artwork || '',
        favorite: true,
        addedDate: Date.now(),
        playCount: 1,
      } as any;
      tracks.push(trackDB);
    }

    localStorage.setItem(key, JSON.stringify(tracks));
    console.log(`[DB] Favorite toggled: ${track.id} -> ${favorite} (${key})`);
    
    // Invalidate/Refresh virtual playlist if needed
    if (favorite) {
        await addTrackToPlaylist('favorites_v2', track.id);
    } else {
        await removeTrackFromPlaylist('favorites_v2', track.id);
    }

    await syncToFs(key, tracks);
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
}

export async function getFavorites(): Promise<any[]> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks: TrackDB[] = JSON.parse(localStorage.getItem(key) || '[]');
    // Deduplicar por ID antes de filtrar
    const seen = new Set<string>();
    return tracks
      .filter(t => {
        if (!t.favorite) return false;
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      })
      .sort((a, b) => b.addedDate - a.addedDate);
  } catch {
    return [];
  }
}

export async function createPlaylist(name: string, description?: string, isPublic: boolean = false): Promise<string> {
  const key = getNsKey(PLAYLISTS_KEY);
  const playlists: PlaylistDB[] = JSON.parse(localStorage.getItem(key) || '[]');

  // Eliminados los límites de tier para la versión web pública
  // const profile = await getProfile();
  // const limit = TIER_LIMITS[profile.tier].playlists;
  // if (playlists.length >= limit) {
  //   throw new Error('Limit reached');
  // }

  const id = `playlist_${Date.now()}`;
  const now = Date.now();

  const playlist: PlaylistDB = {
    id, name, description, createdDate: now, updatedDate: now, trackIds: [], isPublic,
  };

  playlists.push(playlist);
  localStorage.setItem(key, JSON.stringify(playlists));
  await syncToFs(key, playlists);

  return id;
}

export async function getAllPlaylists(): Promise<any[]> {
  try {
    const key = getNsKey(PLAYLISTS_KEY);
    const playlists = await safeParse(key, []);
    
    // Inyectar playlist virtual de favoritos con ID único
    // Filtramos cualquier versión antigua o duplicada por nombre
    let filteredPlaylists = playlists.filter((p: any) => 
        p.id !== 'favorites_v2' && 
        p.id !== 'pl_demo_1' && 
        p.name !== 'Favoritos' && 
        p.name !== 'Mis Favoritos'
    );

    const favs = await getFavorites();
    filteredPlaylists.unshift({
        id: 'favorites_v2',
        name: 'Favoritos',
        description: 'Tus canciones favoritas',
        trackIds: favs.map(t => t.id),
        createdDate: Date.now(),
        updatedDate: Date.now(),
        isPublic: false,
        isVirtual: true
    });

    return filteredPlaylists.sort((a: any, b: any) => {
        if (a.id === 'favorites_v2') return -1;
        if (b.id === 'favorites_v2') return 1;
        return (b.updatedDate || 0) - (a.updatedDate || 0);
    });
  } catch {
    return [];
  }
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  try {
    if (playlistId === 'favorites_v2') {
        const tracks = await getAllTracks();
        const t = tracks.find(tr => tr.id === trackId);
        if (t) await toggleFavorite(t, true);
        return;
    }

    if (playlistId === 'pl_demo_1') {
        const tracks = await getAllTracks();
        const t = tracks.find(tr => tr.id === trackId);
        if (t) await toggleFavorite(t, true);
        return;
    }

    const key = getNsKey(PLAYLISTS_KEY);
    const playlists: PlaylistDB[] = await safeParse(key, []);
    const playlist = playlists.find(p => p.id === playlistId);

    if (playlist && !playlist.trackIds.includes(trackId)) {
      playlist.trackIds.push(trackId);
      playlist.updatedDate = Date.now();
      localStorage.setItem(key, JSON.stringify(playlists));
      await syncToFs(key, playlists);
    }
  } catch (error) {
    console.error('Error adding track to playlist:', error);
  }
}

export async function updatePlaylist(playlistId: string, updates: Partial<PlaylistDB>): Promise<void> {
  try {
    const key = getNsKey(PLAYLISTS_KEY);
    const playlists: PlaylistDB[] = await safeParse(key, []);
    const idx = playlists.findIndex(p => p.id === playlistId);
    if (idx !== -1) {
      playlists[idx] = { ...playlists[idx], ...updates, updatedDate: Date.now() };
      localStorage.setItem(key, JSON.stringify(playlists));
      await syncToFs(key, playlists);
    }
  } catch (error) {
    console.error('Error updating playlist:', error);
  }
}

export async function getPlaylistTracks(playlistId: string): Promise<any[]> {
  try {
    if (playlistId === 'pl_demo_1') {
        return await getFavorites();
    }

    if (playlistId === 'favorites_v2') {
        return await getFavorites();
    }

    const pKey = getNsKey(PLAYLISTS_KEY);
    const tKey = getNsKey(TRACKS_KEY);
    const playlists: PlaylistDB[] = await safeParse(pKey, []);
    const playlist = playlists.find(p => p.id === playlistId);

    if (!playlist) return [];

    const tracks: TrackDB[] = await safeParse(tKey, []);
    return (playlist.trackIds || [])
      .map(id => tracks.find(t => t.id === id))
      .filter(Boolean) as any[];
  } catch {
    return [];
  }
}

// Get only the static profile data (email, name, tier)
export async function getProfileData(): Promise<Partial<UserProfile>> {
  try {
    const session = await safeParse(PROFILE_KEY, null);
    if (!session) return { name: "Usuario", email: "", tier: "standard" };

    const nsKey = getNsKey(PROFILE_KEY);
    const namespacedProfile = await safeParse(nsKey, null);

    if (namespacedProfile) {
      return namespacedProfile;
    }

    // Fallback to session data if no namespaced data yet
    return {
      name: session.name || "...",
      svzn_id: session.svzn_id || null,
      email: session.email || "",
      tier: session.tier || "standard",
      bio: session.bio || "",
      avatar: session.avatar || "",
      banner: session.banner || ""
    };
  } catch {
    return { name: "...", email: "", tier: "standard" };
  }
}

export async function getProfile(): Promise<UserProfile> {
  try {
    const profileData = await getProfileData();
    const tracks = await getAllTracks();
    const playlists = await getAllPlaylists();
    const favorites = await getFavorites();

    return {
      ...profileData,
      stats: {
        songs: tracks.length,
        hours: Math.floor(tracks.reduce((acc, t) => acc + (t.duration || 0), 0) / 3600),
        favorites: favorites.length,
        playlists: playlists.length
      }
    } as UserProfile;
  } catch (error) {
    console.error('Error in getProfile:', error);
    return {
      name: "...",
      email: "",
      tier: "standard",
      stats: { songs: 0, hours: 0, favorites: 0, playlists: 0 }
    } as UserProfile;
  }
}

export async function updateProfile(data: Partial<UserProfile>): Promise<void> {
  try {
    const processedData = { ...data };
    if (processedData.avatar && (processedData.avatar.startsWith('C:') || processedData.avatar?.startsWith('/') || processedData.avatar?.includes('\\'))) {
      if ((window as any).electron?.saveAvatar) {
        const newPath = await (window as any).electron.saveAvatar(processedData.avatar);
        if (newPath) processedData.avatar = newPath;
      }
    }
    if (processedData.banner && (processedData.banner.startsWith('C:') || processedData.banner?.startsWith('/') || processedData.banner?.includes('\\'))) {
      if ((window as any).electron?.saveAvatar) {
        const newPath = await (window as any).electron.saveAvatar(processedData.banner);
        if (newPath) processedData.banner = newPath;
      }
    }

    // 1. Update global session pointer
    const currentSession = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    const updatedSession = { ...currentSession, ...processedData };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedSession));
    await syncToFs(PROFILE_KEY, updatedSession);

    // 2. Update namespaced detailed profile
    const nsKey = getNsKey(PROFILE_KEY);
    const currentNsProfile = JSON.parse(localStorage.getItem(nsKey) || '{}');
    const updatedNsProfile = { ...currentNsProfile, ...processedData };
    localStorage.setItem(nsKey, JSON.stringify(updatedNsProfile));
    await syncToFs(nsKey, updatedNsProfile);

    console.log(`[DB] Profile updated in namespace: ${nsKey}`);
  } catch (error) {
    console.error('Error updating profile:', error);
  }
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    await syncToFs(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    await syncToFs(AUTH_TOKEN_KEY, null);
  }
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
  try {
    if (playlistId === 'pl_demo_1') {
        const tracks = await getAllTracks();
        const t = tracks.find(tr => tr.id === trackId);
        if (t) await toggleFavorite(t, false);
        return;
    }

    const key = getNsKey(PLAYLISTS_KEY);
    const playlists: PlaylistDB[] = await safeParse(key, []);
    const playlist = playlists.find(p => p.id === playlistId);

    if (playlist) {
      playlist.trackIds = playlist.trackIds.filter(id => id !== trackId);
      playlist.updatedDate = Date.now();
      localStorage.setItem(key, JSON.stringify(playlists));
      await syncToFs(key, playlists);
    }
  } catch (error) {
    console.error('Error removing track from playlist:', error);
  }
}

export async function reorderTracksInPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
  try {
    const key = getNsKey(PLAYLISTS_KEY);
    const playlists: PlaylistDB[] = JSON.parse(localStorage.getItem(key) || '[]');
    const playlist = playlists.find(p => p.id === playlistId);

    if (playlist) {
      playlist.trackIds = trackIds;
      playlist.updatedDate = Date.now();
      localStorage.setItem(key, JSON.stringify(playlists));
      await syncToFs(key, playlists);
    }
  } catch (error) {
    console.error('Error reordering playlist:', error);
  }
}

export async function togglePlaylistPrivacy(playlistId: string, isPublic: boolean): Promise<void> {
  try {
    const key = getNsKey(PLAYLISTS_KEY);
    const playlists: PlaylistDB[] = JSON.parse(localStorage.getItem(key) || '[]');
    const playlist = playlists.find(p => p.id === playlistId);

    if (playlist) {
      playlist.isPublic = isPublic;
      playlist.updatedDate = Date.now();
      localStorage.setItem(key, JSON.stringify(playlists));
      await syncToFs(key, playlists);
    }
  } catch (error) {
    console.error('Error toggling playlist privacy:', error);
  }
}

export async function toggleLikeArtist(artist: any): Promise<void> {
  try {
    const key = getNsKey(LIKED_ARTISTS_KEY);
    const artists: any[] = await safeParse(key, []);
    const exists = artists.find(a => a.name === artist.name);
    let updated;
    if (exists) {
      updated = artists.filter(a => a.name !== artist.name);
    } else {
      updated = [...artists, { ...artist, likedDate: Date.now() }];
    }
    localStorage.setItem(key, JSON.stringify(updated));
    await syncToFs(key, updated);
  } catch (error) {
    console.error('Error toggling like artist:', error);
  }
}

export async function getLikedArtists(): Promise<any[]> {
  try {
    const key = getNsKey(LIKED_ARTISTS_KEY);
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

export async function toggleFollowPlaylist(playlist: any): Promise<void> {
  try {
    const key = getNsKey(FOLLOWED_PLAYLISTS_KEY);
    const playlists: any[] = JSON.parse(localStorage.getItem(key) || '[]');
    const exists = playlists.find(p => p.id === playlist.id);
    let updated;
    if (exists) {
      updated = playlists.filter(p => p.id !== playlist.id);
    } else {
      updated = [...playlists, { ...playlist, followedDate: Date.now() }];
    }
    localStorage.setItem(key, JSON.stringify(updated));
    await syncToFs(key, updated);
  } catch (error) {
    console.error('Error toggling follow playlist:', error);
  }
}

export async function getFollowedPlaylists(): Promise<any[]> {
  try {
    const key = getNsKey(FOLLOWED_PLAYLISTS_KEY);
    return await safeParse(key, []);
  } catch {
    return [];
  }
}
