'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, ShieldCheck, Heart, Radio, Music, Code, Mail } from 'lucide-react';
import { TopBar } from '@/components/navigation/TopBar';

export default function AboutPage() {
  return (
    <div className="min-h-full">
      <TopBar title="About Tavilo" />

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Brand Banner */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[#121622] via-tavilo-card to-[#1a1428] border border-tavilo-border text-center space-y-4 shadow-2xl">
          <div className="relative w-20 h-20 mx-auto rounded-3xl overflow-hidden shadow-xl border border-white/10">
            <Image src="/favicon.svg" alt="Tavilo Logo" fill className="object-cover" />
          </div>

          <div>
            <h1 className="text-3xl font-black text-white tracking-wider">
              TAVIL<span className="text-tavilo-green">O</span>
            </h1>
            <p className="text-xs uppercase font-bold tracking-widest text-tavilo-green mt-1">
              Your sound. Your world.
            </p>
          </div>

          <p className="text-sm text-tavilo-text-secondary max-w-lg mx-auto">
            Tavilo is a modern, responsive, mobile-first Progressive Web App designed to deliver seamless music discovery, intelligent taste-based recommendations, and legitimate audio streaming.
          </p>

          <div className="pt-2">
            <span className="inline-block px-4 py-1.5 rounded-full bg-tavilo-surface border border-tavilo-border text-xs font-semibold text-white">
              Tavilo — Developed by Ash © 2026
            </span>
          </div>
        </div>

        {/* Music Provider Attributions & Legitimate Catalogs */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2 text-white">
            <Radio className="w-5 h-5 text-tavilo-green" />
            <h2 className="text-lg font-bold">Music Catalogs & Legal Playback</h2>
          </div>
          <p className="text-xs sm:text-sm text-tavilo-text-secondary">
            Tavilo connects strictly to documented, legitimate open music catalogs and authorized streaming networks. We respect intellectual property rights, licenses, and content creators.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-tavilo-card border border-tavilo-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Audius Open Network</span>
                <a
                  href="https://audius.co"
                  target="_blank"
                  rel="noreferrer"
                  className="text-tavilo-green hover:underline text-xs flex items-center space-x-1"
                >
                  <span>audius.co</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-tavilo-text-secondary">
                Decentralized audio protocol providing access to millions of independent artists, tracks, and public audio streams.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-tavilo-card border border-tavilo-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Jamendo Music</span>
                <a
                  href="https://www.jamendo.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-tavilo-green hover:underline text-xs flex items-center space-x-1"
                >
                  <span>jamendo.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-tavilo-text-secondary">
                Free music community offering songs released under Creative Commons licenses for non-commercial web streaming.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-tavilo-card border border-tavilo-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Creative Commons & FreeSound</span>
                <a
                  href="https://creativecommons.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-tavilo-green hover:underline text-xs flex items-center space-x-1"
                >
                  <span>CC BY 4.0</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-tavilo-text-secondary">
                Verified high-fidelity audio compositions shared under Creative Commons Attribution licenses.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-tavilo-card border border-tavilo-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">YouTube Music Catalog</span>
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-tavilo-green hover:underline text-xs flex items-center space-x-1"
                >
                  <span>Terms</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-tavilo-text-secondary">
                Official YouTube embedded playback, video metadata, and official high-resolution album artwork.
              </p>
            </div>
          </div>
        </section>

        {/* Taste-Based Autoplay Engine */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2 text-white">
            <ShieldCheck className="w-5 h-5 text-tavilo-violet" />
            <h2 className="text-lg font-bold">Taste-Based Recommendation System</h2>
          </div>
          <p className="text-xs sm:text-sm text-tavilo-text-secondary leading-relaxed">
            Tavilo uses a transparent, metadata-driven recommendation engine. Instead of a black box, it mathematically balances your preferred genres, favorite artists, listening durations, and skipped tracks with an artist fatigue penalty to provide variety. You can adjust this balance anytime using the <strong>Tune My Mix</strong> control.
          </p>
        </section>

        {/* Developer Credit & Contact */}
        <section className="p-6 rounded-2xl bg-tavilo-card/70 border border-tavilo-border space-y-3">
          <div className="flex items-center space-x-2 text-white">
            <Code className="w-4 h-4 text-tavilo-green" />
            <h3 className="font-bold text-sm">Engineering & Design</h3>
          </div>
          <p className="text-xs text-tavilo-text-secondary">
            Developed by <strong>Ash</strong> as a production-grade web application combining Next.js App Router, TypeScript, Tailwind CSS, Media Session API, and Progressive Web App (PWA) architecture.
          </p>
          <div className="pt-2 flex items-center space-x-2 text-xs text-tavilo-text-muted">
            <Mail className="w-3.5 h-3.5 text-tavilo-green" />
            <span>Contact: contact@tavilo.app</span>
          </div>
        </section>

        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-tavilo-green text-black font-bold text-xs hover:bg-[#00c985] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Music</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
