import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;

export async function initDatabase(): Promise<void> {
  if (db) return;

  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  const savedData = localStorage.getItem('soundvzn_database');
  
  if (savedData) {
    const buffer = new Uint8Array(JSON.parse(savedData));
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    createTables();
  }
}

function createTables(): void {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT,
      year INTEGER,
      genre TEXT,
      duration REAL,
      filePath TEXT UNIQUE NOT NULL,
      format TEXT,
      bitrate INTEGER,
      sampleRate INTEGER,
      bitDepth INTEGER,
      lossless INTEGER,
      artwork TEXT,
      addedDate INTEGER,
      lastPlayed INTEGER,
      playCount INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdDate INTEGER,
      updatedDate INTEGER,
      artwork TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlistId TEXT,
      trackId TEXT,
      position INTEGER,
      addedDate INTEGER,
      FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (trackId) REFERENCES tracks(id) ON DELETE CASCADE,
      PRIMARY KEY (playlistId, trackId)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre)
  `);

  saveDatabase();
}

export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  localStorage.setItem('soundvzn_database', JSON.stringify(Array.from(data)));
}

export async function addTrack(track: any): Promise<void> {
  if (!db) await initDatabase();
  if (!db) return;

  try {
    db.run(
      `INSERT OR REPLACE INTO tracks 
       (id, title, artist, album, year, genre, duration, filePath, format, bitrate, 
        sampleRate, bitDepth, lossless, artwork, addedDate, playCount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        track.id,
        track.title,
        track.artist,
        track.album,
        track.year,
        track.genre,
        track.duration,
        track.filePath,
        track.format,
        track.bitrate,
        track.sampleRate,
        track.bitDepth,
        track.lossless ? 1 : 0,
        track.artwork,
        Date.now(),
        0,
      ]
    );
    saveDatabase();
  } catch (error) {
    console.error('Error adding track:', error);
  }
}

export async function getAllTracks(): Promise<any[]> {
  if (!db) await initDatabase();
  if (!db) return [];

  const result = db.exec('SELECT * FROM tracks ORDER BY addedDate DESC');
  if (result.length === 0) return [];

  const columns = result[0].columns;
  const tracks = result[0].values.map((row) => {
    const track: any = {};
    columns.forEach((col, idx) => {
      track[col] = row[idx];
    });
    track.lossless = Boolean(track.lossless);
    track.addedDate = new Date(track.addedDate);
    track.lastPlayed = track.lastPlayed ? new Date(track.lastPlayed) : undefined;
    return track;
  });

  return tracks;
}

export async function searchTracks(query: string): Promise<any[]> {
  if (!db) await initDatabase();
  if (!db) return [];

  const searchQuery = `%${query.toLowerCase()}%`;
  const result = db.exec(
    `SELECT * FROM tracks 
     WHERE LOWER(title) LIKE ? OR LOWER(artist) LIKE ? OR LOWER(album) LIKE ?
     ORDER BY playCount DESC, addedDate DESC
     LIMIT 50`,
    [searchQuery, searchQuery, searchQuery]
  );

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const track: any = {};
    columns.forEach((col, idx) => {
      track[col] = row[idx];
    });
    track.lossless = Boolean(track.lossless);
    track.addedDate = new Date(track.addedDate);
    return track;
  });
}

export async function updatePlayCount(trackId: string): Promise<void> {
  if (!db) return;

  db.run(
    'UPDATE tracks SET playCount = playCount + 1, lastPlayed = ? WHERE id = ?',
    [Date.now(), trackId]
  );
  saveDatabase();
}

export async function createPlaylist(name: string, description?: string): Promise<string> {
  if (!db) await initDatabase();
  if (!db) throw new Error('Database not initialized');

  const id = `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();

  db.run(
    'INSERT INTO playlists (id, name, description, createdDate, updatedDate) VALUES (?, ?, ?, ?, ?)',
    [id, name, description || '', now, now]
  );
  saveDatabase();

  return id;
}

export async function getAllPlaylists(): Promise<any[]> {
  if (!db) await initDatabase();
  if (!db) return [];

  const result = db.exec('SELECT * FROM playlists ORDER BY updatedDate DESC');
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const playlist: any = {};
    columns.forEach((col, idx) => {
      playlist[col] = row[idx];
    });
    playlist.createdDate = new Date(playlist.createdDate);
    playlist.updatedDate = new Date(playlist.updatedDate);
    return playlist;
  });
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  if (!db) return;

  const position = db.exec(
    'SELECT MAX(position) as maxPos FROM playlist_tracks WHERE playlistId = ?',
    [playlistId]
  );
  
  const nextPosition = position[0]?.values[0]?.[0] ? Number(position[0].values[0][0]) + 1 : 0;

  db.run(
    'INSERT INTO playlist_tracks (playlistId, trackId, position, addedDate) VALUES (?, ?, ?, ?)',
    [playlistId, trackId, nextPosition, Date.now()]
  );

  db.run('UPDATE playlists SET updatedDate = ? WHERE id = ?', [Date.now(), playlistId]);
  saveDatabase();
}

export async function getPlaylistTracks(playlistId: string): Promise<any[]> {
  if (!db) return [];

  const result = db.exec(
    `SELECT t.* FROM tracks t
     INNER JOIN playlist_tracks pt ON t.id = pt.trackId
     WHERE pt.playlistId = ?
     ORDER BY pt.position`,
    [playlistId]
  );

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const track: any = {};
    columns.forEach((col, idx) => {
      track[col] = row[idx];
    });
    track.lossless = Boolean(track.lossless);
    return track;
  });
}
