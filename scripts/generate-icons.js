const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 512x512 SVG for Master Icon
const masterSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" width="512" height="512">
  <defs>
    <linearGradient id="icon-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141722" />
      <stop offset="100%" stop-color="#07080B" />
    </linearGradient>
    <linearGradient id="icon-green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00E599" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="icon-violet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#7C3AED" />
    </linearGradient>
    <radialGradient id="icon-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00E599" stop-opacity="0.3" />
      <stop offset="60%" stop-color="#8B5CF6" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="128" fill="url(#icon-bg)" />
  <rect x="4" y="4" width="504" height="504" rx="124" stroke="#252B3B" stroke-width="6" />

  <!-- Ambient Glow -->
  <circle cx="256" cy="256" r="210" fill="url(#icon-glow)" />

  <!-- Tavilo T Soundwave Monogram -->
  <!-- Top Bar -->
  <path d="M 120 152 C 120 138 131 128 145 128 L 367 128 C 381 128 392 138 392 152 C 392 166 381 176 367 176 L 145 176 C 131 176 120 166 120 152 Z" fill="url(#icon-green)" />

  <!-- Pulse Waveform Bars -->
  <!-- Left Bar 1 -->
  <rect x="156" y="210" width="28" height="110" rx="14" fill="#8B5CF6" opacity="0.85" />

  <!-- Center Left Bar 2 (Core stem) -->
  <rect x="212" y="194" width="34" height="196" rx="17" fill="url(#icon-green)" />

  <!-- Center Right Bar 3 (Core stem) -->
  <rect x="266" y="194" width="34" height="172" rx="17" fill="url(#icon-green)" />

  <!-- Right Bar 4 -->
  <rect x="328" y="220" width="28" height="124" rx="14" fill="url(#icon-violet)" />

  <!-- Floating Audio Node -->
  <circle cx="256" cy="428" r="18" fill="#00E599" />
</svg>
`;

// Maskable icon with safe zone margin (80% inside safe area)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" width="512" height="512">
  <defs>
    <linearGradient id="mask-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141722" />
      <stop offset="100%" stop-color="#07080B" />
    </linearGradient>
    <linearGradient id="mask-green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00E599" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="mask-violet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#7C3AED" />
    </linearGradient>
  </defs>

  <!-- Full Bleed Background -->
  <rect width="512" height="512" fill="url(#mask-bg)" />

  <!-- Centered Scaled Glyphs (80% scale inside safe zone) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <path d="M 120 152 C 120 138 131 128 145 128 L 367 128 C 381 128 392 138 392 152 C 392 166 381 176 367 176 L 145 176 C 131 176 120 166 120 152 Z" fill="url(#mask-green)" />
    <rect x="156" y="210" width="28" height="110" rx="14" fill="#8B5CF6" opacity="0.85" />
    <rect x="212" y="194" width="34" height="196" rx="17" fill="url(#mask-green)" />
    <rect x="266" y="194" width="34" height="172" rx="17" fill="url(#mask-green)" />
    <rect x="328" y="220" width="28" height="124" rx="14" fill="url(#mask-violet)" />
    <circle cx="256" cy="428" r="18" fill="#00E599" />
  </g>
</svg>
`;

// OG Image: 1200x630
const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" fill="none" width="1200" height="630">
  <defs>
    <linearGradient id="og-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c0e14" />
      <stop offset="50%" stop-color="#07080a" />
      <stop offset="100%" stop-color="#12101a" />
    </linearGradient>
    <linearGradient id="og-green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00E599" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <radialGradient id="og-glow1" cx="20%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#00E599" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="og-glow2" cx="80%" cy="60%" r="50%">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#og-bg)" />
  <circle cx="240" cy="250" r="350" fill="url(#og-glow1)" />
  <circle cx="960" cy="380" r="350" fill="url(#og-glow2)" />

  <!-- Grid overlay -->
  <path d="M 0 100 L 1200 100 M 0 200 L 1200 200 M 0 300 L 1200 300 M 0 400 L 1200 400 M 0 500 L 1200 500" stroke="#1c2130" stroke-width="1" stroke-opacity="0.3" />
  <path d="M 200 0 L 200 630 M 400 0 L 400 630 M 600 0 L 600 630 M 800 0 L 800 630 M 1000 0 L 1000 630" stroke="#1c2130" stroke-width="1" stroke-opacity="0.3" />

  <!-- Logo Emblem -->
  <g transform="translate(140, 165)">
    <rect width="160" height="160" rx="40" fill="#141722" stroke="#282F42" stroke-width="3" />
    
    <path d="M 38 48 C 38 43 42 40 47 40 L 113 40 C 118 40 122 43 122 48 C 122 53 118 56 113 56 L 47 56 C 42 56 38 53 38 48 Z" fill="url(#og-green)" />
    <rect x="49" y="68" width="9" height="34" rx="4.5" fill="#8B5CF6" />
    <rect x="66" y="62" width="11" height="62" rx="5.5" fill="url(#og-green)" />
    <rect x="83" y="62" width="11" height="54" rx="5.5" fill="url(#og-green)" />
    <rect x="102" y="70" width="9" height="38" rx="4.5" fill="#A855F7" />
    <circle cx="80" cy="136" r="5.5" fill="#00E599" />
  </g>

  <!-- Typography -->
  <text x="330" y="240" font-family="'Inter', sans-serif" font-weight="900" font-size="82" letter-spacing="6" fill="#FFFFFF">
    TAVIL<tspan fill="#00E599">O</tspan>
  </text>
  <text x="335" y="285" font-family="'Inter', sans-serif" font-weight="600" font-size="24" letter-spacing="4" fill="#94A3B8">
    YOUR SOUND. YOUR WORLD.
  </text>
  
  <text x="140" y="420" font-family="'Inter', sans-serif" font-weight="400" font-size="28" fill="#CBD5E1">
    Next-generation music discovery, smart autoplay recommendations, and legal streaming.
  </text>
  <text x="140" y="465" font-family="'Inter', sans-serif" font-weight="500" font-size="20" fill="#00E599">
    Progressive Web App • Mobile First • High Fidelity Audio
  </text>

  <!-- Bottom credit -->
  <text x="140" y="550" font-family="'Inter', sans-serif" font-weight="500" font-size="16" letter-spacing="2" fill="#64748B">
    DEVELOPED BY ASH © 2026
  </text>
</svg>
`;

async function main() {
  console.log('Generating raster icons with sharp...');
  
  const masterBuffer = Buffer.from(masterSvg);
  const maskableBuffer = Buffer.from(maskableSvg);
  const ogBuffer = Buffer.from(ogSvg);

  // 1. icon-512.png
  await sharp(masterBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512.png'));
  console.log('Generated icon-512.png');

  // 2. icon-192.png
  await sharp(masterBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192.png'));
  console.log('Generated icon-192.png');

  // 3. icon-maskable-512.png
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-512.png'));
  console.log('Generated icon-maskable-512.png');

  // 4. apple-touch-icon.png (180x180)
  await sharp(masterBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 5. favicon.ico (using 48x48 png)
  await sharp(masterBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon.ico'));
  console.log('Generated favicon.ico');

  // 6. og-image.png (1200x630)
  await sharp(ogBuffer)
    .resize(1200, 630)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'og-image.png'));
  console.log('Generated og-image.png');

  console.log('All branding icons successfully generated!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
