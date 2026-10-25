'use client';

import React from 'react';
import Link from 'next/link';
import {
  Coffee,
  Brain,
  Zap,
  Moon,
  Car,
  Heart,
  Flame,
  Guitar,
  Radio,
  Music,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoodCardProps {
  id: string;
  label: string;
  color: string;
  icon: string;
  description: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Coffee,
  Brain,
  Zap,
  Moon,
  Car,
  Heart,
  Flame,
  Guitar,
  Radio,
  Music,
};

export function MoodCard({ id, label, color, icon, description }: MoodCardProps) {
  const IconComponent = ICON_MAP[icon] || Music;

  return (
    <Link
      href={`/mood/${id}`}
      className={cn(
        'group relative overflow-hidden rounded-2xl p-4 sm:p-5 aspect-[1.3/1] flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl border border-white/10',
        `bg-gradient-to-br ${color}`
      )}
    >
      {/* Background radial glow */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />

      {/* Decorative oversized icon in bottom-right */}
      <IconComponent className="absolute -right-2 -bottom-2 w-20 h-20 text-white/15 transform rotate-12 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" />

      {/* Top Header */}
      <div className="relative z-10">
        <div className="inline-flex p-2 rounded-xl bg-black/20 backdrop-blur-md mb-2">
          <IconComponent className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-bold text-lg sm:text-xl text-white tracking-wide">
          {label}
        </h3>
      </div>

      {/* Description */}
      <p className="relative z-10 text-xs text-white/80 line-clamp-2 pr-6">
        {description}
      </p>
    </Link>
  );
}
