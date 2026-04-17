'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import JSZip from 'jszip'

type MediaFile = {
  id: number
  name: string
  size: number
  streamUrl: string
  downloadUrl: string
  thumbUrl?: string
  hidden?: boolean
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
  expiresAt?: string
}

type Theme = {
  bg: string
  text: string
  card: string
  border: string
  muted: string
  subtle: string
}

const LIGHT: Theme = { bg: '#ffffff', text: '#3c3c3b', card: '#f5f5f5', border: '#e8e0d8', muted: '#888780', subtle: '#b4b2a9' }
const DARK: Theme  = { bg: '#1a1a1a', text: '#f0f0f0', card: '#2a2a2a', border: '#333333', muted: '#aaaaaa', subtle: '#666666' }

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

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function buildZip(
  files: MediaFile[],
  zipName: string,
  onProgress: (done: number, total: number) => void
) {
  const zip = new JSZip()
  let done = 0
  await Promise.all(files.map(async (f) => {
    const res = await fetch(`/api/proxy/${f.id}?filename=${encodeURIComponent(f.name)}`)
    const blob = await res.blob()
    const ext = /\.[a-z0-9]+$/i.test(f.name) ? '' : (f.type === 'image' ? '.jpg' : '.mp4')
    zip.file(`${f.name}${ext}`, blob)
    onProgress(++done, files.length)
  }))
  const content = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(content)
  a.download = zipName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

export default function GalleryViewer({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const editToken = searchParams.get('edit_token')

  const [event, setEvent] = useState<GalleryEvent | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [totalVideos, setTotalVideos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditor, setIsEditor] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState(0)
  const [dark, setDark] = useState(false)
  const [navDropOpen, setNavDropOpen] = useState(false)
  const [zipKey, setZipKey] = useState<string | null>(null)
  const [zipProgress, setZipProgress] = useState({ done: 0, total: 0 })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const navDropRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  const t = dark ? DARK : LIGHT

  useEffect(() => {
    const url = editToken
      ? `/api/gallery/${slug}/videos?edit_token=${editToken}`
      : `/api/gallery/${slug}/videos`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setEvent(data.event)
        setFolders(data.folders ?? [])
        setTotalVideos(data.totalVideos ?? 0)
        if (data.isEditor) setIsEditor(true)
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [slug, editToken])

  async function hideFile(fileId: number) {
    const res = await fetch(`/api/gallery/${slug}/hide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, edit_token: editToken }),
    })
    if (res.ok) {
      setHiddenIds(prev => new Set([...prev, fileId]))
      setTotalVideos(n => n - 1)
    }
  }

  async function unhideFile(fileId: number) {
    const res = await fetch(`/api/gallery/${slug}/unhide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, edit_token: editToken }),
    })
    if (res.ok) {
      setHiddenIds(prev => { const s = new Set(prev); s.delete(fileId); return s })
      setTotalVideos(n => n + 1)
    }
  }

  useEffect(() => {
    if (!navDropOpen) return
    function h(e: MouseEvent) {
      if (navDropRef.current && !navDropRef.current.contains(e.target as Node)) setNavDropOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [navDropOpen])

  const currentFolder = folders[activeTab]
  const currentItems = currentFolder?.videos ?? []
  const isPhotosTab = currentFolder ? tabLabel(currentFolder.name) === 'Photos' : false
  const photoItems = currentItems.filter(item => isPhotosTab || item.type === 'image')

  useEffect(() => {
    if (lightboxIndex === null) return
    function h(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIndex(null)
      else if (e.key === 'ArrowLeft') setLightboxIndex(i => i !== null ? (i - 1 + photoItems.length) % photoItems.length : null)
      else if (e.key === 'ArrowRight') setLightboxIndex(i => i !== null ? (i + 1) % photoItems.length : null)
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [lightboxIndex, photoItems.length])

  const formattedDate = event
    ? new Date(event.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const coupleName = event ? slugify(event.coupleName) : 'galerie'

  function findFolder(label: string) {
    return folders.find(f => tabLabel(f.name) === label)
  }

  async function handleZip(key: string, files: MediaFile[], zipName: string) {
    if (zipKey) return
    setNavDropOpen(false)
    setZipKey(key)
    setZipProgress({ done: 0, total: files.length })
    try {
      await buildZip(files, zipName, (done, total) => setZipProgress({ done, total }))
    } finally {
      setZipKey(null)
    }
  }

  const allFiles = folders.flatMap(f => f.videos)

  type DropOption = { key: string; label: string; files: MediaFile[]; zipName: string }
  const dropOptions: DropOption[] = [
    { key: 'tout', label: 'Tout télécharger', files: allFiles, zipName: `mots-damour-tout-${coupleName}.zip` },
    ...(findFolder("Livre d'or") ? [{ key: 'livreOr', label: "Livre d'or seulement", files: findFolder("Livre d'or")!.videos, zipName: `mots-damour-livre-d-or-${coupleName}.zip` }] : []),
    ...(findFolder('Boîte à questions') ? [{ key: 'questions', label: 'Boîte à questions seulement', files: findFolder('Boîte à questions')!.videos, zipName: `mots-damour-boite-questions-${coupleName}.zip` }] : []),
    ...(findFolder('Photos') ? [{ key: 'photos', label: 'Photos seulement', files: findFolder('Photos')!.videos, zipName: `mots-damour-photos-${coupleName}.zip` }] : []),
  ]

  const dropMenuContent = (
    <>
      {dropOptions.map(opt => (
        <button
          key={opt.key}
          onClick={() => handleZip(opt.key, opt.files, opt.zipName)}
          style={{
            display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '10px 14px', borderRadius: '6px', fontSize: '12px',
            fontFamily: "'Poppins', sans-serif", letterSpacing: '0.03em',
            color: t.text, minHeight: '44px',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = dark ? '#2a2a2a' : '#fdf3f2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {opt.label}
        </button>
      ))}
    </>
  )

  const dropMenuStyle: React.CSSProperties = {
    background: dark ? '#1a1a1a' : 'white',
    border: '0.5px solid #e97872',
    borderRadius: '10px',
    padding: '6px',
    zIndex: 200,
    minWidth: '230px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
  }

  const zipLabel = zipKey ? `${zipProgress.done}/${zipProgress.total}…` : 'Télécharger ▾'

  const lightboxItem = lightboxIndex !== null ? photoItems[lightboxIndex] : null

  function handleLightboxPrev(e: React.MouseEvent) {
    e.stopPropagation()
    setLightboxIndex(i => i !== null ? (i - 1 + photoItems.length) % photoItems.length : null)
  }

  function handleLightboxNext(e: React.MouseEvent) {
    e.stopPropagation()
    setLightboxIndex(i => i !== null ? (i + 1) % photoItems.length : null)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) setLightboxIndex(i => i !== null ? (i + 1) % photoItems.length : null)
      else setLightboxIndex(i => i !== null ? (i - 1 + photoItems.length) % photoItems.length : null)
    }
  }

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
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, transition: 'background 0.2s, color 0.2s', overflowX: 'hidden' }}>

      {/* Nav — 2 lignes */}
      <nav className="gallery-nav" style={{ background: t.bg, borderBottom: `0.5px solid ${t.border}`, transition: 'background 0.2s' }}>
        {/* Ligne 1 : logo ← → télécharger + toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
          <img
            src="/logo.svg"
            alt="Mots d'Amour"
            width="100"
            height="56"
            style={{ filter: dark ? 'brightness(0) invert(1)' : 'none', display: 'block', flexShrink: 0 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Bouton télécharger nav */}
            <div ref={navDropRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNavDropOpen(o => !o)}
                disabled={!!zipKey}
                style={{
                  background: '#e97872', color: 'white', border: 'none',
                  padding: '8px 16px', borderRadius: '20px', fontSize: '11px',
                  letterSpacing: '0.05em', textTransform: 'uppercase', cursor: zipKey ? 'default' : 'pointer',
                  fontFamily: "'Poppins', sans-serif", opacity: zipKey ? 0.7 : 1,
                  minHeight: '36px', whiteSpace: 'nowrap',
                }}
              >
                {zipLabel}
              </button>
              {navDropOpen && (
                <div style={{ ...dropMenuStyle, position: 'absolute', top: 'calc(100% + 6px)', right: 0 }}>
                  {dropMenuContent}
                </div>
              )}
            </div>

            {/* Partager */}
            <button
              onClick={() => setShareOpen(true)}
              style={{
                background: 'transparent', border: `0.5px solid ${t.border}`, borderRadius: '20px',
                padding: '8px 14px', fontSize: '11px', cursor: 'pointer',
                fontFamily: "'Poppins', sans-serif", color: t.muted, whiteSpace: 'nowrap',
              }}
            >
              Partager
            </button>

            {/* Toggle dark/light */}
            <button
              onClick={() => setDark(d => !d)}
              title={dark ? 'Mode clair' : 'Mode sombre'}
              style={{
                background: 'transparent', border: `0.5px solid ${t.border}`, borderRadius: '50%',
                width: '36px', height: '36px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0,
              }}
            >
              {dark ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e97872" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4"/>
                  <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
                  <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#e97872">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

      </nav>

      {/* Edit mode badge */}
      {isEditor && (
        <div style={{ background: '#e97872', color: 'white', textAlign: 'center', padding: '8px', fontSize: '11px', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Mode edition — cliquez sur le bouton masquer pour retirer un media
        </div>
      )}

      {/* Hero */}
      <div className="gallery-hero" style={{ textAlign: 'center' }}>
        {event && (
          <>
            <h1 className="gallery-couple-name" style={{ color: dark ? '#ffffff' : '#3c3c3b', marginBottom: '6px' }}>
              {event.coupleName}
            </h1>
            {event.expiresAt && (
              <p style={{ fontSize: '11px', color: dark ? '#888888' : '#b4b2a9', fontFamily: "'Poppins', sans-serif", margin: '0 0 10px' }}>
                Galerie disponible encore {Math.max(0, Math.ceil((new Date(event.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} jours
              </p>
            )}
          </>
        )}
        <p style={{ fontSize: '10px', letterSpacing: '0.18em', color: '#e97872', textTransform: 'uppercase', marginBottom: '10px' }}>
          {totalVideos} souvenir{totalVideos > 1 ? 's' : ''} partagé{totalVideos > 1 ? 's' : ''} avec amour
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '18px' }}>
          <div style={{ width: '40px', height: '0.5px', background: '#e97872', opacity: 0.4 }}/>
          <div style={{ width: '5px', height: '5px', background: '#e97872', transform: 'rotate(45deg)', opacity: 0.5 }}/>
          <div style={{ width: '40px', height: '0.5px', background: '#e97872', opacity: 0.4 }}/>
        </div>
      </div>

      {/* Tabs */}
      <div className="gallery-tabs-area">
        {folders.length > 1 && (
          <div className="tabs-scroll">
            {folders.map((folder, i) => (
              <button
                key={folder.folderid}
                onClick={() => setActiveTab(i)}
                style={{
                  flexShrink: 0,
                  background: activeTab === i ? '#e97872' : 'transparent',
                  color: activeTab === i ? 'white' : t.muted,
                  border: `0.5px solid ${activeTab === i ? '#e97872' : t.border}`,
                  borderRadius: '20px', padding: '8px 20px', fontSize: '12px',
                  fontFamily: "'Poppins', sans-serif", cursor: 'pointer',
                  letterSpacing: '0.04em', transition: 'all 0.15s', minHeight: '44px',
                  whiteSpace: 'nowrap',
                }}
              >
                {tabLabel(folder.name)}
                <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '10px' }}>({folder.videos.length})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className={isPhotosTab ? 'gallery-grid-photo gallery-content' : 'gallery-grid-video gallery-content'}>
        {currentItems.filter(item => !hiddenIds.has(item.id)).map((item) => {
          const isHidden = item.hidden || false
          const isPhoto = isPhotosTab || item.type === 'image'
          if (!isPhoto) return <VideoCard key={item.id} item={item} isEditor={isEditor} isHidden={isHidden} onHide={() => hideFile(item.id)} onUnhide={() => unhideFile(item.id)} />
          const photoIdx = photoItems.findIndex(p => p.id === item.id)
          return <PhotoCard key={item.id} item={item} onOpen={() => !isHidden && setLightboxIndex(photoIdx)} isEditor={isEditor} isHidden={isHidden} onHide={() => hideFile(item.id)} onUnhide={() => unhideFile(item.id)} />
        })}
      </div>

      {/* Footer */}
      <div className="gallery-footer" style={{ borderTop: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: t.subtle, letterSpacing: '0.06em' }}>galerie.mots-damour.fr</span>
        <span style={{ fontSize: '11px', color: t.subtle }}>Accès protégé · Lien valable 12 mois</span>
      </div>

      {/* Share modal */}
      {shareOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShareOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: dark ? '#2a2a2a' : 'white', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '90%', position: 'relative' }}>
            <button onClick={() => setShareOpen(false)} style={{ position: 'absolute', top: '12px', right: '16px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: t.muted }}>x</button>
            <h3 style={{ fontSize: '14px', fontStyle: 'italic', marginBottom: '20px', color: t.text, fontFamily: "'Poppins', sans-serif" }}>Partager la galerie</h3>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', color: t.muted, fontFamily: 'Arial', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Lien</p>
              <p style={{ fontSize: '13px', color: t.text, fontFamily: 'Arial', wordBreak: 'break-all' }}>https://galerie.mots-damour.fr/galerie/{slug}</p>
            </div>
            <button onClick={() => {
              navigator.clipboard.writeText(`https://galerie.mots-damour.fr/galerie/${slug}`)
              setShareOpen(false)
            }} style={{
              width: '100%', padding: '12px', background: '#e97872', color: 'white', border: 'none',
              borderRadius: '20px', fontSize: '11px', fontFamily: "'Poppins', sans-serif",
              letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', marginTop: '8px',
            }}>
              Copier le lien
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            zIndex: 1000, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Close */}
          <button
            onClick={() => setLightboxIndex(null)}
            style={{
              position: 'absolute', top: '16px', right: '20px',
              background: 'transparent', border: 'none', color: 'white',
              fontSize: '28px', lineHeight: 1, cursor: 'pointer',
              padding: '8px', minWidth: '44px', minHeight: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>

          {/* Prev arrow */}
          {photoItems.length > 1 && (
            <button
              onClick={handleLightboxPrev}
              style={{
                position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.4)', border: 'none', color: 'white',
                borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
            >‹</button>
          )}

          {/* Next arrow */}
          {photoItems.length > 1 && (
            <button
              onClick={handleLightboxNext}
              style={{
                position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.4)', border: 'none', color: 'white',
                borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
            >›</button>
          )}

          <img
            src={lightboxItem.streamUrl}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '4px', display: 'block' }}
          />
          <a
            href={`/api/proxy/${lightboxItem.id}?download=1&filename=${encodeURIComponent(lightboxItem.name)}`}
            download={lightboxItem.name}
            onClick={e => e.stopPropagation()}
            style={{
              marginTop: '16px', background: '#e97872', color: 'white',
              padding: '10px 28px', borderRadius: '20px', fontSize: '11px',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              fontFamily: "'Poppins', sans-serif", textDecoration: 'none',
              minHeight: '44px', display: 'flex', alignItems: 'center',
            }}
          >
            Télécharger
          </a>
        </div>
      )}
    </div>
  )
}

function VideoCard({ item, isEditor, isHidden, onHide, onUnhide }: { item: MediaFile; isEditor: boolean; isHidden: boolean; onHide: () => void; onUnhide: () => void }) {
  return (
    <div style={{ width: '100%', position: 'relative', opacity: isHidden ? 0.4 : 1 }}>
      <video
        controls={!isHidden}
        playsInline
        preload="metadata"
        src={`/api/proxy/${item.id}`}
        poster={`/api/proxy/${item.id}?thumb=1`}
        style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover', borderRadius: '10px', display: 'block', background: '#1c1c1c' }}
      />
      {!isHidden && (
        <a
          href={`/api/proxy/${item.id}?download=1&filename=${encodeURIComponent(item.name)}.mp4`}
          download
          style={{
            display: 'block', width: '100%', marginTop: '8px', padding: '8px 0',
            background: '#e97872', color: 'white', border: 'none', borderRadius: '20px',
            fontFamily: 'Poppins, sans-serif', fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '0.06em', textAlign: 'center', textDecoration: 'none', cursor: 'pointer',
          }}
        >Telecharger</a>
      )}
      {isEditor && !isHidden && (
        <button onClick={onHide} style={{
          position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white',
          border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} title="Masquer">X</button>
      )}
      {isEditor && isHidden && (
        <button onClick={onUnhide} style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: '#e97872', color: 'white', border: 'none', borderRadius: '20px',
          padding: '8px 20px', fontSize: '11px', fontFamily: 'Poppins, sans-serif',
          textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
        }}>Restaurer</button>
      )}
    </div>
  )
}

function PhotoCard({ item, onOpen, isEditor, isHidden, onHide, onUnhide }: { item: MediaFile; onOpen: () => void; isEditor: boolean; isHidden: boolean; onHide: () => void; onUnhide: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{ position: 'relative', aspectRatio: '9/16', borderRadius: '10px', overflow: 'hidden', cursor: isHidden ? 'default' : 'pointer', width: '100%', opacity: isHidden ? 0.4 : 1 }}
    >
      <img src={item.streamUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {hovered && !isHidden && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </div>
      )}
      {isEditor && !isHidden && (
        <button onClick={e => { e.stopPropagation(); onHide() }} style={{
          position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white',
          border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }} title="Masquer">X</button>
      )}
      {isEditor && isHidden && (
        <button onClick={e => { e.stopPropagation(); onUnhide() }} style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: '#e97872', color: 'white', border: 'none', borderRadius: '20px',
          padding: '8px 20px', fontSize: '11px', fontFamily: 'Poppins, sans-serif',
          textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', zIndex: 10,
        }}>Restaurer</button>
      )}
    </div>
  )
}
