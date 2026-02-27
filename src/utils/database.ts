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
}

const TRACKS_KEY = 'soundvzn_tracks';
const PLAYLISTS_KEY = 'soundvzn_playlists';
const FOLLOWED_PLAYLISTS_KEY = 'soundvzn_followed_playlists';
const LIKED_ARTISTS_KEY = 'soundvzn_liked_artists';
const PROFILE_KEY = 'soundvzn_profile';
const AUTH_TOKEN_KEY = 'google_token';

// Helper to get namespaced key without triggering expensive lookups
function getNsKey(baseKey: string): string {
  try {
    const profileStr = localStorage.getItem(PROFILE_KEY);
    let userId = 'guest';
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      userId = profile.email || 'guest';
    }
    const safeId = userId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${safeId}_${baseKey}`;
  } catch {
    return `guest_${baseKey}`;
  }
}

interface UserProfile {
  name: string;
  email: string;
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

export async function initDatabase(): Promise<void> {
  if (isDbInitialized) return;
  if (dbInitializationPromise) return dbInitializationPromise;

  dbInitializationPromise = (async () => {
    console.log('[DB] Starting initialization...');
    try {
      // Try to load from filesystem first
      const fsToken = await (window as any).electron?.loadData(AUTH_TOKEN_KEY);
      if (fsToken && typeof fsToken === 'string') localStorage.setItem(AUTH_TOKEN_KEY, fsToken);

      let fsProfile = null;
      try { fsProfile = await (window as any).electron?.loadData(PROFILE_KEY); } catch (e) { }
      if (fsProfile && typeof fsProfile === 'object') {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(fsProfile));
      }

      const rawProfile = localStorage.getItem(PROFILE_KEY);
      if (!rawProfile || rawProfile === 'null' || rawProfile === 'undefined') {
        const defaultProfile = {
          name: "Usuario",
          email: "",
          tier: "standard",
          bio: "Explorador de sonido.",
        };
        localStorage.setItem(PROFILE_KEY, JSON.stringify(defaultProfile));
      }

      // Load full namespaced profile if available
      const nsProfileKey = getNsKey(PROFILE_KEY);
      let fsNsProfile = null;
      try { fsNsProfile = await (window as any).electron?.loadData(nsProfileKey); } catch (e) { }
      if (fsNsProfile && typeof fsNsProfile === 'object') {
        localStorage.setItem(nsProfileKey, JSON.stringify(fsNsProfile));
        localStorage.setItem(PROFILE_KEY, JSON.stringify(fsNsProfile));
      }

      console.log(`[DB] Loading data for namespace: ${getNsKey('')}`);

      const tKey = getNsKey(TRACKS_KEY);
      const pKey = getNsKey(PLAYLISTS_KEY);

      let fsTracks = null;
      let fsPlaylists = null;
      try { fsTracks = await (window as any).electron?.loadData(tKey); } catch (e) { }
      try { fsPlaylists = await (window as any).electron?.loadData(pKey); } catch (e) { }

      if (Array.isArray(fsTracks)) localStorage.setItem(tKey, JSON.stringify(fsTracks));
      if (Array.isArray(fsPlaylists)) localStorage.setItem(pKey, JSON.stringify(fsPlaylists));

      let rawTKey = localStorage.getItem(tKey);
      if (!rawTKey || rawTKey === 'null' || rawTKey === 'undefined') {
        localStorage.setItem(tKey, JSON.stringify([]));
      } else {
        try { JSON.parse(rawTKey); } catch { localStorage.setItem(tKey, JSON.stringify([])); }
      }

      let rawPKey = localStorage.getItem(pKey);
      let pKeyIsInvalid = !rawPKey || rawPKey === 'null' || rawPKey === 'undefined';
      if (!pKeyIsInvalid) {
        try {
          const parsedPls = JSON.parse(rawPKey as string);
          if (!Array.isArray(parsedPls) || parsedPls.length === 0) pKeyIsInvalid = true;
        } catch { pKeyIsInvalid = true; }
      }

      if (pKeyIsInvalid) {
        const demoPlaylists: PlaylistDB[] = [{
          id: 'pl_demo_1',
          name: 'Mis Favoritos',
          description: 'Tu colección personal.',
          createdDate: Date.now(),
          updatedDate: Date.now(),
          trackIds: []
        }];
        localStorage.setItem(pKey, JSON.stringify(demoPlaylists));
        await syncToFs(pKey, demoPlaylists);
      }

      // Migration
      let finalProfile: any = {};
      try { finalProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch { finalProfile = {}; }

      if (finalProfile?.email && finalProfile.email !== 'guest') {
        const userTKey = getNsKey(TRACKS_KEY);
        let userTracks: any[] = [];
        try { userTracks = JSON.parse(localStorage.getItem(userTKey) || '[]'); } catch { }

        if (userTracks.length === 0) {
          console.log('[DB] New user detected, attempting migration from guest...');
          const guestTKey = 'guest_tracks';
          let guestTracks: any[] = [];
          try { guestTracks = JSON.parse(localStorage.getItem(guestTKey) || '[]'); } catch { }

          if (guestTracks.length > 0) {
            console.log(`[DB] Migrating ${guestTracks.length} tracks.`);
            localStorage.setItem(userTKey, JSON.stringify(guestTracks));
            await syncToFs(userTKey, guestTracks);
          }
        }
      }

      await syncToFs(PROFILE_KEY, finalProfile);

    } catch (err) {
      console.error('[DB] CRITICAL ERROR IN INIT DATABASE:', err);
    } finally {
      isDbInitialized = true;
      console.log('[DB] Initialization complete. isDbInitialized flag set to true.');
    }
  })();

  return dbInitializationPromise;
}



async function syncToFs(key: string, data: any) {
  try {
    console.log(`[DB] Syncing to FS: ${key}`, Array.isArray(data) ? `(Array[${data.length}])` : '(Object)');
    if ((window as any).electron?.saveData) {
      await (window as any).electron.saveData(key, data);
      console.log(`[DB] Sync to FS SUCCESS: ${key}`);
    } else {
      console.warn(`[DB] Electron bridge not available for sync: ${key}`);
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
    const tracks: TrackDB[] = JSON.parse(localStorage.getItem(key) || '[]');

    const existingIndex = tracks.findIndex(t => t.id === track.id);

    const trackDB: TrackDB = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      year: track.year,
      genre: track.genre,
      duration: track.duration,
      filePath: track.filePath,
      format: track.format,
      bitrate: track.bitrate,
      sampleRate: track.sampleRate,
      bitDepth: track.bitDepth,
      lossless: track.lossless,
      artwork: track.artwork,
      favorite: track.favorite || false,
      addedDate: track.addedDate || Date.now(),
      lastPlayed: track.lastPlayed,
      playCount: track.playCount || 0,
    };

    if (existingIndex >= 0) {
      tracks[existingIndex] = trackDB;
    } else {
      tracks.push(trackDB);
    }

    localStorage.setItem(key, JSON.stringify(tracks));
    console.log(`[DB] Track added/updated in localStorage: ${track.id} (${key})`);
    await syncToFs(key, tracks);
  } catch (error) {
    console.error('Error adding track:', error);
  }
}

export async function getAllTracks(): Promise<any[]> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks = JSON.parse(localStorage.getItem(key) || '[]');
    return tracks.sort((a: TrackDB, b: TrackDB) => b.addedDate - a.addedDate);
  } catch {
    return [];
  }
}

export async function searchTracks(query: string): Promise<any[]> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks: TrackDB[] = JSON.parse(localStorage.getItem(key) || '[]');
    const lowerQuery = query.toLowerCase();

    return tracks
      .filter(track =>
        track.title.toLowerCase().includes(lowerQuery) ||
        track.artist.toLowerCase().includes(lowerQuery) ||
        (track.album && track.album.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 50);
  } catch {
    return [];
  }
}

export async function updatePlayCount(trackId: string): Promise<void> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks: TrackDB[] = JSON.parse(localStorage.getItem(key) || '[]');
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
    const tracks: TrackDB[] = JSON.parse(localStorage.getItem(key) || '[]');
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
    await syncToFs(key, tracks);
  } catch (error) {
    console.error('Error toggling favorite:', error);
  }
}

export async function getFavorites(): Promise<any[]> {
  try {
    const key = getNsKey(TRACKS_KEY);
    const tracks: TrackDB[] = JSON.parse(localStorage.getItem(key) || '[]');
    return tracks.filter(t => t.favorite).sort((a, b) => b.addedDate - a.addedDate);
  } catch {
    return [];
  }
}

export async function createPlaylist(name: string, description?: string): Promise<string> {
  const key = getNsKey(PLAYLISTS_KEY);
  const playlists: PlaylistDB[] = JSON.parse(localStorage.getItem(key) || '[]');

  const profile = await getProfile();
  const limit = TIER_LIMITS[profile.tier].playlists;
  if (playlists.length >= limit) {
    throw new Error('Limit reached');
  }

  const id = `playlist_${Date.now()}`;
  const now = Date.now();

  const playlist: PlaylistDB = {
    id, name, description, createdDate: now, updatedDate: now, trackIds: [],
  };

  playlists.push(playlist);
  localStorage.setItem(key, JSON.stringify(playlists));
  await syncToFs(key, playlists);

  return id;
}

export async function getAllPlaylists(): Promise<any[]> {
  try {
    const key = getNsKey(PLAYLISTS_KEY);
    const playlists = JSON.parse(localStorage.getItem(key) || '[]');
    return playlists.sort((a: PlaylistDB, b: PlaylistDB) => b.updatedDate - a.updatedDate);
  } catch {
    return [];
  }
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  try {
    const key = getNsKey(PLAYLISTS_KEY);
    const playlists: PlaylistDB[] = JSON.parse(localStorage.getItem(key) || '[]');
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

export async function getPlaylistTracks(playlistId: string): Promise<any[]> {
  try {
    const pKey = getNsKey(PLAYLISTS_KEY);
    const tKey = getNsKey(TRACKS_KEY);
    const playlists: PlaylistDB[] = JSON.parse(localStorage.getItem(pKey) || '[]');
    const playlist = playlists.find(p => p.id === playlistId);

    if (!playlist) return [];

    const tracks: TrackDB[] = JSON.parse(localStorage.getItem(tKey) || '[]');
    return playlist.trackIds
      .map(id => tracks.find(t => t.id === id))
      .filter(Boolean) as any[];
  } catch {
    return [];
  }
}

// Get only the static profile data (email, name, tier)
export async function getProfileData(): Promise<Partial<UserProfile>> {
  try {
    const sessionStr = localStorage.getItem(PROFILE_KEY);
    if (!sessionStr) return { name: "Usuario", email: "", tier: "standard" };

    const session = JSON.parse(sessionStr);
    const nsKey = getNsKey(PROFILE_KEY);
    const namespacedProfileStr = localStorage.getItem(nsKey);

    if (namespacedProfileStr) {
      return JSON.parse(namespacedProfileStr);
    }

    // Fallback to session data if no namespaced data yet
    return {
      name: session.name || "Usuario",
      email: session.email || "",
      tier: session.tier || "standard",
      bio: session.bio || "",
      avatar: session.avatar || "",
      banner: session.banner || ""
    };
  } catch {
    return { name: "Usuario", email: "", tier: "standard" };
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
      name: "Usuario",
      email: "",
      tier: "standard",
      stats: { songs: 0, hours: 0, favorites: 0, playlists: 0 }
    } as UserProfile;
  }
}

export async function updateProfile(data: Partial<UserProfile>): Promise<void> {
  try {
    // BUG 2 Fix: Physical file saving for profile images
    const processedData = { ...data };
    if (processedData.avatar && processedData.avatar.startsWith('C:') || processedData.avatar?.startsWith('/') || processedData.avatar?.includes('\\')) {
      if ((window as any).electron?.saveAvatar) {
        const newPath = await (window as any).electron.saveAvatar(processedData.avatar);
        if (newPath) processedData.avatar = newPath;
      }
    }
    if (processedData.banner && processedData.banner.startsWith('C:') || processedData.banner?.startsWith('/') || processedData.banner?.includes('\\')) {
      if ((window as any).electron?.saveAvatar) {
        // Reuse saveAvatar for banner
        const newPath = await (window as any).electron.saveAvatar(processedData.banner);
        if (newPath) processedData.banner = newPath;
      }
    }

    // 1. Update global session pointer (minimal)
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
    const key = getNsKey(PLAYLISTS_KEY);
    const playlists: PlaylistDB[] = JSON.parse(localStorage.getItem(key) || '[]');
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

export async function toggleLikeArtist(artist: any): Promise<void> {
  try {
    const key = getNsKey(LIKED_ARTISTS_KEY);
    const artists: any[] = JSON.parse(localStorage.getItem(key) || '[]');
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
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}
