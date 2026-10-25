'use client';

import React from 'react';
import { X, Sparkles, Compass, Flame, Sliders, RefreshCw, Trash2, ShieldCheck, Check } from 'lucide-react';
import { useLibrary } from '@/lib/library/LibraryContext';
import { TuneMixMode } from '@/types/music';
import { cn } from '@/lib/utils';

interface TuneMixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TuneMixModal({ isOpen, onClose }: TuneMixModalProps) {
  const {
    preferences,
    setTuneMixMode,
    setAutoplayEnabled,
    clearHistory,
    resetRecommendations,
  } = useLibrary();

  if (!isOpen) return null;

  const modes: { id: TuneMixMode; title: string; desc: string; icon: React.ElementType }[] = [
    {
      id: 'familiar',
      title: 'Familiar Favorites',
      desc: 'Focus heavily on your liked songs, repeat artists, and established comfort genres.',
      icon: Flame,
    },
    {
      id: 'balanced',
      title: 'Balanced Flow',
      desc: 'The sweet spot: 50% songs you already enjoy, smoothly interwoven with tasteful new finds.',
      icon: Sliders,
    },
    {
      id: 'discovery',
      title: 'New Discoveries',
      desc: 'Adventure forward: actively prioritize unplayed tracks and fresh indie/open artists.',
      icon: Compass,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-tavilo-card border border-tavilo-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-tavilo-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-tavilo-violet/20 text-tavilo-violet">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tune My Mix</h2>
              <p className="text-xs text-tavilo-text-secondary">
                Personalize how Tavilo curates your next tracks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full text-tavilo-text-muted hover:text-white hover:bg-tavilo-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Autoplay Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-tavilo-surface border border-tavilo-border">
            <div>
              <p className="font-semibold text-sm text-white">
                Taste-Based Autoplay
              </p>
              <p className="text-xs text-tavilo-text-muted mt-0.5">
                Automatically keep playing music matching your preferences when your queue ends.
              </p>
            </div>
            <button
              onClick={() => setAutoplayEnabled(!preferences.autoplayEnabled)}
              aria-label="Toggle Autoplay"
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                preferences.autoplayEnabled ? 'bg-tavilo-green' : 'bg-tavilo-border'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full bg-black shadow-md transform transition-transform',
                  preferences.autoplayEnabled ? 'translate-x-6' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Mix Style Options */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-tavilo-green mb-3">
              Mix Calibration
            </p>
            <div className="space-y-2.5">
              {modes.map((m) => {
                const Icon = m.icon;
                const isSelected = preferences.tuneMixMode === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setTuneMixMode(m.id)}
                    className={cn(
                      'flex items-start space-x-3.5 p-3.5 rounded-xl border cursor-pointer transition-all',
                      isSelected
                        ? 'bg-tavilo-surface border-tavilo-green/50 shadow-md shadow-tavilo-green/5'
                        : 'bg-tavilo-surface/40 border-tavilo-border/60 hover:border-tavilo-border'
                    )}
                  >
                    <div
                      className={cn(
                        'p-2 rounded-lg mt-0.5',
                        isSelected ? 'bg-tavilo-green text-black' : 'bg-black/30 text-tavilo-text-muted'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-sm font-semibold', isSelected ? 'text-tavilo-green' : 'text-white')}>
                          {m.title}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-tavilo-green" />}
                      </div>
                      <p className="text-xs text-tavilo-text-secondary mt-1">
                        {m.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Preference Signals */}
          <div className="p-4 rounded-xl bg-tavilo-surface/50 border border-tavilo-border space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-tavilo-green" />
              <span>Learned Signals</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-tavilo-text-muted block text-[11px]">Liked Tracks</span>
                <span className="font-semibold text-white">{preferences.likedTrackIds.length} tracks</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-tavilo-text-muted block text-[11px]">Listening History</span>
                <span className="font-semibold text-white">{preferences.recentlyPlayed.length} sessions</span>
              </div>
            </div>
          </div>

          {/* Reset & Privacy Actions */}
          <div className="pt-2 border-t border-tavilo-border/60 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                if (confirm('Clear your listening history?')) {
                  clearHistory();
                }
              }}
              className="flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-tavilo-surface hover:bg-tavilo-surface/80 border border-tavilo-border text-xs text-tavilo-text-secondary hover:text-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Reset your personalized recommendation profile?')) {
                  resetRecommendations();
                }
              }}
              className="flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-tavilo-surface hover:bg-tavilo-surface/80 border border-tavilo-border text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Profile</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-tavilo-surface/70 border-t border-tavilo-border text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-tavilo-green text-black font-semibold text-xs hover:bg-[#00c985] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
