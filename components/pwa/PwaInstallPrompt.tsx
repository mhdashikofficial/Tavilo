'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, Share, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Register service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Tavilo ServiceWorker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('ServiceWorker registration error:', err);
        });
    }

    // 2. Check if already installed in standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari navigator.standalone
      window.navigator.standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Capture beforeinstallprompt for Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if user dismissed banner recently
      const dismissed = localStorage.getItem('tavilo_pwa_banner_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not dismissed, show install banner
    if (isIosDevice) {
      const dismissed = localStorage.getItem('tavilo_pwa_banner_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIosGuide(true);
    }
  };

  const handleDismissBanner = (permanent: boolean = false) => {
    setShowBanner(false);
    if (permanent) {
      localStorage.setItem('tavilo_pwa_banner_dismissed', 'true');
    }
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Subtle Mobile/Desktop Install Header Banner */}
      {showBanner && (
        <div className="bg-gradient-to-r from-tavilo-card to-[#161a25] border-b border-tavilo-border/80 px-4 py-2.5 flex items-center justify-between z-30 relative animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black flex-shrink-0 relative border border-white/10">
              <Image src="/favicon.svg" alt="Tavilo Icon" fill className="object-cover" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                Install Tavilo App
              </p>
              <p className="text-[11px] text-tavilo-text-secondary">
                Enjoy offline shell & instant full-screen music playback
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallClick}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-tavilo-green text-black font-semibold text-xs hover:bg-[#00c985] transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => handleDismissBanner(true)}
              aria-label="Dismiss banner"
              className="p-1 rounded-full text-tavilo-text-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Add to Home Screen Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-tavilo-card border border-tavilo-border rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 p-1.5 text-tavilo-text-muted hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 overflow-hidden relative shadow-lg border border-white/10">
                <Image src="/apple-touch-icon.png" alt="Tavilo Icon" fill />
              </div>
              <h3 className="font-bold text-lg text-white">Install Tavilo on iOS</h3>
              <p className="text-xs text-tavilo-text-secondary mt-1">
                Add Tavilo to your iPhone or iPad home screen in 4 simple steps:
              </p>
            </div>

            <div className="space-y-3.5 text-xs text-tavilo-text-primary bg-tavilo-surface/70 p-4 rounded-xl border border-white/5 mb-5">
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-tavilo-green/20 text-tavilo-green font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  1
                </span>
                <span>Open Tavilo in <strong>Safari</strong> browser.</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-tavilo-green/20 text-tavilo-green font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  2
                </span>
                <span className="flex items-center gap-1.5">
                  Tap the <Share className="w-4 h-4 text-tavilo-green inline" /> <strong>Share</strong> button in the Safari toolbar.
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-tavilo-green/20 text-tavilo-green font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  3
                </span>
                <span className="flex items-center gap-1.5">
                  Scroll down and tap <PlusSquare className="w-4 h-4 text-tavilo-violet inline" /> <strong>Add to Home Screen</strong>.
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-tavilo-green/20 text-tavilo-green font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  4
                </span>
                <span>Confirm by tapping <strong>Add</strong> in the top right.</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowIosGuide(false);
                  handleDismissBanner(true);
                }}
                className="flex-1 py-2 rounded-xl bg-tavilo-surface text-xs text-tavilo-text-secondary hover:text-white border border-tavilo-border"
              >
                Don't show again
              </button>
              <button
                onClick={() => setShowIosGuide(false)}
                className="flex-1 py-2 rounded-xl bg-tavilo-green text-black font-semibold text-xs hover:bg-[#00c985]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
