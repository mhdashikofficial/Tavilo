import { NextRequest, NextResponse } from 'next/server';
import { MusicProviderService } from '@/lib/music/provider';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get('category') || 'all') as 'malayalam' | 'english' | 'viral' | 'all';
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    const tracks = await MusicProviderService.getTrendingByCategory(category, limit);

    return NextResponse.json({
      success: true,
      category,
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
