'use client';

import React from 'react';
import Image from 'next/image';
import { Play, Pause, Heart } from 'lucide-react';
import { Track } from '@/types/music';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { useLibrary } from '@/lib/library/LibraryContext';
import { cn } from '@/lib/utils';

interface TrackCardProps {
  track: Track;
  queueContext?: Track[];
}

export function TrackCard({ track, queueContext }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayback();
  const { isLiked, toggleLike } = useLibrary();

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queueContext);
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className="group relative flex flex-col p-3 rounded-2xl bg-tavilo-card/60 hover:bg-tavilo-cardHover border border-tavilo-border/60 hover:border-tavilo-green/40 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-tavilo-green/5"
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-tavilo-surface mb-3 shadow-md">
        <Image
          src={track.artwork}
          alt={track.title}
          fill
          sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 240px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />

        {/* Subtle Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Floating Play Button */}
        <button
          onClick={handlePlayClick}
          aria-label={isCurrentPlaying ? 'Pause' : 'Play'}
          className={cn(
            'absolute bottom-3 right-3 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl',
            isCurrentPlaying
              ? 'bg-tavilo-green text-black scale-100 opacity-100'
              : 'bg-tavilo-green text-black opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 hover:bg-[#00c985]'
          )}
        >
          {isCurrentPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Like Button on Artwork */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(track);
          }}
          aria-label={liked ? 'Unlike' : 'Like'}
          className={cn(
            'absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/40 backdrop-blur-md transition-all duration-200',
            liked ? 'text-tavilo-green opacity-100' : 'text-white/70 opacity-0 group-hover:opacity-100 hover:text-white'
          )}
        >
          <Heart className={cn('w-4 h-4', liked && 'fill-tavilo-green')} />
        </button>

        {/* Genre / Mood Badge */}
        {track.genre && (
          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-tavilo-green border border-tavilo-green/20">
            {track.genre}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 justify-between">
        <div>
          <h3
            className={cn(
              'font-semibold text-sm line-clamp-1 transition-colors',
              isCurrent ? 'text-tavilo-green' : 'text-tavilo-text-primary group-hover:text-tavilo-green'
            )}
          >
            {track.title}
          </h3>
          <p className="text-xs text-tavilo-text-secondary line-clamp-1 mt-0.5">
            {track.artist}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-tavilo-border/40 text-[11px] text-tavilo-text-muted">
          <span>{track.providerName.split(' ')[0]}</span>
          {track.moods && track.moods[0] && (
            <span className="text-tavilo-violet">{track.moods[0]}</span>
          )}
        </div>
      </div>
    </div>
  );
}
