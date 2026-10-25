'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Shuffle, Music, ArrowLeft, Plus } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { TrackRow } from '@/components/music/TrackRow';
import { useLibrary } from '@/lib/library/LibraryContext';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { formatTime } from '@/lib/utils';

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params.id as string;

  const { playlists } = useLibrary();
  const { playTrack } = usePlayback();

  const playlist = playlists.find((p) => p.id === playlistId);

  if (!playlist) {
    return (
      <div className="min-h-full">
        <TopBar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
          <Music className="w-12 h-12 text-tavilo-text-muted mx-auto opacity-40" />
          <h2 className="text-xl font-bold text-white">Playlist not found</h2>
          <p className="text-xs text-tavilo-text-secondary">
            This playlist may have been deleted or the link is invalid.
          </p>
          <button
            onClick={() => router.push('/library')}
            className="px-4 py-2 rounded-xl bg-tavilo-green text-black text-xs font-bold"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  const totalDuration = playlist.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  const handlePlayAll = (shuffleMode: boolean = false) => {
    if (playlist.tracks.length === 0) return;
    const tracksToPlay = shuffleMode
      ? [...playlist.tracks].sort(() => Math.random() - 0.5)
      : playlist.tracks;
    playTrack(tracksToPlay[0], tracksToPlay.slice(1));
  };

  return (
    <div className="min-h-full">
      <TopBar title={playlist.title} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Playlist Hero Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-5 sm:space-y-0 sm:space-x-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#141824] to-tavilo-card border border-tavilo-border shadow-2xl">
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl bg-black/50 flex-shrink-0 border border-white/10">
            <Image
              src={playlist.artwork}
              alt={playlist.title}
              fill
              sizes="(max-width: 640px) 160px, 192px"
              className="object-cover"
              priority
              unoptimized
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-tavilo-green">
              Playlist
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
              {playlist.title}
            </h1>
            {playlist.description && (
              <p className="text-xs sm:text-sm text-tavilo-text-secondary mt-2 max-w-xl">
                {playlist.description}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-tavilo-text-muted mt-3">
              <span>{playlist.tracks.length} songs</span>
              <span>•</span>
              <span>{Math.round(totalDuration / 60)} minutes</span>
              {playlist.isCustom && (
                <>
                  <span>•</span>
                  <span className="text-tavilo-violet font-semibold">Custom Collection</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        {playlist.tracks.length > 0 && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handlePlayAll(false)}
              aria-label="Play Playlist"
              className="w-12 h-12 rounded-full bg-tavilo-green text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-tavilo-green/20"
            >
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </button>
            <button
              onClick={() => handlePlayAll(true)}
              aria-label="Shuffle Playlist"
              className="p-3 rounded-full bg-tavilo-card hover:bg-tavilo-surface border border-tavilo-border text-white transition-colors"
            >
              <Shuffle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tracks List */}
        {playlist.tracks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-tavilo-card border border-tavilo-border space-y-3">
            <Music className="w-10 h-10 text-tavilo-text-muted mx-auto opacity-30" />
            <h3 className="text-base font-bold text-white">This playlist is empty</h3>
            <p className="text-xs text-tavilo-text-secondary max-w-sm mx-auto">
              Find tracks you like and click the three dots menu to add them to this playlist.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-tavilo-green text-black text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Explore Songs</span>
            </Link>
          </div>
        ) : (
          <div className="bg-tavilo-card/50 border border-tavilo-border rounded-2xl p-2 sm:p-4 space-y-1">
            {playlist.tracks.map((track, idx) => (
              <TrackRow
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                playlistContext={playlist.tracks}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
