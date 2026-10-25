'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  User,
  Sliders,
  Sparkles,
  Heart,
  Clock,
  ListMusic,
  Download,
  Trash2,
  RefreshCw,
  Info,
  Shield,
  Smartphone,
} from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { useLibrary } from '@/lib/library/LibraryContext';
import { TuneMixModal } from '@/components/tune/TuneMixModal';

export default function ProfilePage() {
  const { preferences, playlists, likedTracks, clearHistory, resetRecommendations } = useLibrary();
  const [isTuneMixOpen, setTuneMixOpen] = useState(false);

  // Top genres from preferences weights
  const topGenres = Object.entries(preferences.genreWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([genre]) => genre.toUpperCase());

  return (
    <div className="min-h-full">
      <TopBar title="Profile & Preferences" />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* User Profile Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-tavilo-card to-[#151a24] border border-tavilo-border shadow-2xl flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-tavilo-green to-tavilo-violet p-1 flex-shrink-0 shadow-lg">
            <div className="w-full h-full rounded-full bg-tavilo-bg flex items-center justify-center">
              <User className="w-8 h-8 text-tavilo-green" />
            </div>
          </div>

          <div className="flex-1">
            <span className="text-xs uppercase font-bold tracking-wider text-tavilo-green">
              Active Session • Guest Profile
            </span>
            <h1 className="text-2xl font-black text-white mt-0.5">
              Tavilo Listener
            </h1>
            <p className="text-xs text-tavilo-text-secondary mt-1">
              Your preferences and library are safely stored locally on this device.
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5">
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <p className="text-lg font-bold text-white">{likedTracks.length}</p>
                <p className="text-[11px] text-tavilo-text-muted">Liked Songs</p>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <p className="text-lg font-bold text-white">{playlists.length}</p>
                <p className="text-[11px] text-tavilo-text-muted">Playlists</p>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <p className="text-lg font-bold text-white">{preferences.recentlyPlayed.length}</p>
                <p className="text-[11px] text-tavilo-text-muted">History</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tune My Mix Quick Settings */}
        <section className="p-6 rounded-2xl bg-tavilo-card border border-tavilo-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-tavilo-violet/20 text-tavilo-violet">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Tune My Mix</h2>
                <p className="text-xs text-tavilo-text-secondary">
                  Current Mode: <strong className="text-tavilo-green uppercase">{preferences.tuneMixMode}</strong> • Autoplay: <strong>{preferences.autoplayEnabled ? 'ON' : 'OFF'}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => setTuneMixOpen(true)}
              className="px-4 py-2 rounded-xl bg-tavilo-surface border border-tavilo-violet/40 text-tavilo-violet text-xs font-semibold hover:bg-tavilo-violet/20 transition-colors shadow-sm"
            >
              Configure
            </button>
          </div>

          {topGenres.length > 0 && (
            <div className="pt-2">
              <span className="text-xs text-tavilo-text-muted block mb-2">Favorite Genres:</span>
              <div className="flex flex-wrap gap-2">
                {topGenres.map((g, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full bg-tavilo-surface text-tavilo-green text-xs font-semibold border border-tavilo-green/20"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Data & History Controls */}
        <section className="p-6 rounded-2xl bg-tavilo-card border border-tavilo-border space-y-4">
          <h2 className="text-base font-bold text-white">Data & Privacy Management</h2>
          <p className="text-xs text-tavilo-text-secondary">
            You maintain full control over your listening history and recommendation models.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                if (confirm('Clear your listening history?')) {
                  clearHistory();
                }
              }}
              className="flex items-center space-x-2.5 p-3 rounded-xl bg-tavilo-surface hover:bg-tavilo-surface/80 border border-tavilo-border text-xs text-tavilo-text-secondary hover:text-white transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <div className="text-left">
                <span className="font-semibold block text-white">Clear Listening History</span>
                <span className="text-[11px] text-tavilo-text-muted">Resets your recently played sessions</span>
              </div>
            </button>

            <button
              onClick={() => {
                if (confirm('Reset your personalized recommendation profile?')) {
                  resetRecommendations();
                }
              }}
              className="flex items-center space-x-2.5 p-3 rounded-xl bg-tavilo-surface hover:bg-tavilo-surface/80 border border-tavilo-border text-xs text-tavilo-text-secondary hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-tavilo-violet" />
              <div className="text-left">
                <span className="font-semibold block text-white">Reset Taste Signals</span>
                <span className="text-[11px] text-tavilo-text-muted">Clears learned genre and artist weights</span>
              </div>
            </button>
          </div>
        </section>

        {/* App Info & Developer Credit */}
        <section className="p-6 rounded-2xl bg-tavilo-card border border-tavilo-border text-center space-y-3">
          <div className="relative w-12 h-12 mx-auto rounded-xl overflow-hidden shadow-md">
            <Image src="/favicon.svg" alt="Tavilo Logo" fill className="object-cover" />
          </div>
          <h3 className="font-extrabold text-lg text-white">TAVILO</h3>
          <p className="text-xs text-tavilo-green font-semibold tracking-wider uppercase">
            Your sound. Your world.
          </p>
          <p className="text-xs text-tavilo-text-secondary">
            Tavilo — Developed by Ash © 2026
          </p>
          <div className="pt-2">
            <Link
              href="/about"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-tavilo-surface text-xs text-tavilo-text-primary hover:text-tavilo-green border border-tavilo-border transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              <span>About & Licensing Details</span>
            </Link>
          </div>
        </section>
      </div>

      <TuneMixModal
        isOpen={isTuneMixOpen}
        onClose={() => setTuneMixOpen(false)}
      />
    </div>
  );
}
