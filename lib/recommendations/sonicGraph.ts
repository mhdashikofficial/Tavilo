export type AcousticType = 'organic' | 'hybrid' | 'electronic';

export interface SonicProfile {
  primaryGenre: string;
  acousticType: AcousticType;
  compatibleGenres: string[];
  clashingGenres: string[];
  compatibleMoods: string[];
  searchSeeds: string[];
}

export const GENRE_SONIC_PROFILES: Record<string, SonicProfile> = {
  electronic: {
    primaryGenre: 'Electronic',
    acousticType: 'electronic',
    compatibleGenres: [
      'Electronic',
      'Progressive House',
      'House',
      'Future Bass',
      'Dance',
      'Electro Pop',
      'Synthwave',
      'EDM',
      'Deep House',
      'Melodic Bass',
    ],
    clashingGenres: [
      'Country',
      'Folk',
      'Bluegrass',
      'Blues',
      'Heavy Metal',
      'Classical',
    ],
    compatibleMoods: [
      'Energizing',
      'Empowering',
      'Sentimental',
      'Fiery',
      'Night Drive',
      'Euphoric',
      'Melodic',
    ],
    searchSeeds: [
      'progressive house',
      'melodic edm',
      'future bass',
      'electronic anthem',
      'vocal house',
    ],
  },
  'progressive house': {
    primaryGenre: 'Progressive House',
    acousticType: 'electronic',
    compatibleGenres: ['Progressive House', 'Electronic', 'House', 'Future Bass', 'Dance', 'Deep House', 'Electro Pop'],
    clashingGenres: ['Country', 'Folk', 'Bluegrass', 'Heavy Metal', 'Classical'],
    compatibleMoods: ['Energizing', 'Empowering', 'Sentimental', 'Yearning', 'Fiery', 'Euphoric'],
    searchSeeds: ['progressive house', 'melodic edm', 'future bass', 'vocal house', 'electro house'],
  },
  'future bass': {
    primaryGenre: 'Future Bass',
    acousticType: 'electronic',
    compatibleGenres: ['Future Bass', 'Electronic', 'Progressive House', 'Dance', 'Electro Pop', 'Melodic Bass'],
    clashingGenres: ['Country', 'Folk', 'Classical', 'Heavy Metal'],
    compatibleMoods: ['Sentimental', 'Energizing', 'Empowering', 'Fiery', 'Euphoric'],
    searchSeeds: ['future bass', 'melodic bass', 'melodic edm', 'progressive house'],
  },
  dance: {
    primaryGenre: 'Dance',
    acousticType: 'electronic',
    compatibleGenres: ['Dance', 'Electronic', 'Progressive House', 'House', 'Electro Pop', 'Future Bass'],
    clashingGenres: ['Country', 'Folk', 'Classical', 'Blues', 'Heavy Metal'],
    compatibleMoods: ['Energizing', 'Fiery', 'Empowering', 'Rowdy', 'Upbeat'],
    searchSeeds: ['dance edm', 'club house', 'dance pop', 'electro house'],
  },
  rock: {
    primaryGenre: 'Rock',
    acousticType: 'organic',
    compatibleGenres: [
      'Rock',
      'Alternative',
      'Indie',
      'Psychedelic Rock',
      'Post-Punk',
      'Acoustic',
      'Folk',
      'Classic Rock',
      'New Wave',
      'Baroque Pop',
    ],
    clashingGenres: [
      'Dubstep',
      'Hardstyle',
      'Trance',
      'Trap',
      'Drill',
      'Techno',
    ],
    compatibleMoods: [
      'Rowdy',
      'Empowering',
      'Easygoing',
      'Fiery',
      'Nostalgic',
      'Melancholy',
      'Brooding',
    ],
    searchSeeds: [
      'alternative rock',
      'indie rock',
      'psychedelic rock',
      'classic rock',
      'vintage guitar',
    ],
  },
  alternative: {
    primaryGenre: 'Alternative',
    acousticType: 'hybrid',
    compatibleGenres: ['Alternative', 'Indie', 'Rock', 'Acoustic', 'Folk', 'Dream Pop', 'Lo-Fi', 'Post-Punk'],
    clashingGenres: ['Hardstyle', 'Dubstep', 'EDM', 'Drill', 'Trap'],
    compatibleMoods: ['Melancholy', 'Sophisticated', 'Peaceful', 'Easygoing', 'Brooding', 'Nostalgic'],
    searchSeeds: ['alternative', 'indie', 'indie rock', 'dream pop', 'post punk', 'grunge'],
  },
  indie: {
    primaryGenre: 'Indie',
    acousticType: 'hybrid',
    compatibleGenres: ['Indie', 'Alternative', 'Acoustic', 'Folk', 'Rock', 'Bedroom Pop', 'Dream Pop', 'Lo-Fi'],
    clashingGenres: ['Hardstyle', 'Dubstep', 'Heavy Metal', 'Drill'],
    compatibleMoods: ['Easygoing', 'Peaceful', 'Romantic', 'Melancholy', 'Chill'],
    searchSeeds: ['indie folk', 'indie pop', 'indie rock', 'bedroom pop', 'acoustic indie'],
  },
  acoustic: {
    primaryGenre: 'Acoustic',
    acousticType: 'organic',
    compatibleGenres: ['Acoustic', 'Folk', 'Indie', 'Classical', 'Soul', 'Blues', 'Country', 'Singer-Songwriter'],
    clashingGenres: ['Dubstep', 'Hardstyle', 'Techno', 'Drill', 'Trap', 'EDM'],
    compatibleMoods: ['Peaceful', 'Romantic', 'Gentle', 'Melancholy', 'Easygoing', 'Intimate'],
    searchSeeds: ['acoustic guitar', 'fingerstyle', 'indie folk', 'unplugged', 'singer songwriter'],
  },
  folk: {
    primaryGenre: 'Folk',
    acousticType: 'organic',
    compatibleGenres: ['Folk', 'Acoustic', 'Indie', 'Americana', 'Country', 'Bluegrass', 'Singer-Songwriter'],
    clashingGenres: ['Dubstep', 'Techno', 'Hardstyle', 'Trap', 'EDM', 'Drill'],
    compatibleMoods: ['Peaceful', 'Nostalgic', 'Romantic', 'Easygoing', 'Melancholy'],
    searchSeeds: ['folk', 'indie folk', 'americana', 'acoustic strings', 'traditional folk'],
  },
  'r&b/soul': {
    primaryGenre: 'R&B/Soul',
    acousticType: 'organic',
    compatibleGenres: ['R&B/Soul', 'Soul', 'Jazz', 'Funk', 'Neo-Soul', 'Lo-Fi', 'Blues'],
    clashingGenres: ['Metal', 'Hardstyle', 'Dubstep', 'Drill'],
    compatibleMoods: ['Sensual', 'Romantic', 'Smooth', 'Easygoing', 'Sophisticated'],
    searchSeeds: ['soul', 'r&b', 'neo soul', 'groove', 'vintage soul', 'motown'],
  },
  jazz: {
    primaryGenre: 'Jazz',
    acousticType: 'organic',
    compatibleGenres: ['Jazz', 'Blues', 'R&B/Soul', 'Classical', 'Bossa Nova', 'Lo-Fi'],
    clashingGenres: ['Hardstyle', 'Heavy Metal', 'Dubstep', 'Drill'],
    compatibleMoods: ['Sophisticated', 'Smooth', 'Peaceful', 'Relaxing', 'Intimate'],
    searchSeeds: ['jazz', 'smooth jazz', 'bossa nova', 'piano jazz', 'bebop'],
  },
  classical: {
    primaryGenre: 'Classical',
    acousticType: 'organic',
    compatibleGenres: ['Classical', 'Neoclassical', 'Acoustic', 'Ambient', 'Soundtrack', 'Chamber'],
    clashingGenres: ['Dubstep', 'Hardstyle', 'Trap', 'Drill', 'Heavy Metal', 'EDM'],
    compatibleMoods: ['Peaceful', 'Sophisticated', 'Melancholy', 'Cinematic', 'Meditative'],
    searchSeeds: ['neoclassical', 'piano', 'strings', 'baroque', 'cinematic score'],
  },
  'lo-fi': {
    primaryGenre: 'Lo-Fi',
    acousticType: 'hybrid',
    compatibleGenres: ['Lo-Fi', 'Chillhop', 'Jazz', 'Hip-Hop/Rap', 'Downtempo', 'Ambient'],
    clashingGenres: ['Heavy Metal', 'Hardstyle', 'Dubstep', 'Drill'],
    compatibleMoods: ['Chill', 'Peaceful', 'Focus', 'Nostalgic', 'Mellow'],
    searchSeeds: ['lofi study', 'chillhop', 'jazzhop', 'lofi beats', 'downtempo'],
  },
  ambient: {
    primaryGenre: 'Ambient',
    acousticType: 'hybrid',
    compatibleGenres: ['Ambient', 'Downtempo', 'Lo-Fi', 'Classical', 'Chillout', 'Meditation'],
    clashingGenres: ['Heavy Metal', 'Hardstyle', 'Drill', 'Trap'],
    compatibleMoods: ['Peaceful', 'Dreamy', 'Ethereal', 'Sleep', 'Meditative', 'Focus'],
    searchSeeds: ['ambient soundscape', 'chillout', 'downtempo', 'meditation ambient'],
  },
  'hip-hop/rap': {
    primaryGenre: 'Hip-Hop/Rap',
    acousticType: 'hybrid',
    compatibleGenres: ['Hip-Hop/Rap', 'R&B/Soul', 'Trap', 'Lo-Fi', 'Funk', 'Boom Bap'],
    clashingGenres: ['Country', 'Classical', 'Bluegrass', 'Folk'],
    compatibleMoods: ['Fiery', 'Rowdy', 'Empowering', 'Cool', 'Confident'],
    searchSeeds: ['hip hop', 'rap', 'boom bap', 'underground hip hop', 'conscious rap'],
  },
  pop: {
    primaryGenre: 'Pop',
    acousticType: 'hybrid',
    compatibleGenres: ['Pop', 'Dance', 'Electro Pop', 'Indie Pop', 'R&B/Soul', 'Electronic'],
    clashingGenres: ['Death Metal', 'Grindcore', 'Hardstyle'],
    compatibleMoods: ['Upbeat', 'Romantic', 'Catchy', 'Empowering', 'Fun'],
    searchSeeds: ['pop', 'indie pop', 'synthpop', 'dance pop', 'electro pop'],
  },
};

