import { NextRequest, NextResponse } from 'next/server';
import { MusicProviderService } from '@/lib/music/provider';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mood = searchParams.get('mood') || 'chill';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const tracks = await MusicProviderService.getTracksByMood(mood, limit);

    return NextResponse.json({
      success: true,
      mood,
      count: tracks.length,
      tracks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('API /api/mood error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve mood tracks' },
      { status: 500 }
    );
  }
}
