'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Sliders, Info, Sparkles } from 'lucide-react';

interface TopBarProps {
  onOpenTuneMix?: () => void;
  title?: string;
}

export function TopBar({ onOpenTuneMix, title }: TopBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 h-16 bg-tavilo-bg/85 backdrop-blur-md border-b border-tavilo-border/50 px-4 sm:px-8 flex items-center justify-between">
      {/* Navigation history controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="p-2 rounded-full bg-tavilo-surface/80 hover:bg-tavilo-surface text-tavilo-text-secondary hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => router.forward()}
          aria-label="Forward"
          className="hidden sm:flex p-2 rounded-full bg-tavilo-surface/80 hover:bg-tavilo-surface text-tavilo-text-secondary hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {title && (
          <h1 className="ml-2 font-bold text-base sm:text-lg text-white truncate max-w-[200px] sm:max-w-md">
            {title}
          </h1>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {onOpenTuneMix && (
          <button
            onClick={onOpenTuneMix}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-tavilo-surface border border-tavilo-violet/40 text-tavilo-violet hover:bg-tavilo-violet/15 text-xs font-semibold transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tune My Mix</span>
          </button>
        )}

        <Link
          href="/about"
          title="About Tavilo & Legal Attributions"
          className="p-2 rounded-full bg-tavilo-surface text-tavilo-text-secondary hover:text-white transition-colors"
        >
          <Info className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
