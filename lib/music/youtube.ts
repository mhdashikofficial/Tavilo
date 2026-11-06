import { Track } from '@/types/music';
import { isMalayalamTrack } from '@/lib/recommendations/sonicGraph';

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
  const noiseRegex = /[\(\[\{](?:official\s*(?:video|audio|music\s*video|lyric\s*video|visualizer)|lyrics?|hd|4k|audio|remastered|full\s*song|video\s*song|lyrical\s*video|music\s*video)[\)\]\}]/gi;
  const standaloneNoise = /\b(official\s*(?:video|audio|music\s*video|lyric\s*video|visualizer)|video\s*song|lyric\s*video|lyrical\s*video|audio\s*song|full\s*song|visualizer|remastered|4k|hd|lyrics?)\b/gi;

  const text = rawTitle.replace(noiseRegex, ' ').trim();
  let artist = channelName.replace(/\s*-\s*Topic$/i, '').trim();

  // Split on pipe (|), dash (-), bullet (•), or colon (:)
  const rawSegments = text.split(/[\-\|•:]/).map((s) => s.trim()).filter(Boolean);
  const segments = rawSegments
    .map((s) => s.replace(standaloneNoise, ' ').trim())
    .filter((s) => s.length > 0 && !/^(official|video|audio|song|lyrics?)$/i.test(s));

  if (segments.length >= 2) {
    const normChannel = artist.toLowerCase();
    const seg0Norm = segments[0].toLowerCase();

    // Check if segment 0 is the artist (e.g., "The Weeknd - Blinding Lights")
    if (normChannel.includes(seg0Norm) || seg0Norm.includes(normChannel)) {
      return {
        artist: segments[0],
        title: segments[1],
      };
    }

    // Check if channel is record label (Sony Music, Saregama, Think Music, etc.)
    const isLabel = /(music|records|studios|films|company|series|entertainment|digital|production)/i.test(artist);
    if (isLabel) {
      // Find composer or artist in remaining segments
      const composer = segments.slice(1).find((s) =>
        /(shyam|anirudh|rahman|sriram|bejoy|yesudas|pritam|arijit|harris|dsp|keeravani|vijay|sanah|job|sushin)/i.test(s)
      );

      // If segments[0] is movie name and segments[1] is song name, combine nicely or take song name
      let songTitle = segments[0];
      if (segments[1] && segments[1].length < 35 && !segments[1].includes(',')) {
        songTitle = `${segments[0]} - ${segments[1]}`;
      }

      return {
        title: songTitle,
        artist: composer || segments[1] || artist,
      };
    }

    return {
      artist: segments[0],
      title: segments[1],
    };
  }

  return {
    artist: artist || channelName,
    title: segments[0] || text || rawTitle,
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
        const isMalayalam = isMalayalamTrack({ title, artist }) || query.toLowerCase().includes('malayalam');

        tracks.push({
          id: `yt-${videoId}`,
          providerId: 'youtube',
          providerName: 'YouTube Official',
          title,
          artist,
          artists: [artist],
          album: isMalayalam ? 'Malayalam Hits' : 'YouTube Original Release',
          artwork,
          duration,
          streamUrl: videoId, // YouTube video ID used by audio stream pipeline
          playbackCapability: 'playable',
          playbackSource: 'Original Master Audio',
          licenseName: 'YouTube Standard License',
          licenseUrl: 'https://www.youtube.com/t/terms',
          genre: isMalayalam ? 'Malayalam' : 'Music',
          genres: isMalayalam ? ['Malayalam', 'Soundtrack'] : ['Music'],
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
