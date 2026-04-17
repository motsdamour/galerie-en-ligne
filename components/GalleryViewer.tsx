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

type Event = {
  coupleName: string
  eventDate: string
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
  const [event, setEvent] = useState<Event | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [totalVideos, setTotalVideos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '1px solid var(--rose)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
        <p style={{ fontSize: '13px', color: 'var(--brown-muted)' }}>Chargement de vos souvenirs…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--brown-muted)' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Nav */}
      <nav style={{ background: 'var(--cream)', borderBottom: '0.5px solid var(--border)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 48" fill="none" width="100" height="27">
          <path d="M24 36 C24 36, 8 26, 8 17 C8 11.5, 12.5 8, 17 8 C19.8 8, 22.2 9.4, 24 11.6 C25.8 9.4, 28.2 8, 31 8 C35.5 8, 40 11.5, 40 17 C40 26, 24 36, 24 36Z" fill="#e97872"/>
          <text x="52" y="20" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize="13" fill="#3c3c3b" letterSpacing="0.3">Mots</text>
          <text x="52" y="36" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize="13" fill="#e97872" letterSpacing="0.3">d'Amour</text>
        </svg>

        {event && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--brown-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Galerie privée</p>
            <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-dark)' }}>{event.coupleName} · {formattedDate}</p>
          </div>
        )}

        <button className="btn-rose" onClick={() => {
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
        }}>
          Tout télécharger
        </button>
      </nav>

      {/* Hero */}
      <div style={{ padding: '40px 32px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.18em', color: 'var(--rose)', textTransform: 'uppercase', marginBottom: '10px' }}>
          {totalVideos} souvenir{totalVideos > 1 ? 's' : ''} partagé{totalVideos > 1 ? 's' : ''} avec amour
        </p>
        <h1 style={{ fontSize: '28px', fontWeight: 300, fontStyle: 'italic', color: 'var(--text-dark)', marginBottom: '6px' }}>
          Vos mots d'amour
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--brown-muted)' }}>
          Cliquez sur une vidéo pour la regarder · Partagez ce lien à tous vos invités
        </p>
        <div className="ornament"><div className="ornament-line"/><div className="ornament-diamond"/><div className="ornament-line"/></div>
      </div>

      {/* Tabs */}
      {folders.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 28px 24px' }}>
          {folders.map((folder, i) => (
            <button
              key={folder.folderid}
              onClick={() => setActiveTab(i)}
              style={{
                background: activeTab === i ? 'var(--rose)' : 'transparent',
                color: activeTab === i ? 'white' : 'var(--brown-muted)',
                border: `0.5px solid ${activeTab === i ? 'var(--rose)' : 'var(--border)'}`,
                borderRadius: '20px',
                padding: '7px 20px',
                fontSize: '12px',
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
            <PhotoCard key={item.id} item={item} />
          ) : (
            <VideoCard key={item.id} item={item} />
          )
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 32px', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--brown-light)', letterSpacing: '0.06em' }}>galerie.mots-damour.fr</span>
        <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Accès protégé · Lien valable 12 mois</span>
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
        style={{
          display: 'block',
          marginTop: '8px',
          textAlign: 'center',
          padding: '7px 0',
          border: '0.5px solid var(--rose)',
          borderRadius: '20px',
          color: 'var(--rose)',
          fontSize: '11px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--rose)'; (e.target as HTMLElement).style.color = 'white' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = 'var(--rose)' }}
      >
        Télécharger
      </a>
    </div>
  )
}

function PhotoCard({ item }: { item: MediaFile }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '1/1',
        borderRadius: '10px',
        overflow: 'hidden',
        position: 'relative',
        background: '#f0ece8',
        cursor: 'pointer',
        transition: 'transform 0.15s',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <img
        src={item.streamUrl}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <a
            href={item.downloadUrl}
            download={item.name}
            className="btn-rose"
            style={{ textDecoration: 'none', fontSize: '10px', padding: '6px 16px', background: 'rgba(255,255,255,0.12)', borderColor: 'white', color: 'white' }}
            onClick={e => e.stopPropagation()}
          >
            Télécharger
          </a>
        </div>
      )}
    </div>
  )
}
