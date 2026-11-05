'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  BatteryCharging,
  Lock,
  Bell,
  Volume2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Radio,
  Moon,
  Play,
} from 'lucide-react';
import { usePlayback } from '@/lib/playback/PlaybackContext';
import { cn } from '@/lib/utils';

type BrandTab = 'vivo' | 'xiaomi' | 'samsung' | 'oppo' | 'generic';

interface AndroidBackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AndroidBackgroundModal({ isOpen, onClose }: AndroidBackgroundModalProps) {
  const {
    notificationPermission,
    requestNotificationPermission,
    enableWebAudioKeepAlive,
    resume,
    currentTrack,
    setPocketMode,
  } = usePlayback();

  const [activeTab, setActiveTab] = useState<BrandTab>('vivo');
  const [hasActivated, setHasActivated] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Auto-detect brand from user agent
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('vivo') || ua.includes('v2') || ua.includes('origin') || ua.includes('funtouch')) {
      setActiveTab('vivo');
    } else if (
      ua.includes('xiaomi') ||
      ua.includes('redmi') ||
      ua.includes('poco') ||
      ua.includes('miui') ||
      ua.includes('hyperos')
    ) {
      setActiveTab('xiaomi');
    } else if (ua.includes('samsung') || ua.includes('sm-')) {
      setActiveTab('samsung');
    } else if (
      ua.includes('oppo') ||
      ua.includes('oneplus') ||
      ua.includes('realme') ||
      ua.includes('coloros') ||
      ua.includes('oxygenos')
    ) {
      setActiveTab('oppo');
    } else {
      setActiveTab('vivo'); // Default to Vivo since it's the specific target
    }
  }, []);

  if (!isOpen) return null;

  const handleActivatePermissions = async () => {
    enableWebAudioKeepAlive();
    const granted = await requestNotificationPermission();
    setHasActivated(true);

    if (granted) {
      setStatusMessage('Keep-alive activated & notification sent! Now follow the phone settings below.');
    } else if (notificationPermission === 'denied') {
      setStatusMessage('Notifications are blocked in Chrome. Please tap the lock/tune icon near the URL bar to allow.');
    } else {
      setStatusMessage('Keep-alive engine started! Follow the steps below for screen-off playback.');
    }

    if (currentTrack) {
      resume();
    }
  };

  const handleSendTestNotification = () => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window)) {
      alert('Notifications are not supported on this browser.');
      return;
    }

    if (Notification.permission !== 'granted') {
      requestNotificationPermission();
      return;
    }

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification('🎵 Tavilo Background Audio Active', {
            body: 'Screen-off playback & lock-screen player are ready. You can now lock your phone.',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: 'tavilo-test-notification',
          });
        });
      } else {
        new Notification('🎵 Tavilo Background Audio Active', {
          body: 'Screen-off playback & lock-screen player are ready. You can now lock your phone.',
          icon: '/icons/icon-192.png',
        });
      }
      setStatusMessage('Test lock-screen notification sent! Check your notification tray.');
    } catch {
      setStatusMessage('Could not dispatch notification. Ensure notifications are enabled for Chrome.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-tavilo-card border border-tavilo-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-tavilo-border/80 flex items-center justify-between bg-gradient-to-r from-tavilo-surface via-tavilo-card to-tavilo-surface">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-tavilo-green/15 text-tavilo-green border border-tavilo-green/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Android & Vivo Background Fix
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tavilo-green/20 text-tavilo-green border border-tavilo-green/30">
                  Screen-Off Guide
                </span>
              </div>
              <p className="text-xs text-tavilo-text-secondary">
                Fix background pausing & sleep termination on Vivo, Xiaomi, Samsung & more
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

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Quick 1-Tap Fix & Status Section */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-black/40 to-black/20 border border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-tavilo-green flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse text-tavilo-green" />
                <span>Audio Engine & Lock Screen Status</span>
              </span>

              <div className="flex items-center space-x-2">
                {notificationPermission === 'granted' ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Notifications Allowed</span>
                  </span>
                ) : notificationPermission === 'denied' ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-950/80 text-red-400 border border-red-500/40">
                    <AlertCircle className="w-3 h-3" />
                    <span>Notifications Blocked</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                    <Bell className="w-3 h-3" />
                    <span>Permission Needed</span>
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-tavilo-text-secondary leading-relaxed">
              Modern Android versions (especially <strong>Vivo Funtouch OS</strong>) stop audio when the screen turns off unless:
              <br />
              <strong className="text-white">1.</strong> Notification permission is allowed (keeps the lock-screen player alive)
              <br />
              <strong className="text-white">2.</strong> High background power consumption is allowed in phone Settings.
            </p>

            {statusMessage && (
              <div className="p-3 rounded-xl bg-tavilo-surface border border-tavilo-green/40 text-xs text-tavilo-green flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleActivatePermissions}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-tavilo-green text-black font-bold text-xs hover:brightness-110 active:scale-98 transition-all shadow-lg shadow-tavilo-green/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>1-Tap Activate Audio & Permissions</span>
              </button>

              <button
                onClick={handleSendTestNotification}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-tavilo-surface border border-white/10 hover:border-white/20 text-white font-semibold text-xs transition-colors"
              >
                <Bell className="w-4 h-4 text-tavilo-violet" />
                <span>Send Test Lock-Screen Alert</span>
              </button>
            </div>
          </div>

          {/* 2 Methods to Guarantee Background Playback */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tavilo-green flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>2 Effective Ways to Keep Music Playing:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Method 1: Pocket Mode */}
              <div className="p-4 rounded-2xl bg-neutral-950/90 border border-emerald-500/30 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Moon className="w-4 h-4" />
                  <h4 className="font-bold text-xs text-white">1. OLED Pocket Mode (100% Guaranteed)</h4>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Turns your screen <strong>100% pitch-black</strong>. On OLED/AMOLED screens, black pixels use <strong>0% battery power</strong>, and phone never suspends the music in your pocket!
                </p>
                <button
                  onClick={() => {
                    onClose();
                    setPocketMode(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Try Pocket Mode Now</span>
                </button>
              </div>

              {/* Method 2: Lock Screen Play Resume */}
              <div className="p-4 rounded-2xl bg-neutral-950/90 border border-blue-500/30 space-y-2">
                <div className="flex items-center space-x-2 text-blue-400">
                  <Play className="w-4 h-4 fill-current" />
                  <h4 className="font-bold text-xs text-white">2. Lock-Screen Play Resume</h4>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  If music pauses when pressing the physical power button, <strong>simply tap Play (▶) on your lock-screen notification</strong> (or press your Bluetooth earphone button). Android will resume the stream with the screen locked!
                </p>
              </div>
            </div>
          </div>

          {/* Brand Selector Tabs */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-tavilo-text-muted block mb-2">
              Select Your Device Brand:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/5">
              <button
                onClick={() => setActiveTab('vivo')}
                className={cn(
                  'py-2 px-2 rounded-xl text-xs font-bold transition-all text-center relative',
                  activeTab === 'vivo'
                    ? 'bg-tavilo-green text-black shadow-md shadow-tavilo-green/20'
                    : 'text-tavilo-text-secondary hover:text-white'
                )}
              >
                Vivo / iQOO
                {activeTab === 'vivo' && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tavilo-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('xiaomi')}
                className={cn(
                  'py-2 px-2 rounded-xl text-xs font-bold transition-all text-center',
                  activeTab === 'xiaomi'
                    ? 'bg-tavilo-green text-black shadow-md shadow-tavilo-green/20'
                    : 'text-tavilo-text-secondary hover:text-white'
                )}
              >
                Xiaomi / POCO
              </button>

              <button
                onClick={() => setActiveTab('samsung')}
                className={cn(
                  'py-2 px-2 rounded-xl text-xs font-bold transition-all text-center',
                  activeTab === 'samsung'
                    ? 'bg-tavilo-green text-black shadow-md shadow-tavilo-green/20'
                    : 'text-tavilo-text-secondary hover:text-white'
                )}
              >
                Samsung
              </button>

              <button
                onClick={() => setActiveTab('oppo')}
                className={cn(
                  'py-2 px-2 rounded-xl text-xs font-bold transition-all text-center',
                  activeTab === 'oppo'
                    ? 'bg-tavilo-green text-black shadow-md shadow-tavilo-green/20'
                    : 'text-tavilo-text-secondary hover:text-white'
                )}
              >
                Oppo / 1+
              </button>

              <button
                onClick={() => setActiveTab('generic')}
                className={cn(
                  'py-2 px-2 rounded-xl text-xs font-bold transition-all text-center',
                  activeTab === 'generic'
                    ? 'bg-tavilo-green text-black shadow-md shadow-tavilo-green/20'
                    : 'text-tavilo-text-secondary hover:text-white'
                )}
              >
                Other Android
              </button>
            </div>
          </div>

          {/* TAB 1: VIVO (Funtouch OS / OriginOS) */}
          {activeTab === 'vivo' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-200">
                <p className="font-semibold text-blue-100 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Why Vivo phones pause music after 5 seconds of screen off:</span>
                </p>
                <p className="mt-1 leading-relaxed text-blue-200/90">
                  Vivo's built-in <strong>iManager</strong> features an ultra-aggressive battery saver that forces background browser tabs to hibernate unless <strong>&quot;Allow high background power consumption&quot;</strong> is switched on and the app is locked in Recent Apps.
                </p>
              </div>

              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    Allow High Background Power Consumption (Essential)
                  </h3>
                </div>
                <div className="pl-8 space-y-1.5 text-xs text-tavilo-text-secondary">
                  <p>
                    Open your phone&apos;s <strong className="text-white">Settings</strong> app:
                  </p>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-tavilo-green">
                    Settings → Battery → Background power consumption management
                  </div>
                  <p>
                    Find <strong className="text-white">Chrome</strong> (or your browser / Tavilo), tap it, and change from &quot;Smart Control&quot; to <strong className="text-tavilo-green">&quot;Allow high background power consumption&quot;</strong>.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    Lock Tavilo in Recent Apps (Prevent RAM Cleanup)
                  </h3>
                </div>
                <div className="pl-8 space-y-1.5 text-xs text-tavilo-text-secondary">
                  <p>
                    1. Swipe up from the bottom of the screen and hold to open <strong className="text-white">Recent Apps</strong> (multitasking).
                  </p>
                  <p>
                    2. Pull down on the <strong className="text-white">Chrome / Tavilo</strong> card.
                  </p>
                  <p>
                    3. Tap the <strong className="text-tavilo-green">🔒 Padlock icon</strong> so it displays as locked. Vivo will never purge Tavilo from RAM.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    3
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    Enable Lock Screen Notification Display
                  </h3>
                </div>
                <div className="pl-8 space-y-1.5 text-xs text-tavilo-text-secondary">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-tavilo-green">
                    Settings → Notifications & Status Bar → Chrome
                  </div>
                  <p>
                    Ensure <strong className="text-white">&quot;Allow Notifications&quot;</strong> and <strong className="text-white">&quot;Show on Lock screen&quot;</strong> are enabled. This maintains Android&apos;s audio service priority.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    4
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    Autostart (OriginOS / Funtouch OS 13+)
                  </h3>
                </div>
                <div className="pl-8 space-y-1 text-xs text-tavilo-text-secondary">
                  <p>
                    If your phone has an <strong className="text-white">Autostart</strong> setting (under <em>Settings → Applications & Permissions → Autostart</em> or <em>iManager → Autostart</em>), toggle Chrome / Tavilo <strong className="text-tavilo-green">ON</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: XIAOMI / REDMI / POCO */}
          {activeTab === 'xiaomi' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-bold text-white text-sm">Set Battery Saver to &quot;No Restrictions&quot;</h3>
                </div>
                <div className="pl-8 space-y-1 text-xs text-tavilo-text-secondary">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-tavilo-green">
                    Settings → Apps → Manage Apps → Chrome → Battery Saver
                  </div>
                  <p>
                    Select <strong className="text-tavilo-green">&quot;No restrictions&quot;</strong> (do not choose MIUI Battery Saver).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-bold text-white text-sm">Lock in Recent Tasks & Allow Autostart</h3>
                </div>
                <div className="pl-8 space-y-1 text-xs text-tavilo-text-secondary">
                  <p>
                    Open Recent Apps screen, long press on Chrome, and tap the <strong className="text-tavilo-green">🔒 Lock</strong> icon. Also toggle <strong className="text-white">&quot;Autostart&quot;</strong> on in App Info.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAMSUNG */}
          {activeTab === 'samsung' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-bold text-white text-sm">Set Battery to &quot;Unrestricted&quot;</h3>
                </div>
                <div className="pl-8 space-y-1 text-xs text-tavilo-text-secondary">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-tavilo-green">
                    Settings → Apps → Chrome → Battery
                  </div>
                  <p>
                    Select <strong className="text-tavilo-green">&quot;Unrestricted&quot;</strong> so One UI doesn&apos;t sleep Tavilo in background.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-bold text-white text-sm">Prevent Chrome from Sleeping</h3>
                </div>
                <div className="pl-8 space-y-1 text-xs text-tavilo-text-secondary">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-tavilo-green">
                    Settings → Battery → Background usage limits → Never sleeping apps
                  </div>
                  <p>
                    Tap &quot;+&quot; and add <strong className="text-white">Chrome</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OPPO / ONEPLUS / REALME */}
          {activeTab === 'oppo' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-bold text-white text-sm">Allow Background & Foreground Activity</h3>
                </div>
                <div className="pl-8 space-y-1 text-xs text-tavilo-text-secondary">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-tavilo-green">
                    Settings → Battery → More Settings → App battery management → Chrome
                  </div>
                  <p>
                    Turn ON both <strong className="text-white">&quot;Allow background activity&quot;</strong> and <strong className="text-white">&quot;Allow auto-launch&quot;</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-bold text-white text-sm">Lock in Recent Tasks</h3>
                </div>
                <div className="pl-8 space-y-1 text-xs text-tavilo-text-secondary">
                  <p>
                    In Recent Apps, tap the three dots or swipe down on Chrome and tap <strong className="text-tavilo-green">Lock</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GENERIC ANDROID */}
          {activeTab === 'generic' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    1
                  </div>
                  <h3 className="font-bold text-white text-sm">Set App Battery to &quot;Unrestricted&quot;</h3>
                </div>
                <div className="pl-8 space-y-1 text-xs text-tavilo-text-secondary">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-tavilo-green">
                    Settings → Apps → Chrome → App battery usage
                  </div>
                  <p>
                    Select <strong className="text-tavilo-green">&quot;Unrestricted&quot;</strong> instead of &quot;Optimized&quot;.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-tavilo-surface/70 border border-tavilo-border space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-tavilo-green text-black font-black text-xs flex items-center justify-center">
                    2
                  </div>
                  <h3 className="font-bold text-white text-sm">Allow Notifications</h3>
                </div>
                <div className="pl-8 space-y-1 text-xs text-tavilo-text-secondary">
                  <p>
                    Make sure notifications are enabled so the system media control notification is pinned to the lock screen.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick FAQ / Pro Tip */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start space-x-3 text-xs text-tavilo-text-secondary">
            <Sparkles className="w-4 h-4 text-tavilo-green flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Pro Tip: Add Tavilo to Home Screen (PWA)</p>
              <p className="mt-0.5 leading-relaxed">
                Tapping <strong className="text-white">&quot;Add to Home Screen&quot;</strong> or &quot;Install App&quot; in Chrome gives Tavilo standalone priority permissions on Android, improving lock-screen playback even further.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-tavilo-border bg-tavilo-surface/50 flex items-center justify-between">
          <p className="text-[11px] text-tavilo-text-muted">
            Tavilo Audio Engine • Ash © 2026
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-tavilo-green text-black font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md shadow-tavilo-green/20"
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
