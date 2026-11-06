import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LibraryProvider } from '@/lib/library/LibraryContext';
import { PlaybackProvider } from '@/lib/playback/PlaybackContext';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://tavilo.app'),
  title: 'Tavilo — Your sound. Your world.',
  description: 'Next-generation music discovery, smart autoplay recommendations, and legal streaming.',
  applicationName: 'Tavilo',
  authors: [{ name: 'Ash' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tavilo',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Tavilo',
    title: 'Tavilo — Your sound. Your world.',
    description: 'Next-generation music discovery, smart autoplay recommendations, and legal streaming.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Tavilo — Your sound. Your world.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tavilo — Your sound. Your world.',
    description: 'Next-generation music discovery, smart autoplay recommendations, and legal streaming.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#07080a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Anti-Pause & Background Play Fix: Overrides Page Visibility API so embedded players never pause when minimized */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Intercept visibilitychange in capture phase to suppress background pause triggers
                  window.addEventListener('visibilitychange', function(e) {
                    if (document.visibilityState === 'hidden') {
                      e.stopImmediatePropagation();
                    }
                  }, true);
                  document.addEventListener('visibilitychange', function(e) {
                    if (document.visibilityState === 'hidden') {
                      e.stopImmediatePropagation();
                    }
                  }, true);

                  // Intercept window blur in capture phase
                  window.addEventListener('blur', function(e) {
                    e.stopImmediatePropagation();
                  }, true);

                  // Override Page Visibility API properties to report always visible
                  Object.defineProperties(document, {
                    hidden: { get: function() { return false; }, configurable: true },
                    visibilityState: { get: function() { return 'visible'; }, configurable: true },
                    webkitHidden: { get: function() { return false; }, configurable: true },
                    webkitVisibilityState: { get: function() { return 'visible'; }, configurable: true }
                  });
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-tavilo-bg text-tavilo-text-primary selection:bg-tavilo-green selection:text-black">
        <LibraryProvider>
          <PlaybackProvider>
            <AppShell>{children}</AppShell>
          </PlaybackProvider>
        </LibraryProvider>
      </body>
    </html>
  );
}
