'use client';

import React from 'react';
import Image from 'next/image';
import { X, Trash2, Sparkles, Play, Music2 } from 'lucide-react';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { useLibrary } from '@/lib/library/LibraryContext';
import { formatTime } from '@/lib/utils';

export function QueueModal() {
  const {
    currentTrack,
    queue,
    isQueueOpen,
    setQueueOpen,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = usePlayback();
  const { preferences } = useLibrary();

  if (!isQueueOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-tavilo-card border-l border-tavilo-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-tavilo-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white">Play Queue</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-tavilo-surface text-tavilo-text-secondary border border-tavilo-border">
              {queue.length + (currentTrack ? 1 : 0)} tracks
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                title="Clear upcoming"
                className="p-2 rounded-full text-tavilo-text-muted hover:text-red-400 hover:bg-tavilo-surface transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setQueueOpen(false)}
              aria-label="Close queue"
              className="p-2 rounded-full text-tavilo-text-muted hover:text-white hover:bg-tavilo-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Now Playing */}
          {currentTrack && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-tavilo-green mb-2.5">
                Now Playing
              </p>
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-tavilo-surface border border-tavilo-green/30">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                  <Image
                    src={currentTrack.artwork}
                    alt={currentTrack.title}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-tavilo-green truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-tavilo-text-secondary truncate">
                    {currentTrack.artist}
                  </p>
                </div>
                <span className="text-xs font-mono text-tavilo-text-muted">
                  {formatTime(currentTrack.duration)}
                </span>
              </div>
            </div>
          )}

          {/* Next In Queue */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-tavilo-text-muted">
                Next Up
              </p>
              {preferences.autoplayEnabled && (
                <div className="flex items-center space-x-1 text-[11px] text-tavilo-violet">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Taste Autoplay Active</span>
                </div>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-tavilo-surface/50 border border-dashed border-tavilo-border">
                <Music2 className="w-8 h-8 text-tavilo-text-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm text-tavilo-text-secondary font-medium">
                  Your queue is empty
                </p>
                <p className="text-xs text-tavilo-text-muted mt-1">
                  {preferences.autoplayEnabled
                    ? 'Tavilo will automatically play personalized recommendations when this song finishes.'
                    : 'Turn on Autoplay in Tune My Mix or add songs from your library.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {queue.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-tavilo-surface transition-colors"
                  >
                    <div
                      onClick={() => {
                        const newQueue = queue.slice(idx + 1);
                        playTrack(track, newQueue);
                      }}
                      className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                        <Image
                          src={track.artwork}
                          alt={track.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm text-tavilo-text-primary group-hover:text-tavilo-green truncate transition-colors">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-tavilo-text-secondary truncate">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-tavilo-text-muted">
                        {formatTime(track.duration)}
                      </span>
                      <button
                        onClick={() => removeFromQueue(idx)}
                        title="Remove from queue"
                        className="p-1 rounded-full text-tavilo-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
