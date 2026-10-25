'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Shuffle, Music, RefreshCw } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { TrackRow } from '@/components/music/TrackRow';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { MOOD_CATEGORIES, SEED_TRACKS } from '@/lib/music/seed';
import { Track } from '@/types/music';

export default function MoodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moodId = (params.id as string)?.toLowerCase();

  const moodInfo = MOOD_CATEGORIES.find((m) => m.id === moodId) || {
    id: moodId,
    label: moodId.charAt(0).toUpperCase() + moodId.slice(1),
    color: 'from-blue-600 to-indigo-900',
    icon: 'Music',
    description: `Curated music for your ${moodId} moments.`,
  };

  const { playTrack } = usePlayback();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    fetch(`/api/mood?mood=${encodeURIComponent(moodId)}&limit=24`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        if (data.success && data.tracks && data.tracks.length > 0) {
          setTracks(data.tracks);
        } else {
          // Fallback to local matching seed tracks
          const seedMatches = SEED_TRACKS.filter(
            (t) =>
              t.moods?.some((m) => m.toLowerCase().includes(moodId)) ||
              t.genre?.toLowerCase().includes(moodId)
          );
          setTracks(seedMatches.length > 0 ? seedMatches : SEED_TRACKS);
        }
      })
      .catch((err) => {
        console.warn('Mood fetch error:', err);
        if (!isCancelled) {
          setTracks(SEED_TRACKS);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [moodId]);

  const handlePlayAll = (shuffleMode: boolean = false) => {
    if (tracks.length === 0) return;
    const tracksToPlay = shuffleMode
      ? [...tracks].sort(() => Math.random() - 0.5)
      : tracks;
    playTrack(tracksToPlay[0], tracksToPlay.slice(1));
  };

  return (
    <div className="min-h-full">
      <TopBar title={moodInfo.label} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Mood Hero Header */}
        <div
          className={`relative overflow-hidden rounded-3xl p-8 sm:p-10 bg-gradient-to-br ${moodInfo.color} border border-white/10 shadow-2xl`}
        >
          <div className="relative z-10 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-white/80 bg-black/30 px-3 py-1 rounded-full border border-white/10">
              Mood & Activity Mix
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-tight">
              {moodInfo.label}
            </h1>
            <p className="text-sm sm:text-base text-white/80 mt-2">
              {moodInfo.description}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handlePlayAll(false)}
            aria-label={`Play ${moodInfo.label} mix`}
            className="w-12 h-12 rounded-full bg-tavilo-green text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-tavilo-green/20"
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </button>
          <button
            onClick={() => handlePlayAll(true)}
            aria-label="Shuffle"
            className="p-3 rounded-full bg-tavilo-card hover:bg-tavilo-surface border border-tavilo-border text-white transition-colors"
          >
            <Shuffle className="w-5 h-5" />
          </button>
          <span className="text-xs text-tavilo-text-muted ml-2">
            {tracks.length} tracks available
          </span>
        </div>

        {/* Track List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-tavilo-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-tavilo-card/50 border border-tavilo-border rounded-2xl p-2 sm:p-4 space-y-1">
            {tracks.map((track, idx) => (
              <TrackRow
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                playlistContext={tracks}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
