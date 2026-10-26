'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Track, RepeatMode } from '@/types/music';
import { useLibrary } from '@/lib/library/LibraryContext';
import { RecommendationEngine } from '@/lib/recommendations/engine';
import { MusicProviderService } from '@/lib/music/provider';
import { SEED_TRACKS } from '@/lib/music/seed';
import { isMalayalamTrack } from '@/lib/recommendations/sonicGraph';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface PlayOptions {
  isSearchPlay?: boolean;
  generateTasteQueue?: boolean;
}

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
  playTrack: (track: Track, customQueue?: Track[], options?: PlayOptions) => void;
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

  // Hidden audio element reference for direct streams
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // YouTube IFrame Player reference
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const pendingYtVideoIdRef = useRef<string | null>(null);

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
        if (!currentTrack || currentTrack.providerId !== 'youtube') {
          setCurrentTime(audio.currentTime);
          listenSecondsRef.current += 0.25;
        }
      });

      audio.addEventListener('durationchange', () => {
        if (!currentTrack || currentTrack.providerId !== 'youtube') {
          if (!isNaN(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
          }
        }
      });

      audio.addEventListener('playing', () => {
        if (!currentTrack || currentTrack.providerId !== 'youtube') {
          setIsPlaying(true);
          setIsLoading(false);
          setError(null);
        }
      });

      audio.addEventListener('pause', () => {
        if (!currentTrack || currentTrack.providerId !== 'youtube') {
          setIsPlaying(false);
        }
      });

      audio.addEventListener('waiting', () => {
        if (!currentTrack || currentTrack.providerId !== 'youtube') {
          setIsLoading(true);
        }
      });

      audio.addEventListener('canplay', () => {
        if (!currentTrack || currentTrack.providerId !== 'youtube') {
          setIsLoading(false);
        }
      });

      audio.addEventListener('error', (e) => {
        if (!currentTrack || currentTrack.providerId !== 'youtube') {
          console.error('Audio playback error:', e);
          setIsLoading(false);
          setIsPlaying(false);
          setError('Playback error. Trying next available track...');
        }
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentTrack]);

  // Flush play session when track changes or unmounts
  const finalizeCurrentPlaySession = useCallback(
    (completed: boolean) => {
      if (currentTrack) {
        const listened = listenSecondsRef.current;
        recordPlaySession(currentTrack, listened, completed);
      }
      listenSecondsRef.current = 0;
      trackStartTimeRef.current = Date.now();
    },
    [currentTrack, recordPlaySession]
  );

  // Autoplay / Queue extension logic
  const handleTrackEnded = useCallback(async () => {
    finalizeCurrentPlaySession(true);

    if (repeat === 'one') {
      seek(0);
      resume();
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
    if (preferences.autoplayEnabled && currentTrack) {
      try {
        setIsLoading(true);
        const candidates = await MusicProviderService.getTailoredCandidates(currentTrack, preferences);
        const nextChoice = RecommendationEngine.selectNextTrack(
          candidates,
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

  // Hook HTML5 Audio onended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.onended = handleTrackEnded;
  }, [handleTrackEnded]);

  // Initialize YouTube IFrame Player
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setupPlayer = () => {
      if (!window.YT || !window.YT.Player || ytPlayerRef.current) return;
      try {
        ytPlayerRef.current = new window.YT.Player('tavilo-yt-player', {
          height: '200',
          width: '200',
          playerVars: {
            autoplay: 1,
            controls: 0,
            playsinline: 1,
            disablekb: 1,
            fs: 0,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              isYtReadyRef.current = true;
              event.target.setVolume(volume * 100);
              if (pendingYtVideoIdRef.current) {
                event.target.loadVideoById(pendingYtVideoIdRef.current);
                event.target.playVideo();
                pendingYtVideoIdRef.current = null;
              }
            },
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
              if (event.data === 1) {
                setIsPlaying(true);
                setIsLoading(false);
                setError(null);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                handleTrackEnded();
              } else if (event.data === 3) {
                setIsLoading(true);
              }
            },
            onError: (err: any) => {
              console.warn('YouTube playback error:', err);
              setIsLoading(false);
              next();
            },
          },
        });
      } catch (e) {
        console.warn('Error instantiating YouTube player:', e);
      }
    };

    if (window.YT && window.YT.Player) {
      setupPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        setupPlayer();
      };

      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }
  }, [handleTrackEnded, volume]);

  // YouTube polling for currentTime & duration during playback
  useEffect(() => {
    if (!isPlaying || !currentTrack || currentTrack.providerId !== 'youtube') return;

    const interval = setInterval(() => {
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          if (typeof t === 'number' && !isNaN(t)) {
            setCurrentTime(t);
            listenSecondsRef.current += 0.25;
          }
          const d = ytPlayerRef.current.getDuration();
          if (typeof d === 'number' && !isNaN(d) && d > 0) {
            setDuration(d);
          }
        } catch {}
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

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

      navigator.mediaSession.setActionHandler('play', () => resume());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => previous());
      navigator.mediaSession.setActionHandler('nexttrack', () => next());
      navigator.mediaSession.setActionHandler('seekto', details => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }
  }, [currentTrack]);

  const playTrack = useCallback(
    (track: Track, customQueue?: Track[], options?: PlayOptions) => {
      finalizeCurrentPlaySession(false);
      setError(null);
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(track.duration || 0);
      setIsLoading(true);

      if (customQueue && !options?.isSearchPlay) {
        setQueue(customQueue);
      } else {
        // Search play or standalone track play:
        // Clear any keyword search queue immediately so the Next button plays taste recommendations
        setQueue([]);

        // Asynchronously generate tailored taste queue based on user preferences and this song
        (async () => {
          try {
            const candidates = await MusicProviderService.getTailoredCandidates(track, preferences);
            const tasteQueue = RecommendationEngine.generateRecommendationQueue(
              candidates,
              preferences,
              track,
              12,
              [track.id]
            );
            setQueue(tasteQueue);
          } catch (err) {
            console.warn('Failed to populate taste queue:', err);
            const pool = isMalayalamTrack(track)
              ? SEED_TRACKS.filter(t => isMalayalamTrack(t))
              : SEED_TRACKS.filter(t => !isMalayalamTrack(t));
            const fallbackQueue = RecommendationEngine.generateRecommendationQueue(
              pool.length > 0 ? pool : SEED_TRACKS,
              preferences,
              track,
              6,
              [track.id]
            );
            setQueue(fallbackQueue);
          }
        })();
      }

      // Check whether track is a YouTube video or an audio stream
      if (track.providerId === 'youtube') {
        // Pause HTML5 audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }

        const videoId = track.streamUrl;
        if (isYtReadyRef.current && ytPlayerRef.current) {
          try {
            ytPlayerRef.current.loadVideoById(videoId);
            ytPlayerRef.current.playVideo();
            setIsPlaying(true);
          } catch (e) {
            console.warn('Error loading YT video:', e);
          }
        } else {
          pendingYtVideoIdRef.current = videoId;
        }
      } else {
        // Stop YouTube player if playing
        if (isYtReadyRef.current && ytPlayerRef.current) {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch {}
        }

        // Play HTML5 audio
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
      }
    },
    [finalizeCurrentPlaySession, preferences]
  );

  const togglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const pause = () => {
    if (currentTrack?.providerId === 'youtube') {
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const resume = () => {
    if (currentTrack?.providerId === 'youtube') {
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.playVideo();
        } catch {}
      }
      setIsPlaying(true);
    } else if (audioRef.current && currentTrack) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.warn);
    }
  };

  const seek = (seconds: number) => {
    if (currentTrack?.providerId === 'youtube') {
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.seekTo(seconds, true);
        } catch {}
      }
      setCurrentTime(seconds);
    } else if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const next = async () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      const remainingQueue = queue.slice(1);
      if (currentTrack) {
        setHistory(prev => [currentTrack, ...prev].slice(0, 30));
      }
      playTrack(nextTrack, remainingQueue);
      return;
    }

    // Queue is empty: dynamically pick next track according to user's music taste
    if (currentTrack) {
      try {
        setIsLoading(true);
        const candidates = await MusicProviderService.getTailoredCandidates(currentTrack, preferences);
        const nextChoice = RecommendationEngine.selectNextTrack(
          candidates,
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
        console.warn('Taste next track failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    pause();
  };

  const previous = () => {
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
    if (ytPlayerRef.current && isYtReadyRef.current) {
      try {
        ytPlayerRef.current.setVolume(clamped * 100);
      } catch {}
    }
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
    if (currentTrack?.providerId === 'youtube') {
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          if (isMuted) ytPlayerRef.current.unMute();
          else ytPlayerRef.current.mute();
        } catch {}
      }
    }
    if (audioRef.current) {
      const nextMuted = !isMuted;
      audioRef.current.muted = nextMuted;
    }
    setIsMuted(!isMuted);
  };

  const toggleShuffle = () => {
    setShuffle(prev => {
      const nextVal = !prev;
      if (nextVal && queue.length > 1) {
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
      {/* Official YouTube IFrame Player Container (Active in DOM for audio playback) */}
      <div
        id="tavilo-yt-container"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '200px',
          height: '200px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: -9999,
        }}
      >
        <div id="tavilo-yt-player" />
      </div>
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
