'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search as SearchIcon, X, Clock, Play, AlertCircle, RefreshCw, Sparkles, User, Disc } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { TrackRow } from '@/components/music/TrackRow';
import { MoodCard } from '@/components/music/MoodCard';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { SearchResult, Track } from '@/types/music';
import { MOOD_CATEGORIES } from '@/lib/music/seed';

const RECENT_SEARCHES_KEY = 'tavilo_recent_searches_v1';

export default function SearchPage() {
  const { playTrack } = usePlayback();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      } else {
        setRecentSearches(['Chill', 'Electronic', 'Acoustic', 'Night Drive']);
      }
    } catch {}
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Execute search
  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=24`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isCancelled) return;
        if (data.success) {
          setResults({
            tracks: data.tracks || [],
            artists: data.artists || [],
            albums: data.albums || [],
            playlists: data.playlists || [],
          });

          // Save to recent searches
          setRecentSearches((prev) => {
            const updated = [debouncedQuery, ...prev.filter((q) => q.toLowerCase() !== debouncedQuery.toLowerCase())].slice(0, 8);
            try {
              localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        } else {
          setError(data.error || 'Failed to search catalog');
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Search error:', err);
          setError('Could not connect to music providers. Please try again.');
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  };

  const handleSelectRecent = (q: string) => {
    setQuery(q);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const topTrack = results?.tracks[0];

  return (
    <div className="min-h-full">
      <TopBar title="Search & Explore" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Search Input Bar */}
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-tavilo-text-muted">
            <SearchIcon className="w-5 h-5 text-tavilo-green" />
          </div>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks, artists, moods, or genres..."
            className="w-full pl-12 pr-12 py-3.5 bg-tavilo-card border border-tavilo-border rounded-2xl text-white placeholder-tavilo-text-muted focus:outline-none focus:border-tavilo-green focus:ring-1 focus:ring-tavilo-green transition-all shadow-lg text-sm sm:text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-tavilo-text-muted hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center space-x-2 text-xs text-tavilo-green">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Searching open catalogs & streaming networks...</span>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-tavilo-card animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-6 rounded-2xl bg-red-950/30 border border-red-800/40 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm font-semibold text-white">{error}</p>
            <button
              onClick={() => setDebouncedQuery(query)}
              className="px-4 py-2 rounded-xl bg-tavilo-surface border border-tavilo-border text-xs text-tavilo-green hover:bg-tavilo-card transition-colors inline-flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Search</span>
            </button>
          </div>
        )}

        {/* Search Results Display */}
        {results && !isLoading && !error && (
          <div className="space-y-8 animate-in fade-in">
            {results.tracks.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-tavilo-card border border-tavilo-border">
                <SearchIcon className="w-10 h-10 text-tavilo-text-muted mx-auto mb-3 opacity-40" />
                <h3 className="text-base font-bold text-white">No tracks found for "{debouncedQuery}"</h3>
                <p className="text-xs text-tavilo-text-secondary mt-1 max-w-sm mx-auto">
                  Try searching for a different genre like "Electronic", "Ambient", "Acoustic", or browse the mood categories below.
                </p>
              </div>
            ) : (
              <>
                {/* Top Result + Songs Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Top Match Card */}
                  {topTrack && (
                    <div className="lg:col-span-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-tavilo-green mb-3">
                        Top Result
                      </p>
                      <div
                        onClick={() => playTrack(topTrack, undefined, { isSearchPlay: true })}
                        className="group relative p-6 rounded-2xl bg-gradient-to-br from-tavilo-card to-[#181d28] border border-tavilo-border/80 hover:border-tavilo-green/40 transition-all cursor-pointer shadow-xl"
                      >
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden mb-4 bg-black/40 shadow-lg">
                          <Image
                            src={topTrack.artwork}
                            alt={topTrack.title}
                            fill
                            sizes="96px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            unoptimized
                          />
                        </div>
                        <h3 className="text-xl font-extrabold text-white group-hover:text-tavilo-green transition-colors line-clamp-1">
                          {topTrack.title}
                        </h3>
                        <p className="text-sm text-tavilo-text-secondary mt-1">
                          {topTrack.artist} • <span className="text-xs text-tavilo-green uppercase font-semibold">{topTrack.genre}</span>
                        </p>

                        <button
                          aria-label="Play Top Result"
                          className="mt-5 w-12 h-12 rounded-full bg-tavilo-green text-black flex items-center justify-center shadow-lg shadow-tavilo-green/20 group-hover:scale-105 transition-transform"
                        >
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Songs List */}
                  <div className="lg:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-tavilo-green mb-3">
                      Songs ({results.tracks.length})
                    </p>
                    <div className="bg-tavilo-card/50 border border-tavilo-border rounded-2xl p-2 space-y-1">
                      {results.tracks.slice(0, 8).map((track, idx) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          index={idx}
                          isSearchResult={true}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Artists Results */}
                {results.artists.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <User className="w-4 h-4 text-tavilo-violet" />
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                        Artists
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {results.artists.map((artist) => (
                        <div
                          key={artist.id}
                          onClick={() => {
                            if (artist.topTracks && artist.topTracks.length > 0) {
                              playTrack(artist.topTracks[0], undefined, { isSearchPlay: true });
                            }
                          }}
                          className="group p-3 rounded-2xl bg-tavilo-card/60 hover:bg-tavilo-card border border-tavilo-border/60 hover:border-tavilo-violet/40 transition-all text-center cursor-pointer shadow-md"
                        >
                          <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden mb-3 bg-black/40 shadow-md">
                            <Image
                              src={artist.image}
                              alt={artist.name}
                              fill
                              sizes="80px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              unoptimized
                            />
                          </div>
                          <p className="font-bold text-xs sm:text-sm text-white group-hover:text-tavilo-violet truncate transition-colors">
                            {artist.name}
                          </p>
                          <p className="text-[10px] text-tavilo-text-muted uppercase mt-0.5">
                            Artist
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Albums Results */}
                {results.albums.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Disc className="w-4 h-4 text-tavilo-green" />
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                        Albums
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {results.albums.map((album) => (
                        <div
                          key={album.id}
                          className="group p-3 rounded-2xl bg-tavilo-card/60 hover:bg-tavilo-card border border-tavilo-border/60 hover:border-tavilo-green/40 transition-all cursor-pointer shadow-md"
                        >
                          <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 bg-black/40">
                            <Image
                              src={album.artwork}
                              alt={album.title}
                              fill
                              sizes="120px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              unoptimized
                            />
                          </div>
                          <p className="font-semibold text-xs sm:text-sm text-white group-hover:text-tavilo-green truncate transition-colors">
                            {album.title}
                          </p>
                          <p className="text-[11px] text-tavilo-text-secondary truncate mt-0.5">
                            {album.artist}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty Search / Discovery View */}
        {!query && (
          <div className="space-y-8 animate-in fade-in">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-tavilo-text-muted">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Recent Searches</span>
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-tavilo-text-muted hover:text-white transition-colors"
                  >
                    Clear History
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectRecent(item)}
                      className="px-3.5 py-1.5 rounded-full bg-tavilo-card hover:bg-tavilo-surface border border-tavilo-border text-xs text-tavilo-text-secondary hover:text-white transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Browse Categories */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-4 h-4 text-tavilo-green" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Browse All Categories
                </h2>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
