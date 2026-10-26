import { Track } from '@/types/music';

function parseDuration(durationStr?: string): number {
  if (!durationStr) return 210;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 210;
}

function cleanTitleAndArtist(rawTitle: string, channelName: string): { artist: string; title: string } {
  let artist = channelName.replace(/\s*-\s*Topic$/i, '').trim();
  let title = rawTitle;

  if (rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  title = title
    .replace(/[\(\[\{](?:official\s*(?:video|audio|music\s*video|lyric\s*video|visualizer)|lyrics?|hd|4k|audio|remastered)[\)\]\}]/gi, '')
    .trim();

  return {
    artist: artist || channelName,
    title: title || rawTitle,
  };
}

export async function searchYouTube(query: string, limit: number = 20): Promise<Track[]> {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn('YouTube search response status:', res.status);
      return [];
    }

    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const sectionList =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!sectionList || !Array.isArray(sectionList)) return [];

    const tracks: Track[] = [];

    for (const section of sectionList) {
      const itemSectionContents = section.itemSectionRenderer?.contents;
      if (!Array.isArray(itemSectionContents)) continue;

      for (const item of itemSectionContents) {
        if (!item.videoRenderer) continue;
        const vr = item.videoRenderer;
        const videoId = vr.videoId;
        if (!videoId) continue;

        const rawTitle = vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'Untitled Track';
        const channel = vr.ownerText?.runs?.[0]?.text || 'YouTube Artist';
        const durationStr = vr.lengthText?.simpleText;
        const duration = parseDuration(durationStr);

        // Skip 1-hour/compilation videos if user is looking for songs (unless long duration requested)
        if (duration > 1200) continue;

        const { artist, title } = cleanTitleAndArtist(rawTitle, channel);
        const artwork = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        tracks.push({
          id: `yt-${videoId}`,
          providerId: 'youtube',
          providerName: 'YouTube Music',
          title,
          artist,
          artists: [artist],
          album: 'YouTube Release',
          artwork,
          duration,
          streamUrl: videoId, // YouTube video ID used by YouTube IFrame Player
          playbackCapability: 'playable',
          playbackSource: 'YouTube Official Embedded Player',
          licenseName: 'YouTube Standard License',
          licenseUrl: 'https://www.youtube.com/t/terms',
          genre: 'Music',
        });

        if (tracks.length >= limit) break;
      }
      if (tracks.length >= limit) break;
    }

    return tracks;
  } catch (err) {
    console.error('YouTube search error:', err);
    return [];
  }
}
