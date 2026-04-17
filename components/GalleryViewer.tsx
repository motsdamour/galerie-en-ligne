'use client'

import { useState, useEffect } from 'react'

type MediaFile = {
  id: number
  name: string
  size: number
  streamUrl: string
  downloadUrl: string
  thumbUrl?: string
  type: 'video' | 'image'
}

type Folder = {
  name: string
  folderid: number
  videos: MediaFile[]
}

type GalleryEvent = {
  coupleName: string
  eventDate: string
}

type Theme = {
  bg: string
  text: string
  card: string
  border: string
  muted: string
  subtle: string
}

const LIGHT: Theme = {
  bg: '#ffffff',
  text: '#3c3c3b',
  card: '#f5f5f5',
  border: '#e8e0d8',
  muted: '#888780',
  subtle: '#b4b2a9',
}

const DARK: Theme = {
  bg: '#1a1a1a',
  text: '#f0f0f0',
  card: '#2a2a2a',
  border: '#333333',
  muted: '#aaaaaa',
  subtle: '#666666',
}

const DL_BTN: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '8px',
  padding: '8px 16px',
  background: '#e97872',
  color: 'white',
  border: 'none',
  borderRadius: '20px',
  fontFamily: "'Poppins', sans-serif",
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textAlign: 'center',
  textDecoration: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
}

function tabLabel(name: string): string {
  const map: Record<string, string> = {
    "photobooth": "Photos",
    "livre d'or": "Livre d'or",
    "boite a questions": "Boîte à questions",
    "boite à questions": "Boîte à questions",
    "boîte à questions": "Boîte à questions",
  }
  const normalized = name.toLowerCase()
  const key = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return map[normalized] ?? map[key] ?? name.charAt(0).toUpperCase() + name.slice(1)
}

