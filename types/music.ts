export type PlaybackCapability = 'playable' | 'external' | 'metadata_only';

export interface Track {
  id: string;
  providerId: 'jamendo' | 'archive' | 'local' | 'youtube' | string;
  providerName: string;
  title: string;
  artist: string;
  artists?: string[];
  album: string;
  artwork: string;
  duration: number; // in seconds
  streamUrl: string;
  genre?: string;
  genres?: string[];
  moods?: string[];
  playbackCapability: PlaybackCapability;
  playbackSource: string;
  licenseName?: string;
  licenseUrl?: string;
  releasedDate?: string;
  bpm?: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  artwork: string;
  tracks: Track[];
  trackCount: number;
  createdAt: string;
  updatedAt: string;
  isCustom?: boolean;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  releasedDate?: string;
  trackCount: number;
  tracks?: Track[];
  genre?: string;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  genres?: string[];
  bio?: string;
  topTracks?: Track[];
}

export type TuneMixMode = 'familiar' | 'balanced' | 'discovery';

export interface ListeningHistoryItem {
  track: Track;
  playedAt: string;
  completed: boolean;
  durationListened: number;
  listenRatio: number; // 0 to 1
}

export interface UserPreferences {
  likedTrackIds: string[];
  dislikedTrackIds: string[];
  excludedTrackIds: string[];
  excludedArtistNames: string[];
  followedArtistNames: string[];
  savedAlbumIds: string[];
  favoriteGenres: string[];
  genreWeights: Record<string, number>;
  artistPlayCounts: Record<string, number>;
  recentlyPlayed: ListeningHistoryItem[];
  tuneMixMode: TuneMixMode;
  autoplayEnabled: boolean;
}

export type RepeatMode = 'off' | 'one' | 'all';

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  isMuted: boolean;
  queue: Track[];
  originalQueue: Track[]; // for restoring order after shuffle
  history: Track[];
  shuffle: boolean;
  repeat: RepeatMode;
  isLoading: boolean;
  error: string | null;
  playbackRate: number;
}

export interface SearchResult {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
}
