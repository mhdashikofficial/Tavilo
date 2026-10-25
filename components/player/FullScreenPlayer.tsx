'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ThumbsDown,
  Volume2,
  VolumeX,
  ListMusic,
  Share2,
  Sliders,
  Check,
} from 'lucide-react';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { useLibrary } from '@/lib/library/LibraryContext';
import { formatTime, cn } from '@/lib/utils';

interface FullScreenPlayerProps {
  onOpenTuneMix?: () => void;
}

export function FullScreenPlayer({ onOpenTuneMix }: FullScreenPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    isFullScreenOpen,
    togglePlay,
    seek,
    next,
    previous,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setFullScreenOpen,
    setQueueOpen,
    isQueueOpen,
  } = usePlayback();

  const { isLiked, toggleLike, dislikeTrack } = useLibrary();
  const [copiedShare, setCopiedShare] = useState(false);

  if (!isFullScreenOpen || !currentTrack) return null;

  const liked = isLiked(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleShare = async () => {
    const shareData = {
      title: `${currentTrack.title} — Tavilo`,
      text: `Listen to "${currentTrack.title}" by ${currentTrack.artist} on Tavilo. Your sound. Your world.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${currentTrack.title} by ${currentTrack.artist} - ${window.location.origin}`);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#101420] via-tavilo-bg to-[#07080a] flex flex-col justify-between overflow-y-auto px-5 py-6 sm:px-10 sm:py-8 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between w-full max-w-2xl mx-auto pt-safe">
        <button
          onClick={() => setFullScreenOpen(false)}
          aria-label="Collapse player"
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-tavilo-text-secondary hover:text-white transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-tavilo-green">
            Playing from {currentTrack.providerName}
          </p>
          <p className="text-xs text-tavilo-text-secondary truncate max-w-[200px]">
            {currentTrack.album}
          </p>
        </div>

        <button
          onClick={() => {
            setFullScreenOpen(false);
            setQueueOpen(true);
          }}
          aria-label="View Queue"
          className={cn(
            'p-2.5 rounded-full transition-colors',
            isQueueOpen
              ? 'bg-tavilo-green text-black'
              : 'bg-white/5 hover:bg-white/10 text-tavilo-text-secondary hover:text-white'
          )}
        >
          <ListMusic className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content: Large Artwork & Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8 max-w-md mx-auto w-full">
        {/* Glow & Artwork Frame */}
        <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[380px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
          {/* Subtle Ambient Behind Glow */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-tavilo-green/20 to-tavilo-violet/20 blur-2xl -z-10" />

          <Image
            src={currentTrack.artwork}
            alt={currentTrack.title}
            fill
            sizes="380px"
            className="object-cover"
            priority
            unoptimized
          />

          {/* Equalizer animation badge */}
          {isPlaying && (
            <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-tavilo-green/30 flex items-center space-x-1.5">
              <span className="w-1 bg-tavilo-green h-3 animate-wave rounded-full" />
              <span className="w-1 bg-tavilo-green h-5 animate-wave delay-100 rounded-full" />
              <span className="w-1 bg-tavilo-green h-2 animate-wave delay-200 rounded-full" />
              <span className="text-[11px] font-mono text-tavilo-green ml-1 font-semibold">TAVILO HIGH-FI</span>
            </div>
          )}
        </div>

        {/* Title, Artist, & Actions */}
        <div className="w-full mt-6 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              {currentTrack.title}
            </h1>
            <p className="text-sm sm:text-base text-tavilo-text-secondary truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleLike(currentTrack)}
              aria-label={liked ? 'Unlike' : 'Like'}
              className={cn(
                'p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors',
                liked ? 'text-tavilo-green' : 'text-tavilo-text-muted hover:text-white'
              )}
            >
              <Heart className={cn('w-6 h-6', liked && 'fill-tavilo-green')} />
            </button>

            <button
              onClick={() => dislikeTrack(currentTrack)}
              aria-label="Dislike"
              title="Less like this"
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-tavilo-text-muted hover:text-red-400 transition-colors"
            >
              <ThumbsDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="w-full max-w-2xl mx-auto pb-safe flex flex-col space-y-4">
        {/* Scrubber / Progress Bar */}
        <div>
          <div className="relative flex items-center w-full">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-tavilo-green hover:h-2 transition-all"
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-tavilo-text-muted mt-1.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Playback Buttons */}
        <div className="flex items-center justify-between py-2">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            aria-label="Toggle shuffle"
            className={cn(
              'p-2.5 rounded-full transition-colors',
              shuffle ? 'text-tavilo-green' : 'text-tavilo-text-muted hover:text-white'
            )}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Previous */}
          <button
            onClick={previous}
            aria-label="Previous track"
            className="p-3 rounded-full text-white hover:text-tavilo-green transition-colors"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Play / Pause (Hero Glowing Button) */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-16 h-16 rounded-full bg-tavilo-green text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-tavilo-green/30"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={next}
            aria-label="Next track"
            className="p-3 rounded-full text-white hover:text-tavilo-green transition-colors"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            aria-label={`Repeat mode: ${repeat}`}
            className={cn(
              'p-2.5 rounded-full transition-colors',
              repeat !== 'off' ? 'text-tavilo-green' : 'text-tavilo-text-muted hover:text-white'
            )}
          >
            {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>
        </div>

        {/* Volume & Utility Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          {/* Volume Control */}
          <div className="flex items-center space-x-2.5 flex-1 max-w-[180px]">
            <button
              onClick={toggleMute}
              aria-label="Mute / Unmute"
              className="text-tavilo-text-muted hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-tavilo-green"
            />
          </div>

          {/* Actions: Tune My Mix & Share */}
          <div className="flex items-center space-x-3">
            {onOpenTuneMix && (
              <button
                onClick={onOpenTuneMix}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-tavilo-violet/20 border border-tavilo-violet/40 text-tavilo-violet text-xs font-semibold hover:bg-tavilo-violet/30 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Tune Mix</span>
              </button>
            )}

            <button
              onClick={handleShare}
              aria-label="Share track"
              className="p-2 rounded-full text-tavilo-text-muted hover:text-white transition-colors"
            >
              {copiedShare ? (
                <Check className="w-4 h-4 text-tavilo-green" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
