'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Track, RepeatMode } from '@/types/music';
import { useLibrary } from '@/lib/library/LibraryContext';
import { RecommendationEngine } from '@/lib/recommendations/engine';
import { MusicProviderService } from '@/lib/music/provider';
import { SEED_TRACKS } from '@/lib/music/seed';

interface PlaybackContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Track[];
  history: Track[];
  shuffle: boolean;
  repeat: RepeatMode;
  isLoading: boolean;
  error: string | null;
  isFullScreenOpen: boolean;
  isQueueOpen: boolean;
  playTrack: (track: Track, customQueue?: Track[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  next: () => void;
  previous: () => void;
  setVolume: (level: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setFullScreenOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const { preferences, recordPlaySession } = useLibrary();

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isFullScreenOpen, setFullScreenOpen] = useState<boolean>(false);
  const [isQueueOpen, setQueueOpen] = useState<boolean>(false);

  // Hidden audio element reference
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listenSecondsRef = useRef<number>(0);
  const trackStartTimeRef = useRef<number>(0);

  // Initialize Audio Element safely on client
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      const audio = new Audio();
      audio.preload = 'metadata';
      audioRef.current = audio;

      // Restore volume
      try {
        const savedVol = localStorage.getItem('tavilo_volume');
        if (savedVol !== null) {
          const v = parseFloat(savedVol);
          audio.volume = v;
          setVolumeState(v);
        }
      } catch {}

      // Attach Audio Listeners
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        listenSecondsRef.current += 0.25; // approximated time tracking
      });

      audio.addEventListener('durationchange', () => {
        if (!isNaN(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      });

      audio.addEventListener('playing', () => {
        setIsPlaying(true);
        setIsLoading(false);
        setError(null);
      });

      audio.addEventListener('pause', () => {
        setIsPlaying(false);
      });

      audio.addEventListener('waiting', () => {
        setIsLoading(true);
      });

      audio.addEventListener('canplay', () => {
        setIsLoading(false);
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsLoading(false);
        setIsPlaying(false);
        setError('Playback error. Trying next available track...');
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Sync MediaSession API
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: [
          { src: currentTrack.artwork, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.artwork, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        previous();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        next();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }
  }, [currentTrack]);

  // Flush play session when track changes or unmounts
  const finalizeCurrentPlaySession = useCallback((completed: boolean) => {
    if (currentTrack) {
      const listened = listenSecondsRef.current;
      recordPlaySession(currentTrack, listened, completed);
    }
    listenSecondsRef.current = 0;
    trackStartTimeRef.current = Date.now();
  }, [currentTrack, recordPlaySession]);

  // Autoplay / Queue extension logic
  const handleTrackEnded = useCallback(async () => {
    finalizeCurrentPlaySession(true);

    if (repeat === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.warn);
      return;
    }

    if (queue.length > 0) {
      const nextTrack = queue[0];
      const remainingQueue = queue.slice(1);
      if (currentTrack) {
        setHistory(prev => [currentTrack, ...prev].slice(0, 30));
      }
      setQueue(remainingQueue);
      playTrack(nextTrack, remainingQueue);
      return;
    }

    // Queue is empty, check taste-based Autoplay
    if (preferences.autoplayEnabled) {
      try {
        setIsLoading(true);
        // Candidate pool from trending / mood matching
        const candidates = await MusicProviderService.getTrending(25);
        const nextChoice = RecommendationEngine.selectNextTrack(
          candidates.length > 0 ? candidates : SEED_TRACKS,
          preferences,
          currentTrack,
          preferences.recentlyPlayed
        );

        if (nextChoice) {
          if (currentTrack) {
            setHistory(prev => [currentTrack, ...prev].slice(0, 30));
          }
          playTrack(nextChoice);
          return;
        }
      } catch (err) {
        console.warn('Autoplay recommendation failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    // If repeat all is on and we have history
    if (repeat === 'all' && history.length > 0) {
      const restarted = history[history.length - 1];
      playTrack(restarted);
      return;
    }

    setIsPlaying(false);
  }, [repeat, queue, currentTrack, preferences, history, finalizeCurrentPlaySession]);

  // Hook onEnded
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.onended = handleTrackEnded;
  }, [handleTrackEnded]);

  const playTrack = useCallback((track: Track, customQueue?: Track[]) => {
    finalizeCurrentPlaySession(false);
    setError(null);
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 0);
    setIsLoading(true);

    if (customQueue) {
      setQueue(customQueue);
    }

    if (audioRef.current) {
      audioRef.current.src = track.streamUrl;
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch(err => {
          console.warn('Playback initiation prevented or failed:', err);
          setIsLoading(false);
          setIsPlaying(false);
        });
    }
  }, [finalizeCurrentPlaySession]);

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resume = () => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.warn);
    }
  };

  const seek = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const next = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      const remainingQueue = queue.slice(1);
      if (currentTrack) {
        setHistory(prev => [currentTrack, ...prev].slice(0, 30));
      }
      playTrack(nextTrack, remainingQueue);
    } else if (preferences.autoplayEnabled && currentTrack) {
      // Trigger taste recommendation
      RecommendationEngine.selectNextTrack(
        SEED_TRACKS,
        preferences,
        currentTrack,
        preferences.recentlyPlayed
      );
      handleTrackEnded();
    } else {
      pause();
    }
  };

  const previous = () => {
    // If more than 3 seconds in, seek to start of current song
    if (currentTime > 3) {
      seek(0);
      return;
    }

    if (history.length > 0) {
      const prevTrack = history[0];
      const remainingHistory = history.slice(1);
      setHistory(remainingHistory);
      if (currentTrack) {
        setQueue(prev => [currentTrack, ...prev]);
      }
      playTrack(prevTrack);
    } else {
      seek(0);
    }
  };

  const setVolume = (level: number) => {
    const clamped = Math.max(0, Math.min(1, level));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      if (clamped > 0 && isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
    try {
      localStorage.setItem('tavilo_volume', clamped.toString());
    } catch {}
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      audioRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const toggleShuffle = () => {
    setShuffle(prev => {
      const nextVal = !prev;
      if (nextVal && queue.length > 1) {
        // Shuffle existing queue
        const shuffled = [...queue].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
      }
      return nextVal;
    });
  };

  const toggleRepeat = () => {
    setRepeat(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
  };

  const playNext = (track: Track) => {
    setQueue(prev => [track, ...prev]);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  return (
    <PlaybackContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        queue,
        history,
        shuffle,
        repeat,
        isLoading,
        error,
        isFullScreenOpen,
        isQueueOpen,
        playTrack,
        togglePlay,
        pause,
        resume,
        seek,
        next,
        previous,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        playNext,
        removeFromQueue,
        clearQueue,
        setFullScreenOpen,
        setQueueOpen,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
}
