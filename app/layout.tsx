import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "Mots d'Amour — Galerie",
  description: 'Votre galerie vidéo privée',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Mots d'Amour",
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#e97872" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
            })
          }
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          OneSignalDeferred.push(async function(OneSignal) {
            await OneSignal.init({
              appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''}",
              safari_web_id: "web.onesignal.auto.${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''}",
              notifyButton: { enable: false },
              allowLocalhostAsSecureOrigin: true,
            });
          });
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
