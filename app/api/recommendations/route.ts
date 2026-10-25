import { NextRequest, NextResponse } from 'next/server';
import { RecommendationEngine } from '@/lib/recommendations/engine';
import { MusicProviderService } from '@/lib/music/provider';
import { SEED_TRACKS } from '@/lib/music/seed';
import { UserPreferences, Track } from '@/types/music';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      currentTrack,
      preferences,
      limit = 8,
      existingQueueIds = [],
    }: {
      currentTrack: Track | null;
      preferences: UserPreferences;
      limit?: number;
      existingQueueIds?: string[];
    } = body;

    const trending = await MusicProviderService.getTrending(30);
    const candidatePool = trending.length > 0 ? trending : SEED_TRACKS;

    const recommended = RecommendationEngine.generateRecommendationQueue(
      candidatePool,
      preferences,
      currentTrack,
      limit,
      existingQueueIds
    );

    return NextResponse.json({
      success: true,
      count: recommended.length,
      recommendations: recommended,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('API /api/recommendations error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
