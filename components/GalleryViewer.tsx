'use client'

import { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'

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
  const [event, setEvent] = useState<GalleryEvent | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [totalVideos, setTotalVideos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [dark, setDark] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [zipKey, setZipKey] = useState<string | null>(null)
  const [zipProgress, setZipProgress] = useState({ done: 0, total: 0 })
  const dropRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!dropOpen) return
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropOpen])

  const formattedDate = event
    ? new Date(event.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const currentFolder = folders[activeTab]
  const currentItems = currentFolder?.videos ?? []
  const isPhotosTab = currentFolder ? tabLabel(currentFolder.name) === 'Photos' : false
  const coupleName = event ? slugify(event.coupleName) : 'galerie'

  function findFolder(label: string) {
    return folders.find(f => tabLabel(f.name) === label)
  }

  async function handleZip(key: string, files: MediaFile[], zipName: string) {
    if (zipKey) return
    setDropOpen(false)
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
    ...(findFolder("Livre d'or") ? [{ key: 'livredOr', label: "Livre d'or seulement", files: findFolder("Livre d'or")!.videos, zipName: `mots-damour-livre-d-or-${coupleName}.zip` }] : []),
    ...(findFolder('Boîte à questions') ? [{ key: 'questions', label: 'Boîte à questions seulement', files: findFolder('Boîte à questions')!.videos, zipName: `mots-damour-boite-questions-${coupleName}.zip` }] : []),
    ...(findFolder('Photos') ? [{ key: 'photos', label: 'Photos seulement', files: findFolder('Photos')!.videos, zipName: `mots-damour-photos-${coupleName}.zip` }] : []),
  ]

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

      {/* Nav — 2 lignes */}
      <nav style={{ background: t.bg, borderBottom: `0.5px solid ${t.border}`, padding: '12px 28px 10px', transition: 'background 0.2s' }}>
        {/* Ligne 1 : logo ← → toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: event ? '8px' : 0 }}>
          <img
            src="/logo.svg"
            alt="Mots d'Amour"
            width="110"
            height="61"
            style={{ filter: dark ? 'brightness(0) invert(1)' : 'none', display: 'block' }}
          />
          <button
            onClick={() => setDark(d => !d)}
            title={dark ? 'Mode clair' : 'Mode sombre'}
            style={{ background: 'transparent', border: `0.5px solid ${t.border}`, borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
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

        {/* Ligne 2 : nom du couple centré */}
        {event && (
          <p style={{ textAlign: 'center', fontSize: '13px', fontStyle: 'italic', fontWeight: 300, fontFamily: "'Poppins', sans-serif", color: t.text, margin: 0 }}>
            {event.coupleName} · {formattedDate}
          </p>
        )}
      </nav>

      {/* Hero */}
      <div style={{ padding: '36px 32px 12px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.18em', color: '#e97872', textTransform: 'uppercase', marginBottom: '10px' }}>
          {totalVideos} souvenir{totalVideos > 1 ? 's' : ''} partagé{totalVideos > 1 ? 's' : ''} avec amour
        </p>
        <h1 style={{ fontSize: '28px', fontWeight: 300, fontStyle: 'italic', color: t.text, marginBottom: '6px' }}>
          Vos mots d'amour
        </h1>
        <p style={{ fontSize: '12px', color: t.muted }}>
          Regardez et téléchargez vos souvenirs · Partagez ce lien à tous vos invités
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', margin: '18px 0 0' }}>
          <div style={{ width: '40px', height: '0.5px', background: '#e97872', opacity: 0.4 }}/>
          <div style={{ width: '5px', height: '5px', background: '#e97872', transform: 'rotate(45deg)', opacity: 0.5 }}/>
          <div style={{ width: '40px', height: '0.5px', background: '#e97872', opacity: 0.4 }}/>
        </div>
      </div>

      {/* Tabs + bouton téléchargement */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 28px 24px' }}>
        {folders.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {folders.map((folder, i) => (
              <button
                key={folder.folderid}
                onClick={() => setActiveTab(i)}
                style={{
                  background: activeTab === i ? '#e97872' : 'transparent',
                  color: activeTab === i ? 'white' : t.muted,
                  border: `0.5px solid ${activeTab === i ? '#e97872' : t.border}`,
                  borderRadius: '20px', padding: '7px 20px', fontSize: '12px',
                  fontFamily: "'Poppins', sans-serif", cursor: 'pointer',
                  letterSpacing: '0.04em', transition: 'all 0.15s',
                }}
              >
                {tabLabel(folder.name)}
                <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '10px' }}>({folder.videos.length})</span>
              </button>
            ))}
          </div>
        )}

        {/* Bouton télécharger avec dropdown */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropOpen(o => !o)}
            disabled={!!zipKey}
            style={{
              background: 'transparent', border: '0.5px solid #e97872', color: '#e97872',
              padding: '8px 20px', borderRadius: '20px', fontSize: '11px',
              letterSpacing: '0.06em', textTransform: 'uppercase', cursor: zipKey ? 'default' : 'pointer',
              fontFamily: "'Poppins', sans-serif", opacity: zipKey ? 0.7 : 1,
            }}
          >
            {zipKey ? `${zipProgress.done}/${zipProgress.total}…` : 'Télécharger ▾'}
          </button>

          {dropOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
              background: dark ? '#1a1a1a' : 'white',
              border: '0.5px solid #e97872', borderRadius: '10px', padding: '8px',
              zIndex: 100, minWidth: '220px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}>
              {dropOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleZip(opt.key, opt.files, opt.zipName)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '8px 12px', borderRadius: '6px', fontSize: '11px',
                    fontFamily: "'Poppins', sans-serif", letterSpacing: '0.04em',
                    color: t.text, transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = dark ? '#2a2a2a' : '#fdf3f2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

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
        style={{
          display: 'block', width: '100%', marginTop: '8px', padding: '8px 16px',
          background: '#e97872', color: 'white', border: 'none', borderRadius: '20px',
          fontFamily: "'Poppins', sans-serif", fontSize: '11px', textTransform: 'uppercase',
          letterSpacing: '0.06em', textAlign: 'center', textDecoration: 'none',
          cursor: 'pointer', boxSizing: 'border-box',
        }}
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
      style={{ position: 'relative', aspectRatio: '9/16', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }}
    >
      <img
        src={item.streamUrl}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {hovered && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <a
            href={`/api/proxy/${item.id}?download=1&filename=${encodeURIComponent(item.name)}`}
            download={item.name}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'transparent', border: '0.5px solid white', color: 'white',
              padding: '6px 14px', borderRadius: '14px', fontSize: '10px',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              fontFamily: "'Poppins', sans-serif", textDecoration: 'none',
            }}
          >
            Télécharger
          </a>
        </div>
      )}
    </div>
  )
}
