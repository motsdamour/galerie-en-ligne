'use client'

import { useState, useEffect, useRef } from 'react'

type MediaFile = {
  id: number
  name: string
  size: number
  streamUrl: string
  downloadUrl: string
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
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const playerRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (selectedMedia && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedMedia])

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
        <img src="/logo.svg" alt="Mots d'Amour" style={{ height: '40px', width: 'auto' }} />

        {event && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--brown-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Galerie privée</p>
            <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-dark)' }}>{event.coupleName} · {formattedDate}</p>
          </div>
        )}

        <button className="btn-rose" onClick={() => {
          currentItems.forEach(v => {
            const a = document.createElement('a')
            a.href = v.downloadUrl
            a.download = v.name
            a.click()
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
              onClick={() => { setActiveTab(i); setSelectedMedia(null) }}
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

      {/* Video Player — above grid */}
      {selectedMedia && selectedMedia.type === 'video' && (
        <div ref={playerRef} style={{ margin: '0 28px 20px', background: '#1c1c1c', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '10px 14px', gap: '8px', background: 'rgba(255,255,255,0.06)' }}>
            <a
              href={selectedMedia.downloadUrl}
              download={selectedMedia.name}
              className="btn-rose"
              style={{ textDecoration: 'none', fontSize: '11px' }}
            >
              Télécharger
            </a>
            <button
              onClick={() => setSelectedMedia(null)}
              style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ×
            </button>
          </div>
          <video
            src={selectedMedia.streamUrl}
            controls
            autoPlay
            style={{ width: '100%', display: 'block', maxHeight: '520px', background: '#000' }}
          />
        </div>
      )}

      {/* Grid */}
      <div className="gallery-grid" style={{ padding: '0 28px 48px' }}>
        {currentItems.map((item) =>
          isPhotosTab || item.type === 'image' ? (
            <PhotoCard key={item.id} item={item} />
          ) : (
            <VideoCard
              key={item.id}
              item={item}
              isSelected={selectedMedia?.id === item.id}
              onPlay={() => setSelectedMedia(item)}
            />
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

function VideoCard({ item, isSelected, onPlay }: {
  item: MediaFile
  isSelected: boolean
  onPlay: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '9/16',
        background: '#1c1c1c',
        borderRadius: '10px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.15s',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        outline: isSelected ? '2px solid var(--rose)' : 'none',
      }}
      onClick={onPlay}
    >
      {/* Play button */}
      <div style={{
        width: '50px', height: '50px', borderRadius: '50%',
        border: `1.5px solid rgba(233,120,114,${hovered ? 1 : 0.5})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hovered ? 'rgba(233,120,114,0.15)' : 'transparent',
        transition: 'all 0.15s',
        zIndex: 1,
      }}>
        <div style={{ width: 0, height: 0, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: `14px solid rgba(233,120,114,${hovered ? 1 : 0.6})`, marginLeft: '4px' }}/>
      </div>

      {/* Hover overlay */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          padding: '20px 12px 14px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <button
            className="btn-rose"
            onClick={(e) => { e.stopPropagation(); onPlay() }}
            style={{ fontSize: '10px', padding: '6px 14px' }}
          >
            Regarder
          </button>
          <a
            href={item.downloadUrl}
            download={item.name}
            className="btn-rose"
            style={{ textDecoration: 'none', fontSize: '10px', padding: '6px 14px' }}
            onClick={e => e.stopPropagation()}
          >
            Télécharger
          </a>
        </div>
      )}
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
