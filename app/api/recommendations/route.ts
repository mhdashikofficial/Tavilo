import { NextRequest, NextResponse } from 'next/server';
import { RecommendationEngine, sanitizePreferences } from '@/lib/recommendations/engine';
import { MusicProviderService } from '@/lib/music/provider';
import { SEED_TRACKS } from '@/lib/music/seed';
import { UserPreferences, Track } from '@/types/music';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      currentTrack,
      preferences,
      limit = 8,
      existingQueueIds = [],
    }: {
      currentTrack?: Track | null;
      preferences?: Partial<UserPreferences>;
      limit?: number;
      existingQueueIds?: string[];
    } = body;

    const safePrefs = sanitizePreferences(preferences);

    let candidatePool: Track[] = [];
    try {
      candidatePool = currentTrack
        ? await MusicProviderService.getTailoredCandidates(currentTrack, safePrefs)
        : await MusicProviderService.getTrending(30);
    } catch (fetchErr) {
      console.warn('Failed to fetch live tailored candidates, using seed pool:', fetchErr);
    }

    if (!candidatePool || candidatePool.length === 0) {
      candidatePool = SEED_TRACKS;
    }

    const recommended = RecommendationEngine.generateRecommendationQueue(
      candidatePool,
      safePrefs,
      currentTrack || null,
      limit,
      existingQueueIds
    );

    return NextResponse.json({
      success: true,
      count: recommended.length,
      recommendations: recommended.length > 0 ? recommended : candidatePool.slice(0, limit),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('API /api/recommendations error:', message);
    return NextResponse.json({
      success: true,
      count: SEED_TRACKS.slice(0, 8).length,
      recommendations: SEED_TRACKS.slice(0, 8),
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const title = searchParams.get('title');
    const artist = searchParams.get('artist');
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    const currentTrack: Track | null = (id && title && artist) ? {
      id,
      title,
      artist,
      providerId: id.startsWith('yt-') ? 'youtube' : 'local',
      providerName: 'Tavilo',
      artwork: `https://i.ytimg.com/vi/${id.replace('yt-', '')}/hqdefault.jpg`,
      album: 'Single',
      duration: 210,
      streamUrl: `/api/stream?id=${id.replace('yt-', '')}`,
      playbackCapability: 'playable',
      playbackSource: 'stream',
    } : null;

    const safePrefs = sanitizePreferences(null);
    let candidatePool: Track[] = [];
    try {
      candidatePool = currentTrack
        ? await MusicProviderService.getTailoredCandidates(currentTrack, safePrefs)
        : await MusicProviderService.getTrending(30);
    } catch {
      candidatePool = SEED_TRACKS;
    }

    if (!candidatePool || candidatePool.length === 0) {
      candidatePool = SEED_TRACKS;
    }

    const recommended = RecommendationEngine.generateRecommendationQueue(
      candidatePool,
      safePrefs,
      currentTrack,
      limit
    );

    return NextResponse.json({
      success: true,
      count: recommended.length,
      recommendations: recommended.length > 0 ? recommended : candidatePool.slice(0, limit),
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: true,
      count: SEED_TRACKS.slice(0, 8).length,
      recommendations: SEED_TRACKS.slice(0, 8),
    });
  }
}