// Explicit landmark profiles for iconic tracks & artists
export const LANDMARK_TRACK_PROFILES: Record<string, Partial<SonicProfile>> = {
  // Alan Walker & Melodic EDM ecosystem
  'alan walker': {
    primaryGenre: 'Electronic',
    acousticType: 'electronic',
    compatibleGenres: ['Electronic', 'Progressive House', 'Future Bass', 'Dance', 'Electro Pop', 'Deep House', 'Melodic Bass'],
    clashingGenres: ['Country', 'Folk', 'Classical', 'Blues', 'Heavy Metal', 'Bluegrass'],
    compatibleMoods: ['Sentimental', 'Energizing', 'Empowering', 'Emotional', 'Melodic', 'Fiery', 'Euphoric'],
    searchSeeds: ['progressive house', 'melodic edm', 'future bass', 'vocal edm', 'electro house', 'illenium', 'avicii'],
  },
  'faded': {
    primaryGenre: 'Electronic',
    acousticType: 'electronic',
    compatibleGenres: ['Electronic', 'Progressive House', 'Future Bass', 'Dance', 'Electro Pop', 'Deep House', 'Melodic Bass'],
    clashingGenres: ['Country', 'Folk', 'Classical', 'Blues', 'Heavy Metal', 'Bluegrass'],
    compatibleMoods: ['Sentimental', 'Energizing', 'Empowering', 'Emotional', 'Melodic', 'Euphoric'],
    searchSeeds: ['progressive house', 'melodic edm', 'future bass', 'vocal edm', 'alan walker', 'electro house'],
  },
  'alone': {
    primaryGenre: 'Electronic',
    acousticType: 'electronic',
    compatibleGenres: ['Electronic', 'Progressive House', 'Future Bass', 'Dance', 'Electro Pop'],
    clashingGenres: ['Country', 'Folk', 'Classical'],
    compatibleMoods: ['Sentimental', 'Energizing', 'Empowering'],
    searchSeeds: ['melodic edm', 'progressive house', 'future bass', 'alan walker'],
  },
  'spectre': {
    primaryGenre: 'Electronic',
    acousticType: 'electronic',
    compatibleGenres: ['Electronic', 'Progressive House', 'Dance', 'Future Bass'],
    clashingGenres: ['Country', 'Folk', 'Classical'],
    compatibleMoods: ['Energizing', 'Fiery', 'Empowering'],
    searchSeeds: ['progressive house', 'electro house', 'melodic edm'],
  },
  'marshmello': {
    primaryGenre: 'Electronic',
    acousticType: 'electronic',
    compatibleGenres: ['Electronic', 'Future Bass', 'Dance', 'Progressive House', 'Electro Pop'],
    clashingGenres: ['Country', 'Folk', 'Heavy Metal'],
    compatibleMoods: ['Energizing', 'Upbeat', 'Empowering'],
    searchSeeds: ['future bass', 'melodic edm', 'progressive house', 'dance pop'],
  },
  'avicii': {
    primaryGenre: 'Electronic',
    acousticType: 'electronic',
    compatibleGenres: ['Electronic', 'Progressive House', 'Dance', 'Electro Pop'],
    clashingGenres: ['Heavy Metal', 'Hardstyle', 'Classical'],
    compatibleMoods: ['Empowering', 'Nostalgic', 'Euphoric', 'Energizing'],
    searchSeeds: ['progressive house', 'melodic edm', 'vocal house', 'anthem edm'],
  },
  'chainsmokers': {
    primaryGenre: 'Electronic',
    acousticType: 'electronic',
    compatibleGenres: ['Electronic', 'Future Bass', 'Electro Pop', 'Dance', 'Indie Pop'],
    clashingGenres: ['Heavy Metal', 'Country', 'Classical'],
    compatibleMoods: ['Sentimental', 'Romantic', 'Energizing'],
    searchSeeds: ['future bass', 'electro pop', 'melodic edm', 'indie dance'],
  },

  // The Stranglers, Golden Brown & Vintage Alt/Rock ecosystem
  'golden brown': {
    primaryGenre: 'Rock',
    acousticType: 'organic',
    compatibleGenres: ['Rock', 'Alternative', 'Indie', 'Acoustic', 'Folk', 'Psychedelic Rock', 'Baroque Pop', 'New Wave', 'Post-Punk'],
    clashingGenres: ['Dubstep', 'Hardstyle', 'Trap', 'Drill', 'EDM'],
    compatibleMoods: ['Easygoing', 'Melancholy', 'Nostalgic', 'Sophisticated', 'Romantic', 'Peaceful'],
    searchSeeds: ['stranglers', 'psychedelic rock', 'baroque pop', 'indie rock', 'vintage acoustic', 'classic alternative', 'new wave'],
  },
  'stranglers': {
    primaryGenre: 'Rock',
    acousticType: 'organic',
    compatibleGenres: ['Rock', 'Alternative', 'Post-Punk', 'Indie', 'Psychedelic Rock', 'New Wave'],
    clashingGenres: ['Dubstep', 'Trap', 'Hardstyle', 'EDM'],
    compatibleMoods: ['Nostalgic', 'Easygoing', 'Rowdy', 'Sophisticated'],
    searchSeeds: ['post punk', 'new wave', 'psychedelic rock', 'alternative rock', 'classic rock'],
  },
  'doors': {
    primaryGenre: 'Rock',
    acousticType: 'organic',
    compatibleGenres: ['Rock', 'Psychedelic Rock', 'Classic Rock', 'Blues', 'Alternative'],
    clashingGenres: ['Dubstep', 'Trap', 'EDM'],
    compatibleMoods: ['Mystical', 'Brooding', 'Rowdy', 'Nostalgic'],
    searchSeeds: ['psychedelic rock', 'classic rock', 'vintage blues rock'],
  },
  'pink floyd': {
    primaryGenre: 'Rock',
    acousticType: 'organic',
    compatibleGenres: ['Rock', 'Psychedelic Rock', 'Progressive Rock', 'Alternative', 'Ambient'],
    clashingGenres: ['Dubstep', 'Hardstyle', 'Trap'],
    compatibleMoods: ['Ethereal', 'Brooding', 'Sophisticated', 'Melancholy'],
    searchSeeds: ['psychedelic rock', 'progressive rock', 'ambient rock'],
  },
  'radiohead': {
    primaryGenre: 'Alternative',
    acousticType: 'hybrid',
    compatibleGenres: ['Alternative', 'Indie', 'Art Rock', 'Electronic', 'Acoustic'],
    clashingGenres: ['Hardstyle', 'Country', 'Bubblegum Pop'],
    compatibleMoods: ['Melancholy', 'Brooding', 'Sophisticated', 'Ethereal'],
    searchSeeds: ['art rock', 'indie alternative', 'post rock', 'melancholic indie'],
  },
};

