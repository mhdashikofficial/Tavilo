# TAVILO — Your sound. Your world.

> **Developer Credit:** Tavilo — Developed by Ash © 2026

Tavilo is a modern, responsive, mobile-first Progressive Web App (PWA) inspired by the polished user experience of leading music streaming platforms, featuring its own original brand identity, flowing soundwave logo, metadata-driven recommendation engine, and legitimate open music catalog integrations.

---

## 🌟 Key Features

### 1. Original Brand Identity & Design System
- **Deep Charcoal Obsidian Palette:** `#07080a` background with `#101319` and `#161922` elevated cards.
- **Electric Mint Green Accent:** `#00e599` primary highlight with neon glow.
- **Cyber Violet Highlights:** `#9353d3` / `#a855f7` for tags, badges, and gradient accents.
- **Original Vector Glyph Logo:** Harmonic waveform monogram 'T' symbolizing acoustic resonance and rhythmic pulse (`public/logo.svg`, `public/favicon.svg`, icons generated up to 512×512 maskable).

### 2. Universal Mobile-First & Desktop Layout
- **Mobile Navigation:** Fixed 4-tab bottom navigation (Home, Search, Library, Profile) with iOS safe-area support (`env(safe-area-inset-bottom)`) and minimum 44×44px touch targets.
- **Persistent Mini-Player:** Floats immediately above mobile navigation and stays pinned across page transitions without interrupting playback.
- **Full-Screen Player:** Rich album artwork, ambient back-glow, real-time audio visualizer pulse, seek slider with elapsed/remaining timers, volume control, like/dislike buttons, and native share.
- **Desktop Sidebar:** Multi-column layout with collapsible navigation, quick playlist links, and playback status.

### 3. Taste-Based Autoplay & Recommendations ("Tune My Mix")
- **Continuous Listening:** When a track finishes, Tavilo dynamically extends the queue using a transparent recommendation algorithm.
- **Preference Signals:**
  - Liked tracks (`+4.0`)
  - Disliked tracks (`-100` / excluded)
  - Followed artists (`+3.5`)
  - Frequently played artists (`+1.5` to `+3.0`)
  - Preferred genres and mood alignment (`+2.5`)
  - Recency penalty (dampens recently played songs in the last 15 tracks)
  - Artist fatigue dampener (prevents playing the same artist repeatedly)
  - Quick skip penalty (tracks skipped under 15 seconds)
- **Tune My Mix Modes:**
  - **Familiar Favorites:** 70% familiar tracks / liked artists.
  - **Balanced Flow:** 50% familiar / 50% new discoveries.
  - **New Discoveries:** 80% fresh, unplayed songs and indie artists.
- **Full Privacy Control:** Clear listening history, reset recommendation profile, and exclude specific tracks or artists at any time.

### 4. Real Music Catalog & Unified Music Provider
- **Audius Open Network:** Real-time search and trending tracks across millions of decentralized indie and electronic songs with direct audio streams and 1000×1000 artwork. Zero configuration required out of the box.
- **Jamendo API Adapter:** Support for Creative Commons licensed catalog with configurable `JAMENDO_CLIENT_ID`.
- **Curated Open Audio Seed:** High-fidelity CC BY 4.0 audio spanning every core mood (Chill, Focus, Workout, Sleep, Night Drive, Romantic, Energetic, Acoustic, Electronic, Instrumental).
- **Legitimate Streaming:** No stream-ripping or unauthorized downloads. All playback respects source licensing and attribution.

### 5. Media Session API Integration
- System lockscreen controls, notification controls, and Bluetooth metadata (`navigator.mediaSession`) for iOS and Android.
- Title, artist, album name, and high-resolution artwork sync automatically.

### 6. Progressive Web App (PWA)
- **Web App Manifest:** Standalone display mode, portrait orientation, theme color, shortcuts, and maskable icons.
- **Service Worker (`sw.js`):** Versioned cache for app shell, offline fallback page (`/offline`), and intelligent bypassing for streaming audio pipelines.
- **Android Support:** Automatic `beforeinstallprompt` capture and custom one-click install button.
- **iOS Guidance:** 4-step "Add to Home Screen" instructions card for Safari with persistent dismissal options.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Audio Pipeline:** HTML5 Media API + Web Audio API + Media Session API
- **Image Processing:** Sharp (icon & OG generation)
- **Deployment:** Vercel

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18.17+ or v20+
- npm v9+

### Installation

```bash
# Clone or navigate to the repository
cd Tavilo

# Install dependencies
npm install

# (Optional) Generate branding raster icons from SVG
node scripts/generate-icons.js

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

Configure `.env.local` as needed:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Application base URL | `http://localhost:3000` |
| `AUDIUS_APP_NAME` | Audius Client App Name | `TAVILO` |
| `JAMENDO_CLIENT_ID` | Optional Jamendo Developer Client ID | `""` |
| `YOUTUBE_API_KEY` | Optional YouTube Data API Key | `""` |
| `DATABASE_URL` | Optional PostgreSQL / hosted database connection | `""` |

---

## 🚢 Deploying on Vercel

Tavilo is optimized for immediate zero-configuration deployment on Vercel:

1. Push your repository to GitHub.
2. In the Vercel Dashboard, click **Add New Project** and select the repository.
3. Keep default build settings (`next build`).
4. (Optional) Set `JAMENDO_CLIENT_ID` in Environment Variables if you have one.
5. Click **Deploy**.

---

## 📄 License & Attribution

- **Application Concept & Code:** Developed by Ash © 2026.
- **Music Audio Streams:** Audius Network, Jamendo Music, FreeSound Creative Commons Archive (CC BY 4.0 / CC0).
- **Artwork Photography:** Unsplash (Free to use under the Unsplash License).
