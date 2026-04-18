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
  const [guestMedia, setGuestMedia] = useState<MediaFile[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [showGuestTab, setShowGuestTab] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [dark, setDark] = useState(false)
  const [navDropOpen, setNavDropOpen] = useState(false)
  const [zipKey, setZipKey] = useState<string | null>(null)
  const [zipProgress, setZipProgress] = useState({ done: 0, total: 0 })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
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
        const tabOrder: Record<string, number> = { 'Boîte à questions': 0, "Livre d'or": 1, 'Photos': 2 }
        const rawFolders: Folder[] = data.folders ?? []
        const guestFromFolders: MediaFile[] = []
        const filteredFolders = rawFolders.filter(f => {
          const norm = f.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          if (norm === 'photos-invites') {
            guestFromFolders.push(...f.videos)
            return false
          }
          return true
        })
        filteredFolders.sort((a, b) => {
          const oa = tabOrder[tabLabel(a.name)] ?? 99
          const ob = tabOrder[tabLabel(b.name)] ?? 99
          return oa - ob
        })
        setFolders(filteredFolders)
        setTotalVideos(data.totalVideos ?? 0)
        setGuestMedia([...guestFromFolders, ...(data.guestPhotos ?? [])])
        if (data.isEditor) setIsEditor(true)
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [slug, editToken])

  function hideFile(fileId: number) {
    setHiddenIds(prev => new Set([...prev, fileId]))
    setFolders(prev => prev.map(f => ({ ...f, videos: f.videos.map(v => v.id === fileId ? { ...v, hidden: true } : v) })))
    setGuestMedia(prev => prev.map(v => v.id === fileId ? { ...v, hidden: true } : v))
    setTotalVideos(n => n - 1)
    fetch(`/api/gallery/${slug}/hide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, edit_token: editToken }),
    })
  }

  function unhideFile(fileId: number) {
    setHiddenIds(prev => { const s = new Set(prev); s.delete(fileId); return s })
    setFolders(prev => prev.map(f => ({ ...f, videos: f.videos.map(v => v.id === fileId ? { ...v, hidden: false } : v) })))
    setGuestMedia(prev => prev.map(v => v.id === fileId ? { ...v, hidden: false } : v))
    setTotalVideos(n => n + 1)
    fetch(`/api/gallery/${slug}/unhide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, edit_token: editToken }),
    })
  }

  async function handleUpload(files: FileList) {
    setUploading(true)
    setUploadProgress({ done: 0, total: files.length })
    setUploadSuccess(false)
    for (let i = 0; i < files.length; i++) {
      const form = new FormData()
      form.append('file', files[i])
      await fetch(`/api/gallery/${slug}/upload`, { method: 'POST', body: form })
      setUploadProgress({ done: i + 1, total: files.length })
    }
    setUploading(false)
    setUploadSuccess(true)
    setTimeout(() => setUploadSuccess(false), 4000)
    // Recharger les photos invites
    const url = editToken
      ? `/api/gallery/${slug}/videos?edit_token=${editToken}`
      : `/api/gallery/${slug}/videos`
    const res = await fetch(url)
    const data = await res.json()
    if (data.guestPhotos) setGuestMedia(data.guestPhotos)
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
  const photoItems = showGuestTab
    ? guestMedia.filter(item => item.type === 'image' && !hiddenIds.has(item.id))
    : currentItems.filter(item => isPhotosTab || item.type === 'image')

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

      {/* Site name */}
      <p style={{ textAlign: 'center', fontSize: '10px', color: dark ? '#666' : '#999', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', margin: '12px 0 0' }}>
        mots-damour.fr
      </p>

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
        <button
          onClick={() => setShareOpen(true)}
          style={{
            background: 'white', border: '1px solid #e97872', color: '#e97872', fontWeight: 700,
            padding: '8px 24px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
            fontFamily: "'Poppins', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase',
            marginTop: '12px',
          }}
        >
          Partager
        </button>
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
                onClick={() => { setActiveTab(i); setShowGuestTab(false) }}
                style={{
                  flexShrink: 0,
                  background: !showGuestTab && activeTab === i ? '#e97872' : 'transparent',
                  color: !showGuestTab && activeTab === i ? 'white' : t.muted,
                  border: `0.5px solid ${!showGuestTab && activeTab === i ? '#e97872' : t.border}`,
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
            <button
              onClick={() => setShowGuestTab(true)}
              style={{
                flexShrink: 0,
                background: showGuestTab ? '#e97872' : 'transparent',
                color: showGuestTab ? 'white' : t.muted,
                border: `0.5px solid ${showGuestTab ? '#e97872' : t.border}`,
                borderRadius: '20px', padding: '8px 20px', fontSize: '12px',
                fontFamily: "'Poppins', sans-serif", cursor: 'pointer',
                letterSpacing: '0.04em', transition: 'all 0.15s', minHeight: '44px',
                whiteSpace: 'nowrap',
              }}
            >
              Photos & vidéos invités
              <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '10px' }}>({guestMedia.filter(p => !hiddenIds.has(p.id)).length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      {!showGuestTab ? (
        <div className={isPhotosTab ? 'gallery-grid-photo gallery-content' : 'gallery-grid-video gallery-content'}>
          {(isEditor ? currentItems : currentItems.filter(item => !hiddenIds.has(item.id) && !item.hidden)).map((item) => {
            const isHidden = item.hidden || hiddenIds.has(item.id)
            const isPhoto = isPhotosTab || item.type === 'image'
            if (!isPhoto) return <VideoCard key={item.id} item={item} isEditor={isEditor} isHidden={isHidden} onHide={() => hideFile(item.id)} onUnhide={() => unhideFile(item.id)} />
            const photoIdx = photoItems.findIndex(p => p.id === item.id)
            return <PhotoCard key={item.id} item={item} onOpen={() => !isHidden && setLightboxIndex(photoIdx)} isEditor={isEditor} isHidden={isHidden} onHide={() => hideFile(item.id)} onUnhide={() => unhideFile(item.id)} />
          })}
        </div>
      ) : (
        <div className="gallery-content" style={{ padding: '20px' }}>
          {/* Upload zone */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              id="guest-upload"
              style={{ display: 'none' }}
              onChange={e => e.target.files && e.target.files.length > 0 && handleUpload(e.target.files)}
            />
            <label
              htmlFor="guest-upload"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: '#e97872', color: 'white', padding: '12px 28px',
                borderRadius: '25px', fontSize: '12px', fontFamily: "'Poppins', sans-serif",
                letterSpacing: '0.06em', textTransform: 'uppercase', cursor: uploading ? 'default' : 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {uploading ? `${uploadProgress.done}/${uploadProgress.total}...` : 'Ajouter photos & videos'}
            </label>
            {uploadSuccess && (
              <p style={{ fontSize: '13px', color: '#0f6e56', fontFamily: "'Poppins', sans-serif", marginTop: '12px' }}>
                Photos ajoutees avec succes !
              </p>
            )}
          </div>

          {/* Guest media grid */}
          {(() => {
            const displayGuest = isEditor ? guestMedia : guestMedia.filter(p => !hiddenIds.has(p.id) && !p.hidden)
            const guestPhotoItems = displayGuest.filter(p => p.type === 'image')
            const hasVideos = displayGuest.some(p => p.type === 'video')
            return (
              <>
                <div className={hasVideos ? 'gallery-grid-video' : 'gallery-grid-photo'}>
                  {displayGuest.map(item => {
                    const isHidden = item.hidden || hiddenIds.has(item.id)
                    if (item.type === 'video') {
                      return <VideoCard key={item.id} item={item} isEditor={isEditor} isHidden={isHidden} onHide={() => hideFile(item.id)} onUnhide={() => unhideFile(item.id)} />
                    }
                    const photoIdx = guestPhotoItems.findIndex(p => p.id === item.id)
                    return <PhotoCard key={item.id} item={item} onOpen={() => !isHidden && setLightboxIndex(photoIdx)} isEditor={isEditor} isHidden={isHidden} onHide={() => hideFile(item.id)} onUnhide={() => unhideFile(item.id)} />
                  })}
                </div>
                {displayGuest.length === 0 && !uploading && (
                  <p style={{ textAlign: 'center', fontSize: '13px', color: t.muted, fontFamily: "'Poppins', sans-serif", marginTop: '20px' }}>
                    Aucun media pour l'instant. Soyez le premier a partager vos souvenirs !
                  </p>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Footer */}
      <div className="gallery-footer" style={{ borderTop: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <a href="https://mots-damour.fr" target="_blank" rel="noopener" style={{ fontSize: '11px', color: t.subtle, textDecoration: 'none', letterSpacing: '0.04em' }}>mots-damour.fr</a>
        <a href="https://www.instagram.com/motsdamour.fr_/" target="_blank" rel="noopener" style={{ fontSize: '11px', color: t.subtle, textDecoration: 'none', letterSpacing: '0.04em' }}>@motsdamour.fr_</a>
        <a href="mailto:bonjour@mots-damour.fr" style={{ fontSize: '11px', color: t.subtle, textDecoration: 'none', letterSpacing: '0.04em' }}>bonjour@mots-damour.fr</a>
      </div>

      {/* Share modal */}
      {shareOpen && (() => {
        const galleryLink = `https://galerie.mots-damour.fr/galerie/${slug}`
        const shareBtnStyle: React.CSSProperties = {
          width: '100%', padding: '12px', border: 'none', borderRadius: '12px',
          fontSize: '12px', fontFamily: "'Poppins', sans-serif", cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          color: 'white', marginBottom: '8px',
        }
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShareOpen(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: dark ? '#2a2a2a' : 'white', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '90%', position: 'relative' }}>
              <button onClick={() => setShareOpen(false)} style={{ position: 'absolute', top: '12px', right: '16px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: t.muted }}>x</button>
              <h3 style={{ fontSize: '14px', fontStyle: 'italic', marginBottom: '20px', color: t.text, fontFamily: "'Poppins', sans-serif" }}>Partager la galerie</h3>

              {/* WhatsApp */}
              <a href={`https://wa.me/?text=${encodeURIComponent(`Retrouvez nos souvenirs sur ${galleryLink}`)}`}
                target="_blank" rel="noopener" style={{ ...shareBtnStyle, background: '#25D366', textDecoration: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.555 4.122 1.527 5.853L.06 23.64l5.897-1.547A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82c-1.998 0-3.877-.537-5.49-1.474l-.394-.234-4.084 1.071 1.09-3.981-.256-.407A9.788 9.788 0 0 1 2.18 12c0-5.422 4.398-9.82 9.82-9.82 5.422 0 9.82 4.398 9.82 9.82 0 5.422-4.398 9.82-9.82 9.82z"/></svg>
                WhatsApp
              </a>

              {/* Instagram */}
              <button onClick={() => {
                navigator.clipboard.writeText(galleryLink)
                setShareOpen(false)
                setToast('Lien copie ! \ud83d\udcf8 Colle-le dans ta bio ou tes stories et n\'oublie pas de nous taguer @motsdamour.fr_ \u2b50')
                setTimeout(() => setToast(null), 6000)
              }} style={{ ...shareBtnStyle, background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                Instagram
              </button>

              {/* Copier lien + mdp */}
              <button onClick={() => {
                navigator.clipboard.writeText(`${galleryLink}`)
                setShareOpen(false)
              }} style={{ ...shareBtnStyle, background: dark ? '#444' : '#666' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copier le lien
              </button>
            </div>
          </div>
        )
      })()}

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

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#1c1c1c', color: 'white', padding: '12px 20px', borderRadius: '12px',
          fontSize: '12px', fontFamily: "'Poppins', sans-serif", zIndex: 2000,
          maxWidth: '90vw', textAlign: 'center', animation: 'fadeInOut 6s ease',
        }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes fadeInOut { 0% { opacity: 0; } 8% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }`}</style>
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
