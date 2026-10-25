import { NextRequest, NextResponse } from 'next/server';
import { MusicProviderService } from '@/lib/music/provider';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '24', 10);

    const tracks = await MusicProviderService.getTrending(limit);

    return NextResponse.json({
      success: true,
      count: tracks.length,
      tracks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('API /api/trending error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve trending music' },
      { status: 500 }
    );
  }
}
