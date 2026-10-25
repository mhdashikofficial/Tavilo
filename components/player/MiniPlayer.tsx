'use client';

import React from 'react';
import Image from 'next/image';
import { Play, Pause, SkipForward, Heart, Maximize2, Volume2, ListMusic } from 'lucide-react';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { useLibrary } from '@/lib/library/LibraryContext';
import { cn } from '@/lib/utils';

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    next,
    setFullScreenOpen,
    setQueueOpen,
    isQueueOpen,
  } = usePlayback();
  const { isLiked, toggleLike } = useLibrary();

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[58px] sm:bottom-0 left-0 right-0 z-40 px-2 sm:px-4 pb-1 sm:pb-2 transition-all duration-300">
      <div
        onClick={() => setFullScreenOpen(true)}
        className="relative mx-auto max-w-7xl h-16 sm:h-20 bg-tavilo-card/95 backdrop-blur-xl border border-tavilo-border rounded-2xl sm:rounded-2xl shadow-2xl flex items-center justify-between px-3 sm:px-5 cursor-pointer overflow-hidden group hover:border-tavilo-green/30"
      >
        {/* Subtle glowing animated top progress bar */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-tavilo-green to-tavilo-violet transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Left: Artwork & Track Details */}
        <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
          <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden bg-tavilo-surface flex-shrink-0 shadow-md border border-white/5">
            <Image
              src={currentTrack.artwork}
              alt={currentTrack.title}
              fill
              sizes="52px"
              className="object-cover"
              unoptimized
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-tavilo-green animate-pulse" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm sm:text-base text-tavilo-text-primary truncate group-hover:text-tavilo-green transition-colors">
              {currentTrack.title}
            </p>
            <p className="text-xs text-tavilo-text-secondary truncate">
              {currentTrack.artist}
            </p>
          </div>

          {/* Like Button on Desktop/Tablet */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(currentTrack);
            }}
            aria-label={liked ? 'Unlike' : 'Like'}
            className={cn(
              'hidden sm:flex p-2 rounded-full transition-colors',
              liked ? 'text-tavilo-green' : 'text-tavilo-text-muted hover:text-white'
            )}
          >
            <Heart className={cn('w-5 h-5', liked && 'fill-tavilo-green')} />
          </button>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {/* Like on Mobile */}
          <button
            onClick={() => toggleLike(currentTrack)}
            aria-label={liked ? 'Unlike' : 'Like'}
            className={cn(
              'sm:hidden p-2 rounded-full transition-colors',
              liked ? 'text-tavilo-green' : 'text-tavilo-text-muted hover:text-white'
            )}
          >
            <Heart className={cn('w-5 h-5', liked && 'fill-tavilo-green')} />
          </button>

          {/* Queue Button (Desktop) */}
          <button
            onClick={() => setQueueOpen(!isQueueOpen)}
            aria-label="Queue"
            className="hidden md:flex p-2 rounded-full text-tavilo-text-muted hover:text-white hover:bg-tavilo-surface transition-colors"
          >
            <ListMusic className="w-5 h-5" />
          </button>

          {/* Play / Pause Button */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-tavilo-green text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-tavilo-green/20"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={next}
            aria-label="Next track"
            className="p-2 rounded-full text-tavilo-text-muted hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          {/* Expand Fullscreen */}
          <button
            onClick={() => setFullScreenOpen(true)}
            aria-label="Full screen player"
            className="hidden sm:flex p-2 rounded-full text-tavilo-text-muted hover:text-white hover:bg-tavilo-surface transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
