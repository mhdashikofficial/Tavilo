'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, Music, ArrowLeft, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-tavilo-bg text-center">
      <div className="max-w-md w-full p-8 rounded-3xl bg-tavilo-card border border-tavilo-border space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-tavilo-surface border border-white/10 flex items-center justify-center mx-auto text-tavilo-green">
          <WifiOff className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">You're Offline</h1>
          <p className="text-xs sm:text-sm text-tavilo-text-secondary mt-2">
            Tavilo is currently disconnected from the network. The app shell is cached, but live music streams require an active internet connection.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-2.5 rounded-xl bg-tavilo-green text-black font-bold text-xs hover:bg-[#00c985] flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/library"
            className="flex-1 py-2.5 rounded-xl bg-tavilo-surface text-white border border-tavilo-border font-semibold text-xs hover:bg-tavilo-card flex items-center justify-center space-x-1.5"
          >
            <Music className="w-3.5 h-3.5" />
            <span>Your Library</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
