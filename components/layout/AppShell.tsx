'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { MobileNavBar } from '@/components/navigation/MobileNavBar';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { FullScreenPlayer } from '@/components/player/FullScreenPlayer';
import { QueueModal } from '@/components/player/QueueModal';
import { TuneMixModal } from '@/components/tune/TuneMixModal';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isTuneMixOpen, setTuneMixOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-tavilo-bg text-tavilo-text-primary antialiased">
      {/* Desktop Sidebar */}
      <Sidebar onOpenTuneMix={() => setTuneMixOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* PWA Install Banner at top if applicable */}
        <PwaInstallPrompt />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-32 sm:pb-28">
          {children}
        </main>

        {/* Persistent Mini Player */}
        <MiniPlayer />

        {/* Mobile Fixed Navigation Bar */}
        <MobileNavBar />
      </div>

      {/* Full Screen Player Modal */}
      <FullScreenPlayer onOpenTuneMix={() => setTuneMixOpen(true)} />

      {/* Queue Drawer */}
      <QueueModal />

      {/* Tune My Mix Configuration Modal */}
      <TuneMixModal
        isOpen={isTuneMixOpen}
        onClose={() => setTuneMixOpen(false)}
      />
    </div>
  );
}
