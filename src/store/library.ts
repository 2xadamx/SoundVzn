import { create } from 'zustand';
import { Track } from '../types';

interface LibraryState {
  tracks: Track[];
  isLoading: boolean;
  searchQuery: string;
  selectedGenre: string | null;
  sortBy: 'title' | 'artist' | 'album' | 'dateAdded';
  sortOrder: 'asc' | 'desc';

  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, data: Partial<Track>) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genre: string | null) => void;
  setSortBy: (sortBy: 'title' | 'artist' | 'album' | 'dateAdded') => void;
  toggleSortOrder: () => void;
  getFilteredTracks: () => Track[];
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  isLoading: false,
  searchQuery: '',
  selectedGenre: null,
  sortBy: 'dateAdded',
  sortOrder: 'desc',

  setTracks: (tracks) => set({ tracks }),
  addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),
  removeTrack: (id) => set((state) => ({
    tracks: state.tracks.filter((t) => t.id !== id),
  })),
  updateTrack: (id, data) => set((state) => ({
    tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...data } : t)),
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedGenre: (genre) => set({ selectedGenre: genre }),
  setSortBy: (sortBy) => set({ sortBy }),
  toggleSortOrder: () => set((state) => ({
    sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc',
  })),

  getFilteredTracks: () => {
    const { tracks, searchQuery, selectedGenre, sortBy, sortOrder } = get();
    let filtered = [...tracks];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.album.toLowerCase().includes(query)
      );
    }

    if (selectedGenre) {
      filtered = filtered.filter((t) => t.genre === selectedGenre);
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'artist':
          comparison = a.artist.localeCompare(b.artist);
          break;
        case 'album':
          comparison = a.album.localeCompare(b.album);
          break;
        case 'dateAdded':
          comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  },
}));
