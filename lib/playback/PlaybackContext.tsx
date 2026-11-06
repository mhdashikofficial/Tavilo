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
  isBackgroundModalOpen: boolean;
  setBackgroundModalOpen: (open: boolean) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  requestNotificationPermission: () => Promise<boolean>;
  enableWebAudioKeepAlive: () => void;
  isPocketMode: boolean;
  setPocketMode: (active: boolean) => void;
}

const SILENT_AUDIO_URI = '/silence.wav';

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
  const [isBackgroundModalOpen, setBackgroundModalOpen] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isPocketMode, setPocketModeState] = useState<boolean>(false);

  // Web Audio keep-alive reference to prevent Android OS audio track suspension
  const audioCtxRef = useRef<AudioContext | null>(null);
  const keepAliveBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Hidden audio element reference for direct streams & silent background audio anchor
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // YouTube IFrame Player reference
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const pendingYtVideoIdRef = useRef<string | null>(null);
  const isNativeAudioStreamRef = useRef<boolean>(false);

  // Tracks whether the pause was user-initiated or triggered by OS screen-off/backgrounding
  const isUserPausedRef = useRef<boolean>(false);
  // Screen Wake Lock API reference
  const wakeLockRef = useRef<any>(null);

  // Stable callback refs for MediaSession & YouTube error handlers
  const nextRef = useRef<() => void>(() => {});
  const previousRef = useRef<() => void>(() => {});
  const resumeRef = useRef<() => void>(() => {});
  const pauseRef = useRef<() => void>(() => {});
  const seekRef = useRef<(s: number) => void>(() => {});
  const currentTimeRef = useRef<number>(0);
  const playTrackRef = useRef<(track: Track, customQueue?: Track[], options?: PlayOptions) => void>(() => {});
  const playRequestIdRef = useRef<number>(0);

  const listenSecondsRef = useRef<number>(0);
  const trackStartTimeRef = useRef<number>(0);
  // Guards against rapid automatic skip cascading loops on error
  const consecutiveErrorsRef = useRef<number>(0);

  // Request & release Screen Wake Lock to avoid unexpected display sleep while playing
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch {}
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    // Keep WakeLock held if Pocket Mode is active
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  // Check initial notification permission on client
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  // Web Audio keep-alive: keeps AudioTrack hardware pipeline awake in Android JNI
  const enableWebAudioKeepAlive = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      if (keepAliveBufferSourceRef.current) {
        try {
          keepAliveBufferSourceRef.current.stop();
          keepAliveBufferSourceRef.current.disconnect();
        } catch {}
        keepAliveBufferSourceRef.current = null;
      }

      const sampleRate = audioCtxRef.current.sampleRate || 44100;
      const buffer = audioCtxRef.current.createBuffer(1, sampleRate, sampleRate);
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gainNode = audioCtxRef.current.createGain();
      // Ultra-low non-zero gain keeps audio bus pipeline active without audible noise
      gainNode.gain.setValueAtTime(0.0001, audioCtxRef.current.currentTime);

      source.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);
      source.start(0);

      keepAliveBufferSourceRef.current = source;
    } catch (err) {
      console.warn('Web Audio Keep-Alive setup error:', err);
    }
  }, []);

  // Request Android Notification permission to keep lock screen media player pinned
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
          try {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('🎵 Tavilo Background Audio Active', {
              body: 'Background audio & lock-screen playback unlocked. Music will keep playing with screen turned off.',
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: 'tavilo-playback-ready',
            });
          } catch {
            new Notification('🎵 Tavilo Background Audio Active', {
              body: 'Background audio & lock-screen playback unlocked. Music will keep playing with screen turned off.',
              icon: '/icons/icon-192.png',
            });
          }
        } else {
          new Notification('🎵 Tavilo Background Audio Active', {
            body: 'Background audio & lock-screen playback unlocked. Music will keep playing with screen turned off.',
            icon: '/icons/icon-192.png',
          });
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Failed to request notification permission:', err);
      return false;
    }
  }, []);

  const setPocketMode = useCallback(
    (active: boolean) => {
      setPocketModeState(active);
      if (active) {
        requestWakeLock();
        enableWebAudioKeepAlive();
      } else {
        if (!isPlaying) {
          releaseWakeLock();
        }
      }
    },
    [isPlaying, requestWakeLock, releaseWakeLock, enableWebAudioKeepAlive]
  );

  // Initialize Audio Element safely on client
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.setAttribute('playsinline', 'true');
    audio.preload = 'auto';

    // Restore volume
    try {
      const savedVol = localStorage.getItem('tavilo_volume');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        audio.volume = v;
        setVolumeState(v);
      }
    } catch {}

    const handleTimeUpdate = () => {
      if (isNativeAudioStreamRef.current || !currentTrack || currentTrack.providerId !== 'youtube') {
        const cur = audio.currentTime;
        currentTimeRef.current = cur;
        setCurrentTime(cur);
        listenSecondsRef.current += 0.25;

        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
          if (!isNaN(audio.duration) && audio.duration > 0) {
            try {
              navigator.mediaSession.setPositionState({
                duration: Math.max(0, audio.duration),
                playbackRate: 1,
                position: Math.min(audio.duration, Math.max(0, cur || 0)),
              });
            } catch {}
          }
        }
      }
    };

    const handleDurationChange = () => {
      if (isNativeAudioStreamRef.current || !currentTrack || currentTrack.providerId !== 'youtube') {
        if (!isNaN(audio.duration) && audio.duration > 0 && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      }
    };

    const handlePlaying = () => {
      consecutiveErrorsRef.current = 0;
      if (isNativeAudioStreamRef.current || !currentTrack || currentTrack.providerId !== 'youtube') {
        setIsPlaying(true);
        setIsLoading(false);
        setError(null);
        requestWakeLock();
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }
    };

    const handlePause = () => {
      if (isNativeAudioStreamRef.current || !currentTrack || currentTrack.providerId !== 'youtube') {
        setIsPlaying(false);
        releaseWakeLock();
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      }
    };

    const handleWaiting = () => {
      if (isNativeAudioStreamRef.current || !currentTrack || currentTrack.providerId !== 'youtube') {
        setIsLoading(true);
      }
    };

    const handleCanPlay = () => {
      if (isNativeAudioStreamRef.current || !currentTrack || currentTrack.providerId !== 'youtube') {
        setIsLoading(false);
      }
    };

    const handleError = (e: any) => {
      if (isNativeAudioStreamRef.current || !currentTrack || currentTrack.providerId !== 'youtube') {
        console.error('Audio playback error:', e);
        setIsLoading(false);
        setIsPlaying(false);
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current <= 2 && queue.length > 0) {
          nextRef.current();
        } else {
          consecutiveErrorsRef.current = 0;
          setError('Playback issue. Tap to play another track.');
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [currentTrack, requestWakeLock, releaseWakeLock]);

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
      seekRef.current(0);
      resumeRef.current();
      return;
    }

    if (queue.length > 0) {
      const nextTrack = queue[0];
      const remainingQueue = queue.slice(1);
      if (currentTrack) {
        setHistory(prev => [currentTrack, ...prev].slice(0, 30));
      }
      setQueue(remainingQueue);
      playTrackRef.current(nextTrack, remainingQueue);
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
          playTrackRef.current(nextChoice);
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
      playTrackRef.current(restarted);
      return;
    }

    setIsPlaying(false);
  }, [repeat, queue, currentTrack, preferences, history, finalizeCurrentPlaySession]);

  // Hook HTML5 Audio onended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.onended = () => {
      // Triggered when native stream or audio ends
      handleTrackEnded();
    };
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
            iv_load_policy: 3,
            modestbranding: 1,
          },
          events: {
            onReady: (event: any) => {
              isYtReadyRef.current = true;
              event.target.setVolume(volume * 100);
              try {
                const iframe = event.target.getIframe?.();
                if (iframe) {
                  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
                }
              } catch {}
              if (pendingYtVideoIdRef.current) {
                event.target.loadVideoById(pendingYtVideoIdRef.current);
                event.target.playVideo();
                pendingYtVideoIdRef.current = null;
              }
            },
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
              if (event.data === 1) {
                consecutiveErrorsRef.current = 0;
                setIsPlaying(true);
                setIsLoading(false);
                setError(null);
                requestWakeLock();
                if ('mediaSession' in navigator) {
                  navigator.mediaSession.playbackState = 'playing';
                }
                // Ensure silent audio anchor is active to preserve Android background AudioFocus
                if (audioRef.current && audioRef.current.paused) {
                  try {
                    audioRef.current.loop = true;
                    if (!audioRef.current.src.includes('silence.wav')) {
                      audioRef.current.src = SILENT_AUDIO_URI;
                    }
                    audioRef.current.volume = 1.0;
                    audioRef.current.play().catch(() => {});
                  } catch {}
                }
              } else if (event.data === 2) {
                // If not initiated by user, but by Android screen-off or background visibility loss:
                if (!isUserPausedRef.current) {
                  // Keep audio anchor alive with volume 1.0 so Android AudioFocus and lock-screen notification are NEVER killed!
                  if (audioRef.current) {
                    try {
                      audioRef.current.loop = true;
                      if (!audioRef.current.src.includes('silence.wav')) {
                        audioRef.current.src = SILENT_AUDIO_URI;
                      }
                      audioRef.current.volume = 1.0;
                      audioRef.current.play().catch(() => {});
                    } catch {}
                  }

                  // Force resume YouTube player immediately
                  if (ytPlayerRef.current) {
                    try {
                      ytPlayerRef.current.playVideo();
                    } catch {}
                  }

                  // Verify after 300ms if playback resumed or if browser enforced background pause
                  setTimeout(() => {
                    if (!isUserPausedRef.current && ytPlayerRef.current) {
                      const playerState = ytPlayerRef.current.getPlayerState?.();
                      if (playerState === 1) {
                        // Resumed and actively playing in background!
                        setIsPlaying(true);
                        if ('mediaSession' in navigator) {
                          navigator.mediaSession.playbackState = 'playing';
                        }
                      } else {
                        // Browser suspended video decoding in background.
                        // Set MediaSession to 'paused' so the Android lock-screen and notification shade display the PLAY (▶) button.
                        // When user taps PLAY on the lock screen / notification, Android passes user gesture to our MediaSession 'play' handler, which immediately resumes playback!
                        setIsPlaying(false);
                        if ('mediaSession' in navigator) {
                          navigator.mediaSession.playbackState = 'paused';
                        }
                      }
                    }
                  }, 300);
                } else {
                  // User explicitly initiated the pause
                  setIsPlaying(false);
                  if (!isPocketMode) {
                    releaseWakeLock();
                  }
                  if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'paused';
                  }
                  if (audioRef.current) {
                    try {
                      audioRef.current.pause();
                    } catch {}
                  }
                }
              } else if (event.data === 0) {
                handleTrackEnded();
              } else if (event.data === 3) {
                setIsLoading(true);
              }
            },
            onError: (err: any) => {
              console.warn('YouTube playback error:', err);
              setIsLoading(false);
              consecutiveErrorsRef.current += 1;
              if (consecutiveErrorsRef.current <= 2 && queue.length > 0) {
                nextRef.current();
              } else {
                consecutiveErrorsRef.current = 0;
                setIsPlaying(false);
                setError('Unable to stream this track. Tap another song.');
              }
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
  }, [handleTrackEnded, volume, requestWakeLock, releaseWakeLock]);

  // Handle visibility changes (phone locked, screen turned off, or app backgrounded)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Device screen turned off or user switched apps
        if (!isUserPausedRef.current && currentTrack) {
          enableWebAudioKeepAlive();
          if (isNativeAudioStreamRef.current) {
            // Native MP4 stream is active on audioRef. Ensure it continues playing smoothly
            if (audioRef.current && audioRef.current.paused) {
              audioRef.current.play().catch(() => {});
            }
          } else {
            // Keep silent audio anchor running with full volume (0-PCM silent WAV) so Android AudioFocus and AudioTrack remain active
            if (audioRef.current && audioRef.current.paused) {
              try {
                audioRef.current.loop = true;
                if (!audioRef.current.src.includes('silence.wav')) {
                  audioRef.current.src = SILENT_AUDIO_URI;
                }
                audioRef.current.volume = 1.0;
                audioRef.current.play().catch(() => {});
              } catch {}
            }
            // Resume YouTube if paused by visibility change
            if (currentTrack?.providerId === 'youtube' && ytPlayerRef.current) {
              try {
                ytPlayerRef.current.playVideo();
              } catch {}
            }
          }
        }
      } else if (document.visibilityState === 'visible') {
        // User came back to the app: sync playing state
        if (isNativeAudioStreamRef.current && audioRef.current) {
          if (!audioRef.current.paused) {
            setIsPlaying(true);
          }
        } else if (currentTrack?.providerId === 'youtube' && ytPlayerRef.current && isYtReadyRef.current) {
          try {
            const state = ytPlayerRef.current.getPlayerState();
            if (state === 1) {
              setIsPlaying(true);
            } else if (state === 2 && !isUserPausedRef.current) {
              ytPlayerRef.current.playVideo();
              setIsPlaying(true);
            }
          } catch {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, currentTrack, enableWebAudioKeepAlive]);

  // YouTube polling for currentTime & duration during fallback playback
  useEffect(() => {
    if (!isPlaying || !currentTrack || currentTrack.providerId !== 'youtube' || isNativeAudioStreamRef.current) return;

    const interval = setInterval(() => {
      // If native stream is active, do not poll YouTube player (prevents time bar flicker)
      if (isNativeAudioStreamRef.current) return;

      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          if (typeof t === 'number' && !isNaN(t)) {
            currentTimeRef.current = t;
            setCurrentTime(t);
            listenSecondsRef.current += 0.25;
          }
          const d = ytPlayerRef.current.getDuration();
          if (typeof d === 'number' && !isNaN(d) && d > 0 && isFinite(d)) {
            setDuration(d);
            // Update MediaSession position state for Android 13/14/15 lock screen seekbar
            if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
              try {
                navigator.mediaSession.setPositionState({
                  duration: Math.max(0, d),
                  playbackRate: 1,
                  position: Math.min(d, Math.max(0, t || 0)),
                });
              } catch {}
            }
          }
        } catch {}
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  // Sync MediaSession API for Android System UI, Lock Screen, and Bluetooth
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: [
          { src: currentTrack.artwork, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.artwork, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.artwork, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.artwork, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.artwork, sizes: '384x384', type: 'image/jpeg' },
          { src: currentTrack.artwork, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => {
        isUserPausedRef.current = false;
        resumeRef.current();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        isUserPausedRef.current = true;
        pauseRef.current();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => previousRef.current());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextRef.current());
      navigator.mediaSession.setActionHandler('seekto', details => {
        if (details.seekTime !== undefined) {
          seekRef.current(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', details => {
        const offset = details.seekOffset || 10;
        seekRef.current(Math.min(duration, currentTimeRef.current + offset));
      });
      navigator.mediaSession.setActionHandler('seekbackward', details => {
        const offset = details.seekOffset || 10;
        seekRef.current(Math.max(0, currentTimeRef.current - offset));
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        isUserPausedRef.current = true;
        pauseRef.current();
      });
    }
  }, [currentTrack, duration, isPlaying]);

  const playTrack = useCallback(
    (track: Track, customQueue?: Track[], options?: PlayOptions) => {
      const currentRequestId = ++playRequestIdRef.current;
      finalizeCurrentPlaySession(false);
      setError(null);
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(track.duration || 0);
      setIsLoading(true);
      isNativeAudioStreamRef.current = false;

      // Stop previous audio and prime element with silence in user gesture context (prevents old song bleeding)
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = SILENT_AUDIO_URI;
        audioRef.current.play().catch(() => {});
      }
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }

      if (customQueue && !options?.isSearchPlay) {
        // Find index of clicked track to set up upcoming queue and history correctly
        const trackIndex = customQueue.findIndex((t) => t.id === track.id);
        if (trackIndex !== -1) {
          const upcoming = customQueue.slice(trackIndex + 1);
          setQueue(upcoming);
          const preceding = customQueue.slice(0, trackIndex);
          if (preceding.length > 0) {
            setHistory((prev) => [...preceding.reverse(), ...prev].slice(0, 30));
          }
        } else {
          setQueue(customQueue);
        }
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
            if (playRequestIdRef.current === currentRequestId) {
              setQueue(tasteQueue);
            }
          } catch (err) {
            console.warn('Failed to populate taste queue:', err);
            const pool = isMalayalamTrack(track)
              ? SEED_TRACKS.filter((t) => isMalayalamTrack(t))
              : SEED_TRACKS.filter((t) => !isMalayalamTrack(t));
            const fallbackQueue = RecommendationEngine.generateRecommendationQueue(
              pool.length > 0 ? pool : SEED_TRACKS,
              preferences,
              track,
              6,
              [track.id]
            );
            if (playRequestIdRef.current === currentRequestId) {
              setQueue(fallbackQueue);
            }
          }
        })();
      }

      // Check whether track is a YouTube video or an audio stream
      if (track.providerId === 'youtube') {
        isUserPausedRef.current = false;
        enableWebAudioKeepAlive();

        const videoId = track.streamUrl.replace('yt-', '');

        (async () => {
          // Native HTML5 Audio Streaming via /api/stream
          // Plays the 100% genuine original copy directly from YouTube as native audio.
          // Native HTML5 audio works 100% in background, on minimize, and with screen locked!
          try {
            if (audioRef.current) {
              if (isYtReadyRef.current && ytPlayerRef.current) {
                try {
                  ytPlayerRef.current.pauseVideo();
                } catch {}
              }

              const nativeStreamUrl = `/api/stream?id=${encodeURIComponent(videoId)}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`;
              isNativeAudioStreamRef.current = true;
              audioRef.current.loop = false;
              audioRef.current.src = nativeStreamUrl;
              audioRef.current.volume = volume;
              await audioRef.current.play();

              if (playRequestIdRef.current !== currentRequestId) return;
              setIsPlaying(true);
              setIsLoading(false);
              requestWakeLock();

              if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                  title: track.title,
                  artist: track.artist,
                  album: track.album,
                  artwork: [
                    { src: track.artwork, sizes: '512x512', type: 'image/jpeg' },
                  ],
                });
                navigator.mediaSession.playbackState = 'playing';
              }
              return;
            }
          } catch (err) {
            console.warn('Native HTML5 /api/stream initial playback error, retrying fallback studio stream:', err);
            // Secondary Audio Fallback: Direct studio resolver (keeps playback 100% native HTML5 audio!)
            try {
              const res = await fetch(`/api/audio?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
              if (res.ok) {
                const data = await res.json();
                if (data.streamUrl && audioRef.current) {
                  audioRef.current.src = data.streamUrl;
                  await audioRef.current.play();
                  if (playRequestIdRef.current !== currentRequestId) return;
                  setIsPlaying(true);
                  setIsLoading(false);
                  requestWakeLock();
                  return;
                }
              }
            } catch (fallbackErr) {
              console.warn('Fallback studio stream error:', fallbackErr);
            }
          }

          if (playRequestIdRef.current !== currentRequestId) return;
          setIsLoading(false);
          setIsPlaying(false);
          setError('Audio stream unavailable. Tap next to skip.');
        })();
      } else {
        isUserPausedRef.current = false;
        enableWebAudioKeepAlive();

        // Stop YouTube player if playing
        if (isYtReadyRef.current && ytPlayerRef.current) {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch {}
        }

        // Play HTML5 audio directly
        if (audioRef.current) {
          isNativeAudioStreamRef.current = true;
          audioRef.current.loop = false;
          audioRef.current.src = track.streamUrl;
          audioRef.current.volume = volume;
          audioRef.current
            .play()
            .then(() => {
              if (playRequestIdRef.current !== currentRequestId) return;
              setIsPlaying(true);
              setIsLoading(false);
              requestWakeLock();
            })
            .catch(err => {
              console.warn('Playback initiation prevented or failed:', err);
              if (playRequestIdRef.current === currentRequestId) {
                setIsLoading(false);
                setIsPlaying(false);
              }
            });
        }
      }
    },
    [finalizeCurrentPlaySession, preferences, requestWakeLock, volume, enableWebAudioKeepAlive]
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
    isUserPausedRef.current = true;
    if (isNativeAudioStreamRef.current && audioRef.current) {
      audioRef.current.pause();
    } else if (currentTrack?.providerId === 'youtube') {
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (keepAliveBufferSourceRef.current) {
      try {
        keepAliveBufferSourceRef.current.stop();
        keepAliveBufferSourceRef.current.disconnect();
      } catch {}
      keepAliveBufferSourceRef.current = null;
    }
    setIsPlaying(false);
    releaseWakeLock();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  };

  const resume = () => {
    isUserPausedRef.current = false;
    enableWebAudioKeepAlive();
    if (isNativeAudioStreamRef.current && audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          requestWakeLock();
        })
        .catch(console.warn);
    } else if (currentTrack?.providerId === 'youtube') {
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.playVideo();
        } catch {}
      }
      if (audioRef.current) {
        try {
          audioRef.current.loop = true;
          if (!audioRef.current.src.includes('silence.wav')) {
            audioRef.current.src = SILENT_AUDIO_URI;
          }
          audioRef.current.volume = 1.0;
          audioRef.current.play().catch(() => {});
        } catch {}
      }
      setIsPlaying(true);
      requestWakeLock();
    } else if (audioRef.current && currentTrack) {
      audioRef.current.loop = false;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          requestWakeLock();
        })
        .catch(console.warn);
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  };

  const seek = (seconds: number) => {
    if (isNativeAudioStreamRef.current && audioRef.current) {
      audioRef.current.currentTime = seconds;
      currentTimeRef.current = seconds;
      setCurrentTime(seconds);
    } else if (currentTrack?.providerId === 'youtube') {
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.seekTo(seconds, true);
        } catch {}
      }
      currentTimeRef.current = seconds;
      setCurrentTime(seconds);
    } else if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      currentTimeRef.current = seconds;
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

  pauseRef.current = pause;
  resumeRef.current = resume;
  seekRef.current = seek;
  nextRef.current = next;
  previousRef.current = previous;
  playTrackRef.current = playTrack;

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
        isBackgroundModalOpen,
        setBackgroundModalOpen,
        notificationPermission,
        requestNotificationPermission,
        enableWebAudioKeepAlive,
        isPocketMode,
        setPocketMode,
      }}
    >
      {children}
      {/* Official YouTube IFrame Player Container (Active in DOM for audio playback) */}
      <div
        id="tavilo-yt-container"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '200px',
          height: '200px',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <div id="tavilo-yt-player" />
      </div>
      {/* Persistent HTML5 audio element for Android AudioFocus and background playback */}
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0.01,
          pointerEvents: 'none',
        }}
      />
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
