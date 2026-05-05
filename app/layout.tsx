import type { Metadata, Viewport } from 'next';
import './globals.css';

const BASE = process.env.GITHUB_PAGES === 'true' ? '/Uitdager' : '';

export const metadata: Metadata = {
  title: 'Uitdager',
  description: 'Maandelijkse challenges voor Manon & Melvin',
  manifest: `${BASE}/manifest.json`,
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Uitdager' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f0c29',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href={`${BASE}/icons/icon-192.png`} />
      </head>
      <body className="min-h-screen overflow-hidden">
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('${BASE}/sw.js', { scope: '${BASE}/' }).catch(function() {});
            });
          }
        ` }} />
      </body>
    </html>
  );
}