export default function GalleryViewer({ slug }: { slug: string }) {
  const [event, setEvent] = useState<GalleryEvent | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [totalVideos, setTotalVideos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [dark, setDark] = useState(false)

  const t = dark ? DARK : LIGHT

  useEffect(() => {
    fetch(`/api/gallery/${slug}/videos`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setEvent(data.event)
        setFolders(data.folders ?? [])
        setTotalVideos(data.totalVideos ?? 0)
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [slug])

  const formattedDate = event
    ? new Date(event.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const currentFolder = folders[activeTab]
  const currentItems = currentFolder?.videos ?? []
  const isPhotosTab = currentFolder ? tabLabel(currentFolder.name) === 'Photos' : false

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '1px solid #e97872', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
        <p style={{ fontSize: '13px', color: '#888780', fontFamily: 'Poppins, sans-serif' }}>Chargement de vos souvenirs…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <p style={{ color: '#888780', fontFamily: 'Poppins, sans-serif' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, transition: 'background 0.2s, color 0.2s' }}>

      {/* Nav */}
      <nav style={{ background: t.bg, borderBottom: `0.5px solid ${t.border}`, padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s' }}>
        {/* Logo inline SVG — texte change selon le mode */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 48" fill="none" width="100" height="27">
          <path d="M24 36 C24 36, 8 26, 8 17 C8 11.5, 12.5 8, 17 8 C19.8 8, 22.2 9.4, 24 11.6 C25.8 9.4, 28.2 8, 31 8 C35.5 8, 40 11.5, 40 17 C40 26, 24 36, 24 36Z" fill="#e97872"/>
          <text x="52" y="20" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize="13" fill={t.text} letterSpacing="0.3">Mots</text>
          <text x="52" y="36" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize="13" fill="#e97872" letterSpacing="0.3">d'Amour</text>
        </svg>

        {event && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: t.muted, textTransform: 'uppercase', marginBottom: '2px' }}>Galerie privée</p>
            <p style={{ fontSize: '13px', fontStyle: 'italic', color: t.text }}>{event.coupleName} · {formattedDate}</p>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Toggle dark/light */}
          <button
            onClick={() => setDark(d => !d)}
            title={dark ? 'Mode clair' : 'Mode sombre'}
            style={{
              background: 'transparent',
              border: `0.5px solid ${t.border}`,
              borderRadius: '50%',
              width: '32px', height: '32px',
              cursor: 'pointer',
              fontSize: '15px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.2s',
            }}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {/* Tout télécharger */}
          <button
            style={{
              background: 'transparent',
              border: `0.5px solid #e97872`,
              color: '#e97872',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '11px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'Poppins', sans-serif",
            }}
            onClick={() => {
              currentItems.forEach((video, i) => {
                setTimeout(() => {
                  const a = document.createElement('a')
                  a.href = `/api/proxy/${video.id}?download=1&filename=${encodeURIComponent(video.name)}`
                  a.download = video.name
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                }, i * 300)
              })
            }}
          >
            Tout télécharger
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '40px 32px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.18em', color: '#e97872', textTransform: 'uppercase', marginBottom: '10px' }}>
          {totalVideos} souvenir{totalVideos > 1 ? 's' : ''} partagé{totalVideos > 1 ? 's' : ''} avec amour
        </p>
        <h1 style={{ fontSize: '28px', fontWeight: 300, fontStyle: 'italic', color: t.text, marginBottom: '6px' }}>
          Vos mots d'amour
        </h1>
        <p style={{ fontSize: '12px', color: t.muted }}>
          Regardez et téléchargez vos souvenirs · Partagez ce lien à tous vos invités
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ width: '40px', height: '0.5px', background: '#e97872', opacity: 0.4 }}/>
          <div style={{ width: '5px', height: '5px', background: '#e97872', transform: 'rotate(45deg)', opacity: 0.5 }}/>
          <div style={{ width: '40px', height: '0.5px', background: '#e97872', opacity: 0.4 }}/>
        </div>
      </div>

      {/* Tabs */}
      {folders.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 28px 24px' }}>
          {folders.map((folder, i) => (
            <button
              key={folder.folderid}
              onClick={() => setActiveTab(i)}
              style={{
                background: activeTab === i ? '#e97872' : 'transparent',
                color: activeTab === i ? 'white' : t.muted,
                border: `0.5px solid ${activeTab === i ? '#e97872' : t.border}`,
                borderRadius: '20px',
                padding: '7px 20px',
                fontSize: '12px',
                fontFamily: "'Poppins', sans-serif",
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
            >
              {tabLabel(folder.name)}
              <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '10px' }}>({folder.videos.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="gallery-grid" style={{ padding: '0 28px 48px' }}>
        {currentItems.map((item) =>
          isPhotosTab || item.type === 'image' ? (
            <PhotoCard key={item.id} item={item} cardBg={t.card} />
          ) : (
            <VideoCard key={item.id} item={item} />
          )
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 32px', borderTop: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: t.subtle, letterSpacing: '0.06em' }}>galerie.mots-damour.fr</span>
        <span style={{ fontSize: '11px', color: t.subtle }}>Accès protégé · Lien valable 12 mois</span>
      </div>
    </div>
  )
}

function VideoCard({ item }: { item: MediaFile }) {
  return (
    <div>
      <video
        src={`/api/proxy/${item.id}`}
        controls
        preload="metadata"
        style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover', borderRadius: '10px', display: 'block' }}
      />
      <a
        href={`/api/proxy/${item.id}?download=1&filename=${encodeURIComponent(item.name)}`}
        download={item.name}
        style={DL_BTN}
      >
        Télécharger
      </a>
    </div>
  )
}

function PhotoCard({ item, cardBg }: { item: MediaFile; cardBg: string }) {
  return (
    <div>
      <div style={{ background: cardBg, borderRadius: '10px', overflow: 'hidden', lineHeight: 0 }}>
        <img
          src={item.streamUrl}
          alt=""
          style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }}
        />
      </div>
      <a
        href={`/api/proxy/${item.id}?download=1&filename=${encodeURIComponent(item.name)}`}
        download={item.name}
        style={DL_BTN}
      >
        Télécharger
      </a>
    </div>
  )
}
