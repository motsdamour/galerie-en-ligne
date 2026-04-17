'use client'

import { useState, useEffect, useRef } from 'react'

type Video = {
  id: number
  name: string
  size: number
  streamUrl: string
  downloadUrl: string
}

type Event = {
  coupleName: string
  eventDate: string
}

export default function GalleryViewer({ slug }: { slug: string }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeVideo, setActiveVideo] = useState<Video | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetch(`/api/gallery/${slug}/videos`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setEvent(data.event)
        setVideos(data.videos)
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [slug])

  const formattedDate = event
    ? new Date(event.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  function openVideo(video: Video) {
    setActiveVideo(video)
  }

  function closeVideo() {
    if (videoRef.current) videoRef.current.pause()
    setActiveVideo(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '1px solid var(--rose)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
        <p style={{ fontSize: '13px', color: 'var(--brown-muted)', fontFamily: 'Arial' }}>Chargement de vos souvenirs…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--brown-muted)', fontFamily: 'Arial' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Nav */}
      <nav style={{ background: 'var(--cream)', borderBottom: '0.5px solid var(--border)', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#c9748a" strokeWidth="0.8" opacity="0.4"/>
            <path d="M24 12 C18 12, 12 17, 12 23 C12 30, 18 35, 24 40 C30 35, 36 30, 36 23 C36 17, 30 12, 24 12Z" fill="#c9748a" opacity="0.12"/>
            <ellipse cx="17" cy="21" rx="4" ry="5" fill="#c9748a" opacity="0.18" transform="rotate(-20 17 21)"/>
            <ellipse cx="31" cy="21" rx="4" ry="5" fill="#c9748a" opacity="0.18" transform="rotate(20 31 21)"/>
          </svg>
          <span style={{ fontSize: '15px', fontStyle: 'italic', color: 'var(--text-dark)' }}>
            Mots <span style={{ color: 'var(--rose)' }}>d'Amour</span>
          </span>
        </div>

        {event && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--brown-muted)', textTransform: 'uppercase', fontFamily: 'Arial', marginBottom: '2px' }}>Galerie privée</p>
            <p style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--text-dark)' }}>{event.coupleName} · {formattedDate}</p>
          </div>
        )}

        <button className="btn-rose" onClick={() => {
          videos.forEach(v => {
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
        <p style={{ fontSize: '10px', letterSpacing: '0.18em', color: 'var(--rose)', textTransform: 'uppercase', fontFamily: 'Arial', marginBottom: '10px' }}>
          {videos.length} souvenir{videos.length > 1 ? 's' : ''} partagé{videos.length > 1 ? 's' : ''} avec amour
        </p>
        <h1 style={{ fontSize: '30px', fontWeight: 400, fontStyle: 'italic', color: 'var(--text-dark)', marginBottom: '6px' }}>
          Vos mots d'amour
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--brown-muted)', fontFamily: 'Arial' }}>
          Cliquez sur une vidéo pour la regarder · Partagez ce lien à tous vos invités
        </p>
        <div className="ornament"><div className="ornament-line"/><div className="ornament-diamond"/><div className="ornament-line"/></div>
      </div>

      {/* Grid */}
      <div style={{ padding: '0 28px 48px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
        {videos.map((video, i) => (
          <VideoCard
            key={video.id}
            video={video}
            index={i}
            onPlay={() => openVideo(video)}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 32px', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--brown-light)', fontFamily: 'Arial', letterSpacing: '0.06em' }}>galerie.mots-damour.fr</span>
        <span style={{ fontSize: '11px', color: 'var(--brown-light)', fontFamily: 'Arial' }}>Accès protégé · Lien valable 12 mois</span>
      </div>

      {/* Lightbox */}
      {activeVideo && (
        <div
          onClick={closeVideo}
          style={{ position: 'fixed', inset: 0, background: 'rgba(44,44,42,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', fontSize: '18px' }}>{activeVideo.name}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a href={activeVideo.downloadUrl} download={activeVideo.name} className="btn-rose" style={{ textDecoration: 'none' }}>
                  Télécharger
                </a>
                <button onClick={closeVideo} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>
                  ×
                </button>
              </div>
            </div>
            <video
              ref={videoRef}
              src={activeVideo.streamUrl}
              controls
              autoPlay
              style={{ width: '100%', borderRadius: '8px', background: '#000' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function VideoCard({ video, index, onPlay }: { video: Video; index: number; onPlay: () => void }) {
  const [hovered, setHovered] = useState(false)
  const bgColors = ['#ede8e0', '#e8ddd4', '#f0e8e0', '#e4dcd4']
  const bg = bgColors[index % bgColors.length]
  const isWide = index === 0

  return (
    <div
      onClick={onPlay}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: isWide ? 'span 2' : 'span 1',
        aspectRatio: isWide ? '16/9' : '9/16',
        background: bg,
        borderRadius: '8px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '10px',
        transition: 'transform 0.15s',
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {/* Play icon */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        border: `1.5px solid rgba(201,116,138,${hovered ? 0.9 : 0.5})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hovered ? 'rgba(201,116,138,0.1)' : 'transparent',
        transition: 'all 0.15s',
      }}>
        <div style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '13px solid #c9748a', marginLeft: '3px', opacity: hovered ? 1 : 0.6 }}/>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--brown-muted)', fontFamily: 'Arial', fontStyle: 'italic' }}>{video.name}</p>

      {/* Overlay au hover */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(250,248,245,0.9)',
          padding: '12px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <button className="btn-rose" onClick={e => { e.stopPropagation(); onPlay() }}>Regarder</button>
          <a
            href={video.downloadUrl}
            download={video.name}
            className="btn-rose"
            style={{ textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            Télécharger
          </a>
        </div>
      )}

      {index === 0 && (
        <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--rose)', color: 'white', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '10px', fontFamily: 'Arial' }}>
          Nouveau
        </div>
      )}
    </div>
  )
}
