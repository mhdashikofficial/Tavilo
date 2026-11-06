'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Shuffle, Music, ArrowLeft, Plus, RefreshCw, Heart, Search, X } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { TrackRow } from '@/components/music/TrackRow';
import { useLibrary } from '@/lib/library/LibraryContext';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { CURATED_PLAYLISTS } from '@/lib/music/seed';
import { Track, Playlist } from '@/types/music';

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params.id as string;
  const isLikedPlaylist = playlistId === 'liked';

  const { playlists, likedTracks } = useLibrary();
  const { playTrack } = usePlayback();

  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    // 0. Liked Songs Auto Collection
    if (isLikedPlaylist) {
      const likedPlaylist: Playlist = {
        id: 'liked',
        title: 'Liked Songs',
        description: 'Your favorite tracks saved across Tavilo. Official studio masters & authentic copies.',
        artwork:
          likedTracks[0]?.artwork ||
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        tracks: likedTracks,
        trackCount: likedTracks.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setActivePlaylist(likedPlaylist);
      setPlaylistTracks(likedTracks);
      return;
    }

    // 1. Check user custom playlists
    const custom = playlists.find((p) => p.id === playlistId);
    if (custom) {
      setActivePlaylist(custom);
      setPlaylistTracks(custom.tracks);
      return;
    }

    // 2. Check curated playlists
    const curated = CURATED_PLAYLISTS.find((p) => p.id === playlistId);
    if (curated) {
      setActivePlaylist(curated);
      setPlaylistTracks(curated.tracks);

      // Load additional live YouTube tracks matching this curated collection theme
      setIsLoadingMore(true);
      const queryMap: Record<string, string> = {
        'playlist-malayalam-chartbusters': 'latest trending malayalam songs official video',
        'playlist-malayalam-melodies': 'malayalam melody hit songs official video',
        'playlist-global-top-hits': 'trending english songs billboard hot official video',
        'playlist-south-viral': 'trending south indian viral songs anirudh official video',
      };
      const q = queryMap[curated.id] || `${curated.title} songs official`;

      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=15`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.tracks && data.tracks.length > 0) {
            // Merge deduplicated
            const map = new Map<string, Track>();
            curated.tracks.forEach((t) => map.set(t.id, t));
            data.tracks.forEach((t: Track) => {
              if (!map.has(t.id)) map.set(t.id, t);
            });
            setPlaylistTracks(Array.from(map.values()));
          }
        })
        .catch((err) => console.warn('Could not expand curated playlist:', err))
        .finally(() => setIsLoadingMore(false));
    }
  }, [playlistId, playlists, likedTracks, isLikedPlaylist]);

  // Keep liked tracks list synchronized in real time if user unlikes/likes tracks while viewing
  useEffect(() => {
    if (isLikedPlaylist) {
      setPlaylistTracks(likedTracks);
      setActivePlaylist((prev) =>
        prev
          ? {
              ...prev,
              tracks: likedTracks,
              trackCount: likedTracks.length,
              artwork:
                likedTracks[0]?.artwork ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
            }
          : null
      );
    }
  }, [likedTracks, isLikedPlaylist]);

  const displayedTracks = useMemo(() => {
    if (!searchFilter.trim()) return playlistTracks;
    const q = searchFilter.toLowerCase().trim();
    return playlistTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album?.toLowerCase().includes(q)
    );
  }, [playlistTracks, searchFilter]);

  if (!activePlaylist) {
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

  const totalDuration = playlistTracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  const handlePlayAll = (shuffleMode: boolean = false) => {
    const list = displayedTracks.length > 0 ? displayedTracks : playlistTracks;
    if (list.length === 0) return;
    const tracksToPlay = shuffleMode ? [...list].sort(() => Math.random() - 0.5) : list;
    playTrack(tracksToPlay[0], tracksToPlay.slice(1));
  };

  return (
    <div className="min-h-full">
      <TopBar title={activePlaylist.title} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Playlist Hero Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-5 sm:space-y-0 sm:space-x-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#141824] to-tavilo-card border border-tavilo-border shadow-2xl">
          {isLikedPlaylist ? (
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-br from-tavilo-green via-emerald-700 to-emerald-950 flex items-center justify-center text-black flex-shrink-0 shadow-2xl shadow-tavilo-green/20 border border-tavilo-green/30">
              <Heart className="w-20 h-20 fill-current" />
            </div>
          ) : (
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl bg-black/50 flex-shrink-0 border border-white/10">
              <Image
                src={activePlaylist.artwork}
                alt={activePlaylist.title}
                fill
                sizes="(max-width: 640px) 160px, 192px"
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          )}

          <div className="flex-1 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-tavilo-green">
              {isLikedPlaylist
                ? 'Auto Collection'
                : activePlaylist.isCustom
                ? 'Custom Playlist'
                : 'Curated Collection'}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
              {activePlaylist.title}
            </h1>
            {activePlaylist.description && (
              <p className="text-xs sm:text-sm text-tavilo-text-secondary mt-2 max-w-xl">
                {activePlaylist.description}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-tavilo-text-muted mt-3">
              <span className="font-semibold text-white">{playlistTracks.length} songs</span>
              <span>•</span>
              <span>{Math.round(totalDuration / 60)} minutes</span>
              {isLikedPlaylist && (
                <>
                  <span>•</span>
                  <span className="text-tavilo-green font-semibold">Tavilo Favorites</span>
                </>
              )}
              {activePlaylist.isCustom && (
                <>
                  <span>•</span>
                  <span className="text-tavilo-violet font-semibold">Custom Collection</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {playlistTracks.length > 0 && (
              <>
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
              </>
            )}
            {isLoadingMore && (
              <div className="flex items-center space-x-1.5 text-xs text-tavilo-text-muted">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-tavilo-green" />
                <span>Syncing live catalog...</span>
              </div>
            )}
          </div>

          {/* Search/Filter within Playlist */}
          {playlistTracks.length > 3 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-tavilo-text-muted" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={isLikedPlaylist ? "Filter liked songs..." : "Filter tracks..."}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-tavilo-card/70 border border-tavilo-border text-xs text-white placeholder-tavilo-text-muted focus:outline-none focus:border-tavilo-green/60 transition-colors"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tavilo-text-muted hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tracks List */}
        <div className="bg-tavilo-card/40 border border-tavilo-border rounded-2xl p-2 sm:p-4 space-y-1">
          {displayedTracks.length === 0 ? (
            <div className="p-12 text-center text-tavilo-text-muted space-y-3">
              {isLikedPlaylist ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-tavilo-surface border border-tavilo-border flex items-center justify-center mx-auto text-tavilo-text-muted">
                    <Heart className="w-8 h-8 opacity-40 text-tavilo-green" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {searchFilter ? 'No matching liked songs found' : 'No liked songs yet'}
                  </h3>
                  <p className="text-xs text-tavilo-text-secondary max-w-sm mx-auto">
                    {searchFilter
                      ? 'Try a different search term.'
                      : 'Tap the heart icon on any track while listening or searching to add songs to your favorites.'}
                  </p>
                  {!searchFilter && (
                    <div className="pt-2">
                      <Link
                        href="/search"
                        className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-tavilo-green text-black text-xs font-bold hover:scale-105 transition-transform shadow-lg shadow-tavilo-green/20"
                      >
                        <span>Explore Music</span>
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Music className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-sm font-semibold text-white">
                    {searchFilter ? 'No matching tracks found' : 'This playlist has no songs yet'}
                  </p>
                  <p className="text-xs">
                    {searchFilter
                      ? 'Try a different search keyword.'
                      : 'Search for songs and add them using the track action menu.'}
                  </p>
                </>
              )}
            </div>
          ) : (
            displayedTracks.map((track, idx) => (
              <TrackRow
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                playlistContext={displayedTracks}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
