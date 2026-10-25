'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Heart,
  Plus,
  Play,
  Shuffle,
  Music,
  Trash2,
  Clock,
  User,
  ListMusic,
  MoreVertical,
} from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';
import { TrackRow } from '@/components/music/TrackRow';
import { useLibrary } from '@/lib/library/LibraryContext';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { cn } from '@/lib/utils';
import { Playlist } from '@/types/music';

export default function LibraryPage() {
  const { playlists, likedTracks, preferences, createPlaylist, deletePlaylist } = useLibrary();
  const { playTrack } = usePlayback();

  const [activeTab, setActiveTab] = useState<'all' | 'playlists' | 'liked' | 'history'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      createPlaylist(newTitle.trim(), newDesc.trim());
      setNewTitle('');
      setNewDesc('');
      setShowCreateModal(false);
    }
  };

  const handlePlayLiked = (shuffleMode: boolean = false) => {
    if (likedTracks.length === 0) return;
    const tracksToPlay = shuffleMode
      ? [...likedTracks].sort(() => Math.random() - 0.5)
      : likedTracks;
    playTrack(tracksToPlay[0], tracksToPlay.slice(1));
  };

  return (
    <div className="min-h-full">
      <TopBar title="Your Library" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Top Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'playlists', label: `Playlists (${playlists.length})` },
              { id: 'liked', label: `Liked Songs (${likedTracks.length})` },
              { id: 'history', label: `History (${preferences.recentlyPlayed.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                  activeTab === tab.id
                    ? 'bg-tavilo-green text-black shadow-md'
                    : 'bg-tavilo-card hover:bg-tavilo-surface text-tavilo-text-secondary hover:text-white border border-tavilo-border'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-tavilo-surface border border-tavilo-green/40 text-tavilo-green text-xs font-semibold hover:bg-tavilo-green hover:text-black transition-all self-start sm:self-auto shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>
        </div>

        {/* Liked Songs Hero Card (Show in 'all' or 'liked') */}
        {(activeTab === 'all' || activeTab === 'liked') && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/60 via-tavilo-card to-[#121622] border border-tavilo-green/30 p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-tavilo-green to-emerald-800 flex items-center justify-center text-black flex-shrink-0 shadow-xl shadow-tavilo-green/20">
                <Heart className="w-10 h-10 fill-current" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-tavilo-green">
                  Auto Collection
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
                  Liked Songs
                </h2>
                <p className="text-xs sm:text-sm text-tavilo-text-secondary mt-1">
                  {likedTracks.length} tracks you love • Used for taste recommendations
                </p>
              </div>
            </div>

            {likedTracks.length > 0 && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handlePlayLiked(false)}
                  className="w-12 h-12 rounded-full bg-tavilo-green text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-tavilo-green/30"
                  aria-label="Play all liked songs"
                >
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </button>
                <button
                  onClick={() => handlePlayLiked(true)}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Shuffle liked songs"
                >
                  <Shuffle className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Liked Songs Full Track List (if in 'liked' tab) */}
        {activeTab === 'liked' && (
          <div className="bg-tavilo-card/50 border border-tavilo-border rounded-2xl p-2 sm:p-4 space-y-1">
            {likedTracks.length === 0 ? (
              <div className="p-8 text-center text-tavilo-text-muted">
                <Heart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold text-white">No liked tracks yet</p>
                <p className="text-xs mt-1">Tap the heart on any track to save it here.</p>
              </div>
            ) : (
              likedTracks.map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={idx}
                  playlistContext={likedTracks}
                />
              ))
            )}
          </div>
        )}

        {/* Playlists Grid (Show in 'all' or 'playlists') */}
        {(activeTab === 'all' || activeTab === 'playlists') && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Playlists
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="group relative flex flex-col p-3.5 rounded-2xl bg-tavilo-card/60 hover:bg-tavilo-card border border-tavilo-border/60 hover:border-tavilo-green/40 transition-all shadow-md"
                >
                  <Link href={`/playlist/${pl.id}`} className="block flex-1">
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-black/40">
                      <Image
                        src={pl.artwork}
                        alt={pl.title}
                        fill
                        sizes="(max-width: 640px) 150px, 200px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                    <h3 className="font-bold text-sm text-white group-hover:text-tavilo-green truncate transition-colors">
                      {pl.title}
                    </h3>
                    <p className="text-xs text-tavilo-text-secondary mt-0.5 line-clamp-1">
                      {pl.trackCount} tracks
                    </p>
                  </Link>

                  {pl.isCustom && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete playlist "${pl.title}"?`)) {
                          deletePlaylist(pl.id);
                        }
                      }}
                      title="Delete playlist"
                      className="absolute top-5 right-5 p-1.5 rounded-full bg-black/60 text-tavilo-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listening History (Show in 'all' or 'history') */}
        {(activeTab === 'all' || activeTab === 'history') && preferences.recentlyPlayed.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="w-4 h-4 text-blue-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Listening History ({preferences.recentlyPlayed.length})
              </h2>
            </div>

            <div className="bg-tavilo-card/50 border border-tavilo-border rounded-2xl p-2 sm:p-4 space-y-1">
              {preferences.recentlyPlayed.map((item, idx) => (
                <TrackRow
                  key={`${item.track.id}-${idx}`}
                  track={item.track}
                  index={idx}
                  playlistContext={preferences.recentlyPlayed.map((r) => r.track)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-tavilo-card border border-tavilo-border rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create New Playlist</h3>
            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-tavilo-text-secondary mb-1">
                  Playlist Name
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Late Night Vibes"
                  className="w-full px-3.5 py-2.5 bg-tavilo-surface border border-tavilo-border rounded-xl text-white text-sm focus:outline-none focus:border-tavilo-green"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tavilo-text-secondary mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Tell listeners what this playlist feels like..."
                  rows={3}
                  className="w-full px-3.5 py-2 bg-tavilo-surface border border-tavilo-border rounded-xl text-white text-sm focus:outline-none focus:border-tavilo-green"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-tavilo-surface text-xs font-semibold text-tavilo-text-secondary hover:text-white border border-tavilo-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-tavilo-green text-black font-bold text-xs hover:bg-[#00c985]"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
