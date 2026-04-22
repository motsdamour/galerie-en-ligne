import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Galerie en ligne',
  description: 'Votre galerie video privee',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Galerie en ligne',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#2C2C2C" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              registrations.forEach(function(r) { r.unregister() })
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
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