/**
 * Returns the sonic profile for a track based on its title, artist, genre, and tags.
 */
export function getSonicProfileForTrack(title: string, artist: string, genre?: string): SonicProfile {
  const tLower = title.toLowerCase();
  const aLower = artist.toLowerCase();
  const gLower = (genre || '').toLowerCase();

  // 1. Check landmark profiles (exact matches on artist or title keywords)
  for (const [key, profile] of Object.entries(LANDMARK_TRACK_PROFILES)) {
    if (tLower.includes(key) || aLower.includes(key)) {
      const baseKey = profile.primaryGenre?.toLowerCase() || 'electronic';
      const base = GENRE_SONIC_PROFILES[baseKey] || GENRE_SONIC_PROFILES.electronic;
      return {
        ...base,
        ...profile,
        searchSeeds: Array.from(new Set([...(profile.searchSeeds || []), ...(base.searchSeeds || [])])),
        compatibleGenres: Array.from(new Set([...(profile.compatibleGenres || []), ...(base.compatibleGenres || [])])),
        clashingGenres: Array.from(new Set([...(profile.clashingGenres || []), ...(base.clashingGenres || [])])),
      } as SonicProfile;
    }
  }

  // 2. Check genre profiles
  for (const [key, profile] of Object.entries(GENRE_SONIC_PROFILES)) {
    if (gLower.includes(key) || tLower.includes(key) || aLower.includes(key)) {
      return profile;
    }
  }

  // 3. Fallback based on electronic vs acoustic keyword hints
  if (tLower.includes('remix') || tLower.includes('club') || tLower.includes('edm') || tLower.includes('mix')) {
    return GENRE_SONIC_PROFILES.electronic;
  }
  if (tLower.includes('acoustic') || tLower.includes('piano') || tLower.includes('guitar') || tLower.includes('folk')) {
    return GENRE_SONIC_PROFILES.acoustic;
  }

  return GENRE_SONIC_PROFILES.alternative;
}
