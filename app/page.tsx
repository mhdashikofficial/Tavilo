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
} from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { TrackCard } from '@/components/music/TrackCard';
import { TrackRow } from '@/components/music/TrackRow';
import { MoodCard } from '@/components/music/MoodCard';
import { TuneMixModal } from '@/components/tune/TuneMixModal';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { useLibrary } from '@/lib/library/LibraryContext';
import { getTimeGreeting } from '@/lib/utils';
import { Track, Playlist } from '@/types/music';
import { SEED_TRACKS, MOOD_CATEGORIES, CURATED_PLAYLISTS } from '@/lib/music/seed';
import { RecommendationEngine } from '@/lib/recommendations/engine';

export default function HomePage() {
  const { playTrack } = usePlayback();
  const { preferences, playlists, likedTracks } = useLibrary();

  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState<boolean>(true);
  const [isTuneMixOpen, setTuneMixOpen] = useState<boolean>(false);

  // Fetch trending tracks from API
  useEffect(() => {
    let isMounted = true;
    async function loadTrending() {
      try {
        const res = await fetch('/api/trending?limit=12');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.tracks && data.tracks.length > 0) {
            setTrendingTracks(data.tracks);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch /api/trending:', err);
      }
      if (isMounted) {
        setTrendingTracks(SEED_TRACKS);
      }
    }

    loadTrending().finally(() => {
      if (isMounted) setIsLoadingTrending(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute Made For You recommendations
  useEffect(() => {
    const pool = trendingTracks.length > 0 ? trendingTracks : SEED_TRACKS;
    const recs = RecommendationEngine.generateRecommendationQueue(
      pool,
      preferences,
      null,
      6
    );
    setRecommendedTracks(recs);
  }, [trendingTracks, preferences]);

  const greeting = getTimeGreeting();

  // Quick Playlists (Liked songs + Curated)
  const quickItems = [
    {
      id: 'liked-quick',
      title: 'Liked Songs',
      count: `${likedTracks.length} tracks`,
      artwork: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
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
      action: () => {
        if (pl.tracks.length > 0) {
          playTrack(pl.tracks[0], pl.tracks.slice(1));
        }
      },
    })),
  ];

  return (
    <div className="min-h-full">
      <TopBar onOpenTuneMix={() => setTuneMixOpen(true)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-10">
        {/* Header Hero Greeting */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#111622] via-[#0f121a] to-[#181124] border border-tavilo-border p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-tavilo-green/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 -mb-10 w-64 h-64 bg-tavilo-violet/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-tavilo-green/10 border border-tavilo-green/20 text-tavilo-green text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Your Sound. Your World.</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {greeting}
              </h1>
              <p className="text-sm sm:text-base text-tavilo-text-secondary mt-2">
                Discover music curated to your taste, legal high-fidelity streaming, and personalized flow.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setTuneMixOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-tavilo-surface border border-tavilo-violet/40 text-tavilo-violet font-semibold text-xs sm:text-sm hover:bg-tavilo-violet/15 transition-all shadow-sm"
              >
                <Sliders className="w-4 h-4" />
                <span>Tune My Mix</span>
              </button>

              <button
                onClick={() => {
                  const pool = recommendedTracks.length > 0 ? recommendedTracks : SEED_TRACKS;
                  playTrack(pool[0], pool.slice(1));
                }}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-tavilo-green text-black font-bold text-xs sm:text-sm hover:bg-[#00c985] transition-all shadow-lg shadow-tavilo-green/20"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Daily Mix</span>
              </button>
            </div>
          </div>

          {/* Quick Access Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8">
            {quickItems.map((item) => (
              <div
                key={item.id}
                onClick={item.action}
                className="group flex items-center bg-white/5 hover:bg-white/10 rounded-xl overflow-hidden border border-white/5 hover:border-tavilo-green/30 transition-all cursor-pointer shadow-md"
              >
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 bg-black/40">
                  <Image
                    src={item.artwork}
                    alt={item.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized
                  />
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

        {/* Section: Made For You */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-tavilo-violet/20 text-tavilo-violet">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Made For You
              </h2>
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

        {/* Section: Trending Now */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
                <Flame className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Trending on Tavilo
              </h2>
            </div>
            <Link
              href="/search"
              className="text-xs font-semibold text-tavilo-green hover:underline flex items-center space-x-1"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingTrending ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-tavilo-card animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {trendingTracks.slice(0, 6).map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  queueContext={trendingTracks}
                />
              ))}
            </div>
          )}
        </section>

        {/* Section: Browse By Mood & Category */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-tavilo-green">
                <Compass className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Moods & Activities
              </h2>
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

        {/* Section: Continue Listening / Recently Played */}
        {preferences.recentlyPlayed.length > 0 && (
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

        {/* Section: Curated Playlists */}
        <section>
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <Headphones className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Curated Collections
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                    <span className="text-xs font-semibold text-tavilo-green bg-black/60 px-2 py-0.5 rounded-full border border-tavilo-green/30">
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

        {/* Footer Credit & Attributions */}
        <footer className="pt-10 pb-6 border-t border-tavilo-border/60 text-center space-y-2">
          <p className="text-xs text-tavilo-text-secondary font-medium">
            Tavilo — Developed by Ash © 2026
          </p>
          <p className="text-[11px] text-tavilo-text-muted max-w-md mx-auto">
            Powered by Audius Open Network, Jamendo API, Creative Commons, and Tavilo Smart Autoplay recommendation algorithms.
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
