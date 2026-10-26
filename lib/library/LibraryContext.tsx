'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Track, Playlist, UserPreferences, TuneMixMode, ListeningHistoryItem } from '@/types/music';
import { CURATED_PLAYLISTS, SEED_TRACKS } from '@/lib/music/seed';

const STORAGE_KEY_PREFS = 'tavilo_user_preferences_v1';
const STORAGE_KEY_PLAYLISTS = 'tavilo_user_playlists_v1';

const DEFAULT_PREFERENCES: UserPreferences = {
  likedTrackIds: [SEED_TRACKS[0].id, SEED_TRACKS[1].id],
  dislikedTrackIds: [],
  excludedTrackIds: [],
  excludedArtistNames: [],
  followedArtistNames: ['Alan Walker', 'Sushin Shyam', 'The Weeknd'],
  savedAlbumIds: [],
  favoriteGenres: ['Malayalam', 'Electronic', 'Pop', 'Soundtrack'],
  genreWeights: {
    'malayalam': 3,
    'electronic': 3,
    'pop': 2,
    'soundtrack': 2,
  },
  artistPlayCounts: {
    'alan walker': 4,
    'sushin shyam': 4,
    'the weeknd': 3,
  },
  recentlyPlayed: [],
  tuneMixMode: 'balanced',
  autoplayEnabled: true,
};

interface LibraryContextType {
  preferences: UserPreferences;
  playlists: Playlist[];
  likedTracks: Track[];
  isLiked: (trackId: string) => boolean;
  toggleLike: (track: Track) => void;
  dislikeTrack: (track: Track) => void;
  excludeTrack: (trackId: string) => void;
  excludeArtist: (artistName: string) => void;
  resetRecommendations: () => void;
  clearHistory: () => void;
  setTuneMixMode: (mode: TuneMixMode) => void;
  setAutoplayEnabled: (enabled: boolean) => void;
  createPlaylist: (title: string, description?: string) => Playlist;
  updatePlaylist: (id: string, title: string, description?: string) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  recordPlaySession: (track: Track, durationListened: number, completed: boolean) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [playlists, setPlaylists] = useState<Playlist[]>(CURATED_PLAYLISTS);
  const [likedTrackEntities, setLikedTrackEntities] = useState<Record<string, Track>>({});

