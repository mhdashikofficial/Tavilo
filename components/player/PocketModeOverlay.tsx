'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Moon,
  Sun,
  Lock,
  Unlock,
  Volume2,
  Sparkles,
  ShieldCheck,
  Music2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
} from 'lucide-react';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { formatTime } from '@/lib/utils';

export function PocketModeOverlay() {
  const {
    isPocketMode,
    setPocketMode,
    currentTrack,
    isPlaying,
    togglePlay,
    next,
    previous,
    currentTime,
    duration,
  } = usePlayback();

  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [hintVisible, setHintVisible] = useState<boolean>(false);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update clock every second
  useEffect(() => {
    if (!isPocketMode) return;

    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      setDateStr(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [isPocketMode]);

  if (!isPocketMode) return null;

  // Double-tap anywhere to unlock
  const handleContainerClick = () => {
    const now = Date.now();
    if (now - lastTapTime < 400) {
      // Double tap detected!
      setPocketMode(false);
    } else {
      setLastTapTime(now);
      setHintVisible(true);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => {
        setHintVisible(false);
      }, 2500);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onClick={handleContainerClick}
      className="fixed inset-0 z-[999] bg-[#000000] text-neutral-400 flex flex-col justify-between p-6 sm:p-10 select-none cursor-pointer overflow-hidden transition-opacity duration-300 animate-in fade-in"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Top Header: Clock & OLED Battery Saver Indicator */}
      <div className="flex items-center justify-between w-full max-w-md mx-auto pt-safe opacity-40 hover:opacity-80 transition-opacity">
        <div className="flex items-center space-x-2 text-xs text-neutral-400">
          <Moon className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-neutral-300">OLED Pocket Mode</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>0% Display Battery</span>
        </div>
      </div>

      {/* Center: Minimalist Ultra-Dim Clock & Now Playing Info */}
      <div className="flex flex-col items-center justify-center my-auto space-y-4 text-center max-w-sm mx-auto">
        <div className="opacity-60 space-y-1">
          <h1 className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-neutral-200">
            {timeStr || '12:00'}
          </h1>
          <p className="text-xs uppercase tracking-widest text-neutral-400 font-medium">
            {dateStr}
          </p>
        </div>

        {/* Current Song Details */}
        {currentTrack && (
          <div className="mt-4 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-900 w-full space-y-3 opacity-75 hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center border border-neutral-800 flex-shrink-0">
                <Music2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-200 truncate">
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-1 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500/80 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Quick Touch Controls (Pocket Safe) */}
            <div
              className="flex items-center justify-center space-x-6 pt-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={previous}
                className="p-2 rounded-full text-neutral-400 hover:text-white transition-colors"
                aria-label="Previous track"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-transform active:scale-95 border border-neutral-700"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={next}
                className="p-2 rounded-full text-neutral-400 hover:text-white transition-colors"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Double-tap feedback hint */}
        <div
          className={`text-xs text-emerald-400/90 font-medium transition-all duration-300 ${
            hintVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          Tap once more to exit Pocket Mode
        </div>
      </div>

      {/* Bottom Bar: Slide or Hold to Unlock */}
      <div className="w-full max-w-md mx-auto pb-safe flex flex-col items-center space-y-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPocketMode(false);
          }}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-all shadow-lg active:scale-95"
        >
          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exit Pocket Mode</span>
        </button>

        <p className="text-[10px] text-neutral-400 text-center">
          Double-tap anywhere or tap button above to wake • Touch gestures protected in pocket
        </p>
      </div>
    </div>
  );
}
