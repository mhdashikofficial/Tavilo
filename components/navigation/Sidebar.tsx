'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  Library,
  Sliders,
  Heart,
  Info,
  PlusCircle,
  Music,
} from 'lucide-react';
import { useLibrary } from '@/lib/library/LibraryContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onOpenTuneMix?: () => void;
}

export function Sidebar({ onOpenTuneMix }: SidebarProps) {
  const pathname = usePathname();
  const { playlists, likedTracks, createPlaylist } = useLibrary();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Your Library', href: '/library', icon: Library },
  ];

  const handleNewPlaylist = () => {
    const title = prompt('Enter a playlist name:', `My Playlist #${playlists.length + 1}`);
    if (title && title.trim()) {
      createPlaylist(title.trim());
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-tavilo-card border-r border-tavilo-border h-screen sticky top-0 p-4 select-none z-30">
      {/* Brand Header */}
      <div className="px-2 py-3 mb-4">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-tavilo-border">
            <Image src="/favicon.svg" alt="Tavilo Logo" fill className="object-cover" />
          </div>
          <div>
            <span className="font-black text-xl tracking-wider text-white group-hover:text-tavilo-green transition-colors">
              TAVIL<span className="text-tavilo-green">O</span>
            </span>
            <p className="text-[10px] font-semibold text-tavilo-text-muted tracking-widest uppercase">
              Your Sound. Your World.
            </p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 mb-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3.5 px-3 py-2.5 rounded-xl font-medium text-sm transition-all',
                isActive
                  ? 'bg-tavilo-surface text-tavilo-green font-semibold shadow-sm border border-tavilo-green/20'
                  : 'text-tavilo-text-secondary hover:text-white hover:bg-tavilo-surface/60'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-tavilo-green' : 'text-tavilo-text-muted')} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Tune My Mix Quick Trigger */}
        {onOpenTuneMix && (
          <button
            onClick={onOpenTuneMix}
            className="w-full flex items-center space-x-3.5 px-3 py-2.5 rounded-xl font-medium text-sm text-tavilo-text-secondary hover:text-tavilo-violet hover:bg-tavilo-surface/60 transition-colors text-left"
          >
            <Sliders className="w-5 h-5 text-tavilo-violet" />
            <span>Tune My Mix</span>
          </button>
        )}
      </nav>

      {/* Playlists Header */}
      <div className="px-3 pt-3 pb-2 border-t border-tavilo-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-tavilo-text-muted">
          Playlists
        </span>
        <button
          onClick={handleNewPlaylist}
          title="Create Playlist"
          className="text-tavilo-text-muted hover:text-tavilo-green transition-colors p-1"
        >
          <PlusCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs">
        {/* Liked Songs Entry */}
        <Link
          href="/library?tab=liked"
          className={cn(
            'flex items-center space-x-3 px-3 py-2 rounded-xl transition-colors',
            pathname === '/library'
              ? 'text-tavilo-green font-medium bg-tavilo-surface/40'
              : 'text-tavilo-text-secondary hover:text-white hover:bg-tavilo-surface/40'
          )}
        >
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-tavilo-green to-emerald-700 flex items-center justify-center text-black flex-shrink-0">
            <Heart className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="truncate">Liked Songs ({likedTracks.length})</span>
        </Link>

        {playlists.map((pl) => (
          <Link
            key={pl.id}
            href={`/playlist/${pl.id}`}
            className="flex items-center space-x-3 px-3 py-2 rounded-xl text-tavilo-text-secondary hover:text-white hover:bg-tavilo-surface/40 transition-colors"
          >
            <Music className="w-4 h-4 text-tavilo-text-muted flex-shrink-0" />
            <span className="truncate">{pl.title}</span>
          </Link>
        ))}
      </div>

      {/* Footer Info & Developer Credit */}
      <div className="pt-4 border-t border-tavilo-border px-2 text-[11px] text-tavilo-text-muted space-y-2">
        <Link
          href="/about"
          className="flex items-center space-x-2 text-tavilo-text-secondary hover:text-tavilo-green transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          <span>About & Licenses</span>
        </Link>
        <p className="font-medium text-tavilo-text-muted/80">
          Tavilo — Developed by Ash © 2026
        </p>
      </div>
    </aside>
  );
}