  // Initialize from LocalStorage
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem(STORAGE_KEY_PREFS);
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...parsed,
        });
      }

      const savedPlaylists = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
      if (savedPlaylists) {
        const parsedPl = JSON.parse(savedPlaylists);
        if (Array.isArray(parsedPl) && parsedPl.length > 0) {
          setPlaylists(parsedPl);
        }
      }

      // Seed initial liked track entities
      const initialMap: Record<string, Track> = {};
      SEED_TRACKS.forEach(t => {
        initialMap[t.id] = t;
      });
      setLikedTrackEntities(initialMap);
    } catch (err) {
      console.warn('Error reading from localStorage:', err);
    }
  }, []);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(preferences));
    } catch (err) {
      console.warn('Error saving preferences to localStorage:', err);
    }
  }, [preferences]);

  // Save playlists
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLISTS, JSON.stringify(playlists));
    } catch (err) {
      console.warn('Error saving playlists to localStorage:', err);
    }
  }, [playlists]);

  const isLiked = (trackId: string): boolean => {
    return preferences.likedTrackIds.includes(trackId);
  };

  const toggleLike = (track: Track) => {
    setLikedTrackEntities(prev => ({ ...prev, [track.id]: track }));

    setPreferences(prev => {
      const exists = prev.likedTrackIds.includes(track.id);
      const newLiked = exists
        ? prev.likedTrackIds.filter(id => id !== track.id)
        : [...prev.likedTrackIds, track.id];

      // Update genre weights
      const gLower = track.genre?.toLowerCase();
      const newGenreWeights = { ...prev.genreWeights };
      if (gLower) {
        newGenreWeights[gLower] = (newGenreWeights[gLower] || 0) + (exists ? -1 : 2);
        if (newGenreWeights[gLower] < 0) newGenreWeights[gLower] = 0;
      }

      return {
        ...prev,
        likedTrackIds: newLiked,
        genreWeights: newGenreWeights,
      };
    });
  };

  const dislikeTrack = (track: Track) => {
    setPreferences(prev => ({
      ...prev,
      dislikedTrackIds: [...prev.dislikedTrackIds.filter(id => id !== track.id), track.id],
      likedTrackIds: prev.likedTrackIds.filter(id => id !== track.id),
    }));
  };

  const excludeTrack = (trackId: string) => {
    setPreferences(prev => ({
      ...prev,
      excludedTrackIds: Array.from(new Set([...prev.excludedTrackIds, trackId])),
    }));
  };

  const excludeArtist = (artistName: string) => {
    setPreferences(prev => ({
      ...prev,
      excludedArtistNames: Array.from(new Set([...prev.excludedArtistNames, artistName])),
    }));
  };

  const resetRecommendations = () => {
    setPreferences(prev => ({
      ...prev,
      genreWeights: {},
      artistPlayCounts: {},
      excludedTrackIds: [],
      excludedArtistNames: [],
      dislikedTrackIds: [],
      recentlyPlayed: [],
      tuneMixMode: 'balanced',
    }));
  };

  const clearHistory = () => {
    setPreferences(prev => ({
      ...prev,
      recentlyPlayed: [],
    }));
  };

  const setTuneMixMode = (mode: TuneMixMode) => {
    setPreferences(prev => ({ ...prev, tuneMixMode: mode }));
  };

  const setAutoplayEnabled = (enabled: boolean) => {
    setPreferences(prev => ({ ...prev, autoplayEnabled: enabled }));
  };

  const createPlaylist = (title: string, description: string = ''): Playlist => {
    const newPl: Playlist = {
      id: `custom-playlist-${Date.now()}`,
      title,
      description,
      artwork: 'https://i.ytimg.com/vi/60ItHLz5WEA/hqdefault.jpg',
      tracks: [],
      trackCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true,
    };
    setPlaylists(prev => [newPl, ...prev]);
    return newPl;
  };

  const updatePlaylist = (id: string, title: string, description: string = '') => {
    setPlaylists(prev =>
      prev.map(p => (p.id === id ? { ...p, title, description, updatedAt: new Date().toISOString() } : p))
    );
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
  };

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists(prev =>
      prev.map(p => {
        if (p.id !== playlistId) return p;
        if (p.tracks.some(t => t.id === track.id)) return p;
        const newTracks = [...p.tracks, track];
        return {
          ...p,
          artwork: p.tracks.length === 0 ? track.artwork : p.artwork,
          tracks: newTracks,
          trackCount: newTracks.length,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev =>
      prev.map(p => {
        if (p.id !== playlistId) return p;
        const newTracks = p.tracks.filter(t => t.id !== trackId);
        return {
          ...p,
          tracks: newTracks,
          trackCount: newTracks.length,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const recordPlaySession = (track: Track, durationListened: number, completed: boolean) => {
    const listenRatio = track.duration > 0 ? Math.min(1, durationListened / track.duration) : 0;
    const historyItem: ListeningHistoryItem = {
      track,
      playedAt: new Date().toISOString(),
      completed,
      durationListened,
      listenRatio,
    };

    setPreferences(prev => {
      const artLower = track.artist.toLowerCase();
      const currentCount = prev.artistPlayCounts[artLower] || 0;
      const newPlayCounts = {
        ...prev.artistPlayCounts,
        [artLower]: completed || listenRatio > 0.5 ? currentCount + 1 : currentCount,
      };

      const gLower = track.genre?.toLowerCase();
      const newGenreWeights = { ...prev.genreWeights };
      if (gLower && (completed || listenRatio > 0.6)) {
        newGenreWeights[gLower] = (newGenreWeights[gLower] || 0) + 1;
      }

      // Keep recent 40 history items
      const updatedHistory = [historyItem, ...prev.recentlyPlayed.filter(h => h.track.id !== track.id)].slice(0, 40);

      return {
        ...prev,
        artistPlayCounts: newPlayCounts,
        genreWeights: newGenreWeights,
        recentlyPlayed: updatedHistory,
      };
    });
  };

  const likedTracks = preferences.likedTrackIds
    .map(id => likedTrackEntities[id])
    .filter(Boolean) as Track[];

  return (
    <LibraryContext.Provider
      value={{
        preferences,
        playlists,
        likedTracks,
        isLiked,
        toggleLike,
        dislikeTrack,
        excludeTrack,
        excludeArtist,
        resetRecommendations,
        clearHistory,
        setTuneMixMode,
        setAutoplayEnabled,
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        recordPlaySession,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
