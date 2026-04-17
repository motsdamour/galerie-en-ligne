import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Mots d'Amour — Galerie",
  description: 'Votre galerie vidéo privée',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
