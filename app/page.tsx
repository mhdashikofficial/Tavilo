'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Flame,
  Clock,
  Play,
  Compass,
  ArrowRight,
  Headphones,
  Sliders,
  Globe,
  Radio,
  Shuffle,
  Heart,
  Zap,
} from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { TrackCard } from '@/components/music/TrackCard';
import { TrackRow } from '@/components/music/TrackRow';
import { MoodCard } from '@/components/music/MoodCard';
import { TuneMixModal } from '@/components/tune/TuneMixModal';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { useLibrary } from '@/lib/library/LibraryContext';
import { getTimeGreeting, cn } from '@/lib/utils';
import { Track, Playlist } from '@/types/music';
import { SEED_TRACKS, MOOD_CATEGORIES, CURATED_PLAYLISTS } from '@/lib/music/seed';
import { RecommendationEngine } from '@/lib/recommendations/engine';

export default function HomePage() {
  const { playTrack } = usePlayback();
  const { preferences, playlists, likedTracks } = useLibrary();

  const [malayalamTracks, setMalayalamTracks] = useState<Track[]>([]);
  const [englishTracks, setEnglishTracks] = useState<Track[]>([]);
  const [viralTracks, setViralTracks] = useState<Track[]>([]);
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);
  const [isLoadingMalayalam, setIsLoadingMalayalam] = useState<boolean>(true);
  const [isLoadingEnglish, setIsLoadingEnglish] = useState<boolean>(true);
  const [isLoadingViral, setIsLoadingViral] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'malayalam' | 'english' | 'viral' | 'foryou'>('all');
  const [isTuneMixOpen, setTuneMixOpen] = useState<boolean>(false);

  // Fetch Malayalam Trending from YouTube
  useEffect(() => {
    let isMounted = true;
    async function loadMalayalam() {
      try {
        const res = await fetch('/api/trending?category=malayalam&limit=12');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.tracks && data.tracks.length > 0) {
            setMalayalamTracks(data.tracks);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch Malayalam trending:', err);
      }
      if (isMounted) {
        setMalayalamTracks(SEED_TRACKS.filter((t) => t.genre === 'Malayalam'));
      }
    }

    loadMalayalam().finally(() => {
      if (isMounted) setIsLoadingMalayalam(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch English Trending from YouTube
  useEffect(() => {
    let isMounted = true;
    async function loadEnglish() {
      try {
        const res = await fetch('/api/trending?category=english&limit=12');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.tracks && data.tracks.length > 0) {
            setEnglishTracks(data.tracks);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch English trending:', err);
      }
      if (isMounted) {
        setEnglishTracks(SEED_TRACKS.filter((t) => t.genre !== 'Malayalam'));
      }
    }

    loadEnglish().finally(() => {
      if (isMounted) setIsLoadingEnglish(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Viral & Trending from YouTube
  useEffect(() => {
    let isMounted = true;
    async function loadViral() {
      try {
        const res = await fetch('/api/trending?category=viral&limit=12');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.tracks && data.tracks.length > 0) {
            setViralTracks(data.tracks);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch Viral trending:', err);
      }
      if (isMounted) {
        setViralTracks(SEED_TRACKS.slice(0, 6));
      }
    }

    loadViral().finally(() => {
      if (isMounted) setIsLoadingViral(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute Made For You recommendations
  useEffect(() => {
    const pool = [...englishTracks, ...malayalamTracks, ...viralTracks, ...SEED_TRACKS];
    if (pool.length > 0) {
      const recs = RecommendationEngine.generateRecommendationQueue(
        pool,
        preferences,
        null,
        6
      );
      setRecommendedTracks(recs);
    }
  }, [englishTracks, malayalamTracks, viralTracks, preferences]);

  const greeting = getTimeGreeting();

  // Quick Items (Liked songs badge + Curated Playlists with YouTube thumbnails)
  const quickItems = [
    {
      id: 'liked-quick',
      title: 'Liked Songs',
      count: `${likedTracks.length} tracks`,
      artwork: likedTracks.length > 0 && likedTracks[0].artwork
        ? likedTracks[0].artwork
        : 'https://i.ytimg.com/vi/60ItHLz5WEA/hqdefault.jpg',
      isLiked: true,
      action: () => {
        if (likedTracks.length > 0) {
          playTrack(likedTracks[0], likedTracks.slice(1));
        }
      },
    },
    ...playlists.slice(0, 3).map((pl: Playlist) => ({
      id: pl.id,
      title: pl.title,
      count: `${pl.trackCount} tracks`,
      artwork: pl.artwork,
      isLiked: false,
      action: () => {
        if (pl.tracks.length > 0) {
          playTrack(pl.tracks[0], pl.tracks.slice(1));
        }
      },
    })),
  ];

  const handlePlayCategory = (tracks: Track[], shuffle: boolean = false) => {
    if (!tracks || tracks.length === 0) return;
    const ordered = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
    playTrack(ordered[0], ordered.slice(1));
  };

  return (
    <div className="min-h-full">
      <TopBar onOpenTuneMix={() => setTuneMixOpen(true)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-10">
        {/* Header Hero Greeting */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#111622] via-[#0f121a] to-[#181124] border border-tavilo-border p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-tavilo-green/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 -mb-10 w-64 h-64 bg-tavilo-violet/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-tavilo-surface/80 border border-tavilo-green/30 text-[11px] font-bold text-tavilo-green mb-3">
                <span className="w-2 h-2 rounded-full bg-tavilo-green animate-pulse" />
                <span>YOUTUBE MUSIC STREAMING</span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                {greeting}
              </h1>
              <p className="text-xs sm:text-sm text-tavilo-text-secondary mt-2 max-w-xl">
                Real YouTube hits, intelligent auto-discovery, and zero ads. Your sound. Your world.
              </p>
            </div>

            <div className="flex items-center space-x-3 self-start md:self-auto">
              <button
                onClick={() => setTuneMixOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-tavilo-card hover:bg-tavilo-surface border border-tavilo-border text-white text-xs font-semibold transition-all shadow-md"
              >
                <Sliders className="w-3.5 h-3.5 text-tavilo-violet" />
                <span>Tune Mix: {preferences.tuneMixMode}</span>
              </button>
            </div>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8">
            {quickItems.map((item) => (
              <div
                key={item.id}
                onClick={item.action}
                className="group flex items-center bg-white/5 hover:bg-white/10 rounded-xl overflow-hidden border border-white/5 hover:border-tavilo-green/30 transition-all cursor-pointer shadow-md"
              >
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 bg-black/40">
                  {item.isLiked ? (
                    <div className="w-full h-full bg-gradient-to-br from-tavilo-green to-emerald-900 flex items-center justify-center text-black">
                      <Heart className="w-6 h-6 fill-current" />
                    </div>
                  ) : (
                    <Image
                      src={item.artwork}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div className="px-3 min-w-0 flex-1">
                  <p className="font-semibold text-xs sm:text-sm text-white group-hover:text-tavilo-green truncate transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-tavilo-text-muted truncate">
                    {item.count}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Category Pills Navigation */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'all', label: 'All Music' },
            { id: 'malayalam', label: '🌴 Malayalam Hits' },
            { id: 'english', label: '🌍 Global English' },
            { id: 'viral', label: '🔥 Viral Bangers' },
            { id: 'foryou', label: '✨ Made For You' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm',
                activeCategory === cat.id
                  ? 'bg-tavilo-green text-black shadow-tavilo-green/20'
                  : 'bg-tavilo-card hover:bg-tavilo-surface text-tavilo-text-secondary hover:text-white border border-tavilo-border'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Section: Trending Malayalam Hits (YouTube Music) */}
        {(activeCategory === 'all' || activeCategory === 'malayalam') && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
                  <Flame className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Trending Malayalam Hits
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-red-950/70 border border-red-500/30 text-[10px] font-bold text-red-400 uppercase tracking-wide">
                      YouTube Top
                    </span>
                  </div>
                  <p className="text-xs text-tavilo-text-secondary">
                    Latest Mollywood chartbusters, viral reels, and cinema melodies
                  </p>
                </div>
              </div>

              {malayalamTracks.length > 0 && (
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <button
                    onClick={() => handlePlayCategory(malayalamTracks, false)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-tavilo-green text-black text-xs font-bold hover:bg-[#00c985] transition-all shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play All</span>
                  </button>
                  <button
                    onClick={() => handlePlayCategory(malayalamTracks, true)}
                    className="p-2 rounded-full bg-tavilo-card hover:bg-tavilo-surface border border-tavilo-border text-white transition-colors"
                    title="Shuffle Malayalam"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {isLoadingMalayalam ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-tavilo-card animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {malayalamTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    queueContext={malayalamTracks}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Section: Global English Hits (YouTube Music) */}
        {(activeCategory === 'all' || activeCategory === 'english') && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Global English Chartbusters
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-red-950/70 border border-red-500/30 text-[10px] font-bold text-red-400 uppercase tracking-wide">
                      Billboard Viral
                    </span>
                  </div>
                  <p className="text-xs text-tavilo-text-secondary">
                    International top hits, pop anthems, and worldwide trending releases
                  </p>
                </div>
              </div>

              {englishTracks.length > 0 && (
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <button
                    onClick={() => handlePlayCategory(englishTracks, false)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-tavilo-green text-black text-xs font-bold hover:bg-[#00c985] transition-all shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play All</span>
                  </button>
                  <button
                    onClick={() => handlePlayCategory(englishTracks, true)}
                    className="p-2 rounded-full bg-tavilo-card hover:bg-tavilo-surface border border-tavilo-border text-white transition-colors"
                    title="Shuffle English"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {isLoadingEnglish ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-tavilo-card animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {englishTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    queueContext={englishTracks}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Section: Trending Viral Bangers (YouTube Music) */}
        {(activeCategory === 'all' || activeCategory === 'viral') && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-md">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Trending Viral Bangers
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-red-950/70 border border-red-500/30 text-[10px] font-bold text-red-400 uppercase tracking-wide">
                      YouTube Trending
                    </span>
                  </div>
                  <p className="text-xs text-tavilo-text-secondary">
                    South Indian sensations, high-energy cinema drops, and trending reels
                  </p>
                </div>
              </div>

              {viralTracks.length > 0 && (
                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <button
                    onClick={() => handlePlayCategory(viralTracks, false)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-tavilo-green text-black text-xs font-bold hover:bg-[#00c985] transition-all shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play All</span>
                  </button>
                  <button
                    onClick={() => handlePlayCategory(viralTracks, true)}
                    className="p-2 rounded-full bg-tavilo-card hover:bg-tavilo-surface border border-tavilo-border text-white transition-colors"
                    title="Shuffle Viral"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {isLoadingViral ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-tavilo-card animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {viralTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    queueContext={viralTracks}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Section: Made For You */}
        {(activeCategory === 'all' || activeCategory === 'foryou') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-tavilo-violet/20 text-tavilo-violet">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Made For You
                  </h2>
                  <p className="text-xs text-tavilo-text-secondary">
                    Personalized flow calculated from your listening patterns
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTuneMixOpen(true)}
                className="text-xs font-semibold text-tavilo-violet hover:underline flex items-center space-x-1"
              >
                <span>{preferences.tuneMixMode.toUpperCase()} MODE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {recommendedTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  queueContext={recommendedTracks}
                />
              ))}
            </div>
          </section>
        )}

        {/* Section: Browse By Mood & Category */}
        {activeCategory === 'all' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-tavilo-green">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Moods & Activities
                  </h2>
                  <p className="text-xs text-tavilo-text-secondary">
                    Explore curated YouTube music tailored for every vibe and moment
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {MOOD_CATEGORIES.map((m) => (
                <MoodCard
                  key={m.id}
                  id={m.id}
                  label={m.label}
                  color={m.color}
                  icon={m.icon}
                  description={m.description}
                />
              ))}
            </div>
          </section>
        )}

        {/* Section: Continue Listening / Recently Played */}
        {preferences.recentlyPlayed.length > 0 && activeCategory === 'all' && (
          <section>
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Continue Listening
              </h2>
            </div>

            <div className="bg-tavilo-card/40 border border-tavilo-border rounded-2xl p-2 sm:p-4 space-y-1">
              {preferences.recentlyPlayed.slice(0, 5).map((item, idx) => (
                <TrackRow
                  key={`${item.track.id}-${idx}`}
                  track={item.track}
                  index={idx}
                  playlistContext={preferences.recentlyPlayed.map((r) => r.track)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Section: Curated Playlists (YouTube Music) */}
        {activeCategory === 'all' && (
          <section>
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Curated YouTube Collections
                </h2>
                <p className="text-xs text-tavilo-text-secondary">
                  Hand-crafted thematic playlists featuring iconic YouTube hits
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CURATED_PLAYLISTS.map((pl) => (
                <Link
                  key={pl.id}
                  href={`/playlist/${pl.id}`}
                  className="group flex flex-col p-4 rounded-2xl bg-tavilo-card/60 hover:bg-tavilo-card border border-tavilo-border/60 hover:border-tavilo-green/40 transition-all shadow-lg"
                >
                  <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden mb-3 bg-black/40">
                    <Image
                      src={pl.artwork}
                      alt={pl.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                      <span className="text-xs font-semibold text-tavilo-green bg-black/70 px-2 py-0.5 rounded-full border border-tavilo-green/30">
                        {pl.trackCount} Tracks
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-base text-white group-hover:text-tavilo-green transition-colors">
                    {pl.title}
                  </h3>
                  <p className="text-xs text-tavilo-text-secondary mt-1 line-clamp-2">
                    {pl.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Footer Credit & Attributions */}
        <footer className="pt-10 pb-6 border-t border-tavilo-border/60 text-center space-y-2">
          <p className="text-xs text-tavilo-text-secondary font-medium">
            Tavilo — Developed by Ash © 2026
          </p>
          <p className="text-[11px] text-tavilo-text-muted max-w-md mx-auto">
            Powered by YouTube Music Catalog, official embedded playback, and Tavilo Smart Autoplay recommendation algorithms.
          </p>
          <div className="flex justify-center space-x-4 text-xs text-tavilo-green pt-1">
            <Link href="/about" className="hover:underline">About & Licensing</Link>
            <span>•</span>
            <Link href="/library" className="hover:underline">Your Library</Link>
            <span>•</span>
            <button onClick={() => setTuneMixOpen(true)} className="hover:underline">Tune Mix</button>
          </div>
        </footer>
      </div>

      <TuneMixModal
        isOpen={isTuneMixOpen}
        onClose={() => setTuneMixOpen(false)}
      />
    </div>
  );
}
