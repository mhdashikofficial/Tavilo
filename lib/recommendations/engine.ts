import { Track, UserPreferences, TuneMixMode, ListeningHistoryItem } from '@/types/music';

export interface ScoredTrack {
  track: Track;
  score: number;
  reasons: string[];
}

export class RecommendationEngine {
  /**
   * Scores a candidate track based on user preferences and current listening context.
   */
  public static scoreTrack(
    candidate: Track,
    preferences: UserPreferences,
    currentTrack: Track | null,
    recentHistory: ListeningHistoryItem[] = []
  ): ScoredTrack {
    const reasons: string[] = [];
    let score = 5.0; // base score

    // 1. Exclusions (Hard filters)
    if (preferences.excludedTrackIds.includes(candidate.id)) {
      return { track: candidate, score: -100, reasons: ['Excluded track'] };
    }
    if (preferences.dislikedTrackIds.includes(candidate.id)) {
      return { track: candidate, score: -100, reasons: ['Disliked track'] };
    }
    if (preferences.excludedArtistNames.some(a => a.toLowerCase() === candidate.artist.toLowerCase())) {
      return { track: candidate, score: -100, reasons: ['Excluded artist'] };
    }

    // 2. Liked Tracks
    if (preferences.likedTrackIds.includes(candidate.id)) {
      score += 4.0;
      reasons.push('Liked track');
    }

    // 3. Artist Affinity
    const candidateArtistLower = candidate.artist.toLowerCase();
    const artistPlayCount = preferences.artistPlayCounts[candidateArtistLower] || 0;
    if (preferences.followedArtistNames.some(a => a.toLowerCase() === candidateArtistLower)) {
      score += 3.5;
      reasons.push('Followed artist');
    } else if (artistPlayCount > 0) {
      const affinityBonus = Math.min(3.0, artistPlayCount * 0.5);
      score += affinityBonus;
      reasons.push(`Frequently played artist (${artistPlayCount} plays)`);
    }

    // 4. Current Track Similarity (Continuity)
    if (currentTrack) {
      // Don't recommend the exact same track
      if (candidate.id === currentTrack.id) {
        return { track: candidate, score: -100, reasons: ['Current track'] };
      }

      // Same genre
      if (candidate.genre && currentTrack.genre && candidate.genre.toLowerCase() === currentTrack.genre.toLowerCase()) {
        score += 2.5;
        reasons.push(`Matches current genre (${candidate.genre})`);
      }

      // Overlapping moods
      if (candidate.moods && currentTrack.moods) {
        const overlap = candidate.moods.filter(m => currentTrack.moods?.includes(m));
        if (overlap.length > 0) {
          score += overlap.length * 1.5;
          reasons.push(`Shared mood: ${overlap.join(', ')}`);
        }
      }

      // Same artist continuity bonus (mild)
      if (candidate.artist.toLowerCase() === currentTrack.artist.toLowerCase()) {
        score += 1.0;
        reasons.push('Same artist');
      }
    }

    // 5. User Genre Weights
    if (candidate.genre) {
      const gLower = candidate.genre.toLowerCase();
      const weight = preferences.genreWeights[gLower] || 0;
      if (weight > 0) {
        const gBonus = Math.min(4.0, weight * 0.8);
        score += gBonus;
        reasons.push(`Preferred genre: ${candidate.genre}`);
      }
    }

    // 6. Recency and Repetition Penalties
    // Check if played recently in the last 15 tracks
    const recentIndex = recentHistory.findIndex(h => h.track.id === candidate.id);
    if (recentIndex !== -1) {
      // Very recently played (top of history) gets heavy penalty
      const recencyPenalty = Math.max(1, 10 - recentIndex);
      score -= recencyPenalty;
      reasons.push('Recently played');
    }

    // Check if artist was played in the last 3 tracks (artist fatigue)
    const recentArtistPlays = recentHistory.slice(0, 3).filter(
      h => h.track.artist.toLowerCase() === candidateArtistLower
    ).length;
    if (recentArtistPlays > 0) {
      score -= recentArtistPlays * 3.0;
      reasons.push('Artist variety dampener');
    }

    // 7. Skip history penalty
    const skippedRecord = preferences.recentlyPlayed.find(
      h => h.track.id === candidate.id && !h.completed && h.listenRatio < 0.25
    );
    if (skippedRecord) {
      score -= 4.0;
      reasons.push('Previously skipped quickly');
    }

    // 8. Tune My Mix Modulation
    const mode = preferences.tuneMixMode || 'balanced';
    const isFamiliar = (
      preferences.likedTrackIds.includes(candidate.id) ||
      (preferences.artistPlayCounts[candidateArtistLower] || 0) > 0 ||
      preferences.followedArtistNames.includes(candidate.artist)
    );

    if (mode === 'familiar') {
      if (isFamiliar) {
        score += 3.0;
        reasons.push('Familiar favorites boost');
      } else {
        score -= 1.5;
      }
    } else if (mode === 'discovery') {
      if (!isFamiliar && recentIndex === -1) {
        score += 4.0;
        reasons.push('New discovery boost');
      } else if (isFamiliar) {
        score -= 2.0;
        reasons.push('Discovery freshness penalty');
      }
    }

    return {
      track: candidate,
      score: Math.max(0.1, score),
      reasons,
    };
  }

  /**
   * Ranks candidate tracks and selects the next recommended track.
   * Uses weighted pseudo-random selection among the top candidates to ensure variety.
   */
  public static selectNextTrack(
    candidates: Track[],
    preferences: UserPreferences,
    currentTrack: Track | null,
    recentHistory: ListeningHistoryItem[] = []
  ): Track | null {
    if (!candidates || candidates.length === 0) return null;

    const scored = candidates
      .map(track => this.scoreTrack(track, preferences, currentTrack, recentHistory))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    // Pick from top 5 with weighted probability for serendipity
    const poolSize = Math.min(5, scored.length);
    const topPool = scored.slice(0, poolSize);
    const totalWeight = topPool.reduce((acc, curr) => acc + curr.score, 0);

    let randomVal = Math.random() * totalWeight;
    for (const item of topPool) {
      randomVal -= item.score;
      if (randomVal <= 0) {
        return item.track;
      }
    }

    return topPool[0].track;
  }

  /**
   * Generates a recommended queue batch of tracks.
   */
  public static generateRecommendationQueue(
    candidates: Track[],
    preferences: UserPreferences,
    currentTrack: Track | null,
    count: number = 8,
    existingQueueIds: string[] = []
  ): Track[] {
    const available = candidates.filter(
      c => !existingQueueIds.includes(c.id) && (currentTrack ? c.id !== currentTrack.id : true)
    );

    const scored = available
      .map(track => this.scoreTrack(track, preferences, currentTrack, preferences.recentlyPlayed))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    const result: Track[] = [];
    const usedArtists: Set<string> = new Set();

    for (const item of scored) {
      if (result.length >= count) break;
      const art = item.track.artist.toLowerCase();
      // Avoid clustering more than 2 tracks by the same artist in the recommended queue
      const countForArtist = result.filter(r => r.artist.toLowerCase() === art).length;
      if (countForArtist < 2) {
        result.push(item.track);
        usedArtists.add(art);
      }
    }

    return result;
  }
}
