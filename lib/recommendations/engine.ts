import { Track, UserPreferences, ListeningHistoryItem } from '@/types/music';
import { getSonicProfileForTrack } from './sonicGraph';

export interface ScoredTrack {
  track: Track;
  score: number;
  reasons: string[];
}

export class RecommendationEngine {
  /**
   * Scores a candidate track based on sonic compatibility, user preferences, and current listening context.
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

    const candidateArtistLower = candidate.artist.toLowerCase();
    const candidateTitleLower = candidate.title.toLowerCase();
    const candidateGenreLower = (candidate.genre || '').toLowerCase();

    // 2. Sonic Compatibility & Harmonic Context (if current track exists)
    if (currentTrack) {
      // Don't recommend the exact same track
      if (candidate.id === currentTrack.id) {
        return { track: candidate, score: -100, reasons: ['Current track'] };
      }

      const currentTitleLower = currentTrack.title.toLowerCase();
      const currentArtistLower = currentTrack.artist.toLowerCase();

      // Duplicate Song Title / Repetitive Remix filter:
      // If candidate has almost identical title to current track (e.g. another "Faded" or "Golden Brown"),
      // penalize so user gets the NEXT song in that vibe, not the same song repeated!
      const currentCleanTitle = currentTitleLower.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      const candidateCleanTitle = candidateTitleLower.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      if (
        currentCleanTitle.length > 3 &&
        (candidateCleanTitle.includes(currentCleanTitle) || currentCleanTitle.includes(candidateCleanTitle))
      ) {
        score -= 8.0;
        reasons.push('Avoid repeating same song title');
      }

      // Sonic Profile Analysis
      const currentProfile = getSonicProfileForTrack(
        currentTrack.title,
        currentTrack.artist,
        currentTrack.genre
      );
      const candidateProfile = getSonicProfileForTrack(
        candidate.title,
        candidate.artist,
        candidate.genre
      );

      // A. Clashing Genre Penalty (Strict filter)
      const isClashing = currentProfile.clashingGenres.some(cg =>
        candidateGenreLower.includes(cg.toLowerCase()) ||
        candidateProfile.primaryGenre.toLowerCase() === cg.toLowerCase()
      );
      if (isClashing) {
        score -= 20.0; // Disqualify clashing genres (e.g. Dubstep after Golden Brown, or Folk after Alan Walker)
        return { track: candidate, score: -20, reasons: ['Sonic clash with current music style'] };
      }

      // B. Genre Compatibility
      const isExactGenre =
        candidateGenreLower === (currentTrack.genre || '').toLowerCase() ||
        candidateProfile.primaryGenre.toLowerCase() === currentProfile.primaryGenre.toLowerCase();

      const isCompatibleGenre = currentProfile.compatibleGenres.some(cg =>
        candidateGenreLower.includes(cg.toLowerCase()) ||
        candidateProfile.compatibleGenres.some(cpg => cpg.toLowerCase() === cg.toLowerCase())
      );

      if (isExactGenre) {
        score += 5.5;
        reasons.push(`Exact genre match (${candidate.genre || currentProfile.primaryGenre})`);
      } else if (isCompatibleGenre) {
        score += 3.5;
        reasons.push(`Compatible sonic family (${candidate.genre || candidateProfile.primaryGenre})`);
      } else {
        // Unrelated genre without being explicitly clashing
        score -= 3.0;
      }

      // C. Acoustic Texture Match (organic vs electronic)
      if (currentProfile.acousticType === candidateProfile.acousticType) {
        score += 3.5;
        reasons.push(`Acoustic texture harmony (${currentProfile.acousticType})`);
      } else if (
        (currentProfile.acousticType === 'organic' && candidateProfile.acousticType === 'electronic') ||
        (currentProfile.acousticType === 'electronic' && candidateProfile.acousticType === 'organic')
      ) {
        score -= 6.0;
        reasons.push('Acoustic texture mismatch');
      }

      // D. Mood Resonance
      if (candidate.moods && currentProfile.compatibleMoods) {
        const overlap = candidate.moods.filter(m =>
          currentProfile.compatibleMoods.some(cm => cm.toLowerCase() === m.toLowerCase())
        );
        if (overlap.length > 0) {
          score += overlap.length * 2.0;
          reasons.push(`Mood harmony: ${overlap.join(', ')}`);
        }
      }

      // E. Artist Proximity & Variety
      if (candidateArtistLower === currentArtistLower) {
        // Mild bonus if user likes this artist, but check if played recently
        const recentSameArtist = recentHistory.slice(0, 3).some(
          h => h.track.artist.toLowerCase() === candidateArtistLower
        );
        if (recentSameArtist) {
          score -= 5.0; // Artist variety dampener
          reasons.push('Artist variety dampener');
        } else {
          score += 1.5;
          reasons.push('Same artist');
        }
      }
    }

    // 3. User Liked Tracks & Affinities
    if (preferences.likedTrackIds.includes(candidate.id)) {
      score += 4.0;
      reasons.push('Liked track');
    }

    const artistPlayCount = preferences.artistPlayCounts[candidateArtistLower] || 0;
    if (preferences.followedArtistNames.some(a => a.toLowerCase() === candidateArtistLower)) {
      score += 3.5;
      reasons.push('Followed artist');
    } else if (artistPlayCount > 0) {
      const affinityBonus = Math.min(3.0, artistPlayCount * 0.5);
      score += affinityBonus;
      reasons.push(`Frequently played artist (${artistPlayCount} plays)`);
    }

    // 4. User Genre Weights
    if (candidate.genre) {
      const weight = preferences.genreWeights[candidateGenreLower] || 0;
      if (weight > 0) {
        const gBonus = Math.min(4.0, weight * 0.8);
        score += gBonus;
        reasons.push(`Preferred genre: ${candidate.genre}`);
      }
    }

    // 5. Recency and Skip Penalties
    const recentIndex = recentHistory.findIndex(h => h.track.id === candidate.id);
    if (recentIndex !== -1) {
      const recencyPenalty = Math.max(2, 10 - recentIndex);
      score -= recencyPenalty;
      reasons.push('Recently played');
    }

    const skippedRecord = preferences.recentlyPlayed.find(
      h => h.track.id === candidate.id && !h.completed && h.listenRatio < 0.25
    );
    if (skippedRecord) {
      score -= 5.0;
      reasons.push('Previously skipped quickly');
    }

    // 6. Tune My Mix Calibration
    const mode = preferences.tuneMixMode || 'balanced';
    const isFamiliar = (
      preferences.likedTrackIds.includes(candidate.id) ||
      (preferences.artistPlayCounts[candidateArtistLower] || 0) > 0 ||
      preferences.followedArtistNames.includes(candidate.artist)
    );

    if (mode === 'familiar') {
      if (isFamiliar) {
        score += 3.5;
        reasons.push('Familiar favorites boost');
      } else {
        score -= 2.0;
      }
    } else if (mode === 'discovery') {
      if (!isFamiliar && recentIndex === -1) {
        score += 4.5;
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
   * Ranks candidate tracks and selects the single next recommended track.
   * Uses weighted sampling across top compatible candidates for variety.
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
      .filter(s => s.score > 2.0) // Require minimum compatibility
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      // Fallback: pick any track with score > 0
      const anyScored = candidates
        .map(track => this.scoreTrack(track, preferences, currentTrack, recentHistory))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);
      return anyScored.length > 0 ? anyScored[0].track : candidates[0];
    }

    // Sample from top 4 highest scoring tracks
    const poolSize = Math.min(4, scored.length);
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
      .filter(s => s.score > 2.0) // Only include genuinely compatible tracks
      .sort((a, b) => b.score - a.score);

    const result: Track[] = [];
    const usedArtists: Set<string> = new Set();

    for (const item of scored) {
      if (result.length >= count) break;
      const art = item.track.artist.toLowerCase();
      // Avoid clustering more than 2 tracks by the same artist
      const countForArtist = result.filter(r => r.artist.toLowerCase() === art).length;
      if (countForArtist < 2) {
        result.push(item.track);
        usedArtists.add(art);
      }
    }

    return result;
  }
}
