// src/utils/spotifyAPI.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSpotifyToken } from './apiConfig';

describe('Spotify API (token vía backend)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSpotifyToken', () => {
    it('rejects when backend returns error (or is unreachable)', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Not configured' }) })));
      await expect(getSpotifyToken()).rejects.toThrow();
    });
  });
});
