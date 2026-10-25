import { NextRequest, NextResponse } from 'next/server';
import { MusicProviderService } from '@/lib/music/provider';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        tracks: [],
        artists: [],
        albums: [],
        playlists: [],
      });
    }

    const results = await MusicProviderService.search(query, limit);

    return NextResponse.json({
      success: true,
      query,
      ...results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('API /api/search error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to search music catalog' },
      { status: 500 }
    );
  }
}
