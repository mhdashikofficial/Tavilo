'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Pause, Heart, MoreHorizontal, Plus, ListPlus, Ban, Volume2 } from 'lucide-react';
import { Track } from '@/types/music';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { useLibrary } from '@/lib/library/LibraryContext';
import { formatTime, cn } from '@/lib/utils';

interface TrackRowProps {
  track: Track;
  index?: number;
  playlistContext?: Track[];
  isSearchResult?: boolean;
}

export function TrackRow({ track, index, playlistContext, isSearchResult }: TrackRowProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue, playNext } = usePlayback();
  const { isLiked, toggleLike, excludeTrack, excludeArtist } = useLibrary();
  const [showMenu, setShowMenu] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      if (isSearchResult) {
        playTrack(track, undefined, { isSearchPlay: true });
      } else {
        playTrack(track, playlistContext);
      }
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className={cn(
        'group relative flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-all duration-200 cursor-pointer',
        isCurrent
          ? 'bg-tavilo-surface/90 border border-tavilo-green/30 shadow-md shadow-tavilo-green/5'
          : 'hover:bg-tavilo-card/70 border border-transparent'
      )}
    >
      {/* Left: Index / Play Icon & Track Details */}
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
        {/* Index or Equalizer animation */}
        <div className="w-6 text-center text-xs font-semibold text-tavilo-text-muted flex-shrink-0">
          {isCurrentPlaying ? (
            <div className="flex items-end justify-center space-x-0.5 h-4">
              <span className="w-1 bg-tavilo-green h-4 animate-wave rounded-full" />
              <span className="w-1 bg-tavilo-green h-2 animate-wave delay-100 rounded-full" />
              <span className="w-1 bg-tavilo-green h-3 animate-wave delay-200 rounded-full" />
            </div>
          ) : (
            <span className="group-hover:hidden">{index !== undefined ? index + 1 : ''}</span>
          )}
          <button
            aria-label={isCurrentPlaying ? 'Pause' : 'Play'}
            className={cn(
              'hidden group-hover:flex items-center justify-center text-tavilo-green',
              isCurrentPlaying && 'group-hover:hidden'
            )}
          >
            {isCurrentPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
        </div>

        {/* Artwork */}
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-tavilo-card flex-shrink-0 shadow-sm">
          <Image
            src={track.artwork}
            alt={track.title}
            fill
            sizes="48px"
            className="object-cover"
            unoptimized
          />
          {isCurrent && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-tavilo-green" />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="min-w-0 flex-1 pr-2">
          <p
            className={cn(
              'font-semibold text-sm sm:text-base truncate transition-colors',
              isCurrent ? 'text-tavilo-green' : 'text-tavilo-text-primary group-hover:text-tavilo-green'
            )}
          >
            {track.title}
          </p>
          <div className="flex items-center space-x-2 text-xs text-tavilo-text-secondary truncate">
            <span className="hover:underline">{track.artist}</span>
            {track.genre && (
              <>
                <span>•</span>
                <span className="text-tavilo-text-muted">{track.genre}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center: Album (Tablet & Desktop) */}
      <div className="hidden md:block flex-1 max-w-[200px] text-xs text-tavilo-text-secondary truncate pr-4">
        {track.album}
      </div>

      {/* Right: Actions & Duration */}
      <div className="flex items-center space-x-2 sm:space-x-3 text-tavilo-text-secondary flex-shrink-0" onClick={e => e.stopPropagation()}>
        {/* Like Button */}
        <button
          onClick={() => toggleLike(track)}
          aria-label={liked ? 'Unlike' : 'Like'}
          className={cn(
            'p-2 rounded-full transition-colors hover:text-white',
            liked ? 'text-tavilo-green' : 'text-tavilo-text-muted hover:text-white'
          )}
        >
          <Heart className={cn('w-4 h-4 sm:w-5 sm:h-5', liked && 'fill-tavilo-green')} />
        </button>

        {/* Duration */}
        <span className="text-xs font-mono text-tavilo-text-muted hidden sm:inline-block w-10 text-right">
          {formatTime(track.duration)}
        </span>

        {/* Context Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Track options"
            className="p-2 rounded-full text-tavilo-text-muted hover:text-white hover:bg-tavilo-surface transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 bg-tavilo-card border border-tavilo-border rounded-xl shadow-xl z-50 py-1.5 text-xs text-tavilo-text-primary">
                <button
                  onClick={() => {
                    addToQueue(track);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-tavilo-surface transition-colors"
                >
                  <ListPlus className="w-4 h-4 text-tavilo-green" />
                  <span>Add to Queue</span>
                </button>
                <button
                  onClick={() => {
                    playNext(track);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-tavilo-surface transition-colors"
                >
                  <Plus className="w-4 h-4 text-tavilo-violet" />
                  <span>Play Next</span>
                </button>
                <div className="h-px bg-tavilo-border my-1" />
                <button
                  onClick={() => {
                    excludeTrack(track.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-tavilo-surface text-red-400 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  <span>Don't recommend this track</span>
                </button>
                <button
                  onClick={() => {
                    excludeArtist(track.artist);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-2 hover:bg-tavilo-surface text-red-400 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  <span>Don't recommend this artist</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
