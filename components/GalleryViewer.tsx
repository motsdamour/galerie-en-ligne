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

type Operator = {
  name: string
  logo_url: string | null
  accent_color: string | null
  bg_color: string | null
}

function tabLabel(name: string): string {
  const map: Record<string, string> = {
    "photobooth": "Photos",
    "livre d'or": "Livre d'or",
    "boite a questions": "Boite a questions",
    "boite à questions": "Boite a questions",
    "boîte à questions": "Boite a questions",
  }
  const normalized = name.toLowerCase()
  const key = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return map[normalized] ?? map[key] ?? name.charAt(0).toUpperCase() + name.slice(1)
}

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/.test(navigator.userAgent)

function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    return navigator.canShare({ files: [new File([''], 'test.jpg', { type: 'image/jpeg' })] })
  } catch { return false }
}

async function buildZip(
  files: MediaFile[],
  zipName: string,
  onProgress: (done: number, total: number) => void,
  filteredIds?: Set<number>
) {
  const toDownload = filteredIds ? files.filter(f => filteredIds.has(f.id)) : files
  const zip = new JSZip()
  let done = 0
  await Promise.all(toDownload.map(async (f) => {
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
  const [operator, setOperator] = useState<Operator | null>(null)
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
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [navDropOpen, setNavDropOpen] = useState(false)
  const [zipKey, setZipKey] = useState<string | null>(null)
  const [zipProgress, setZipProgress] = useState({ done: 0, total: 0 })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [shareSupported] = useState(() => canShareFiles())
  const navDropRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  // Dynamic branding
  const accent = operator?.accent_color || '#2C2C2C'
  const bg = operator?.bg_color || '#FFFFFF'
  const border = '#E8E4DF'
  const muted = '#6B6B6B'
  const subtle = '#9B9B9B'

  useEffect(() => {
    const url = editToken
      ? `/api/gallery/${slug}/videos?edit_token=${editToken}`
      : `/api/gallery/${slug}/videos`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setEvent(data.event)
        if (data.operator) setOperator(data.operator)
        const tabOrder: Record<string, number> = { 'Boite a questions': 0, "Livre d'or": 1, 'Photos': 2 }
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

  function triggerUpload() {
    if (uploading) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*'
    input.multiple = true
    input.onchange = async () => {
      const files = input.files
      if (!files || files.length === 0) return

      setUploading(true)
      setUploadError(null)
      setUploadSuccess(false)
      setUploadProgress({ done: 0, total: files.length })
      let successCount = 0
      let lastError = ''

      for (const file of Array.from(files)) {
        try {
          const formData = new FormData()
          formData.append('file', file)

          const res = await fetch(`/api/gallery/${slug}/upload`, {
            method: 'POST',
            body: formData
          })

          const data = await res.json()
          console.log('[UPLOAD]', file.name, res.status, data)

          if (res.ok && data.success) {
            successCount++
          } else {
            lastError = data.error || 'Erreur upload'
          }
        } catch (err) {
          console.error('[UPLOAD ERROR]', err)
          lastError = 'Erreur reseau'
        }
        setUploadProgress(prev => ({ ...prev, done: prev.done + 1 }))
      }

      setUploading(false)
      if (successCount > 0) {
        setUploadSuccess(true)
        setTimeout(() => window.location.reload(), 1500)
      }
      if (lastError && successCount < files.length) {
        setUploadError(lastError)
        setTimeout(() => setUploadError(null), 6000)
      }
    }
    input.click()
  }

  useEffect(() => {
    if (!navDropOpen) return
    function h(e: MouseEvent) {
      if (navDropRef.current && !navDropRef.current.contains(e.target as Node)) setNavDropOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [navDropOpen])

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSelectionZip() {
    if (zipKey || selectedIds.size === 0) return
    setZipKey('selection')
    const allVisible = [...allFiles, ...guestMedia].filter(f => !hiddenIds.has(f.id) && !f.hidden)
    setZipProgress({ done: 0, total: selectedIds.size })
    try {
      await buildZip(allVisible, `galerie-selection-${coupleName}.zip`, (done, total) => setZipProgress({ done, total }), selectedIds)
    } finally {
      setZipKey(null)
      setSelectionMode(false)
      setSelectedIds(new Set())
    }
  }

  async function handleNativeShare() {
    if (zipKey || selectedIds.size === 0) return
    setZipKey('share')
    const allVisible = [...allFiles, ...guestMedia].filter(f => !hiddenIds.has(f.id) && !f.hidden)
    const selected = allVisible.filter(f => selectedIds.has(f.id))
    setZipProgress({ done: 0, total: selected.length })
    try {
      const files: File[] = []
      for (const f of selected) {
        const ext = /\.[a-z0-9]+$/i.test(f.name) ? '' : (f.type === 'image' ? '.jpg' : '.mp4')
        const fullName = `${f.name}${ext}`
        const res = await fetch(`/api/proxy/${f.id}?download=1&filename=${encodeURIComponent(fullName)}`)
        const blob = await res.blob()
        const mime = f.type === 'image' ? 'image/jpeg' : 'video/mp4'
        files.push(new File([blob], fullName, { type: mime }))
        setZipProgress(prev => ({ ...prev, done: prev.done + 1 }))
      }
      await navigator.share({ files })
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setToast('Erreur lors du partage')
        setTimeout(() => setToast(null), 4000)
      }
    } finally {
      setZipKey(null)
      setSelectionMode(false)
      setSelectedIds(new Set())
    }
  }

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
    { key: 'tout', label: 'Tout telecharger', files: allFiles, zipName: `galerie-tout-${coupleName}.zip` },
    ...(findFolder("Livre d'or") ? [{ key: 'livreOr', label: "Livre d'or seulement", files: findFolder("Livre d'or")!.videos, zipName: `galerie-livre-d-or-${coupleName}.zip` }] : []),
    ...(findFolder('Boite a questions') ? [{ key: 'questions', label: 'Boite a questions seulement', files: findFolder('Boite a questions')!.videos, zipName: `galerie-boite-questions-${coupleName}.zip` }] : []),
    ...(findFolder('Photos') ? [{ key: 'photos', label: 'Photos seulement', files: findFolder('Photos')!.videos, zipName: `galerie-photos-${coupleName}.zip` }] : []),
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
            padding: '10px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 400,
            lineHeight: '20px', fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em',
            color: '#1A1A1A', minHeight: '44px',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F5')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {opt.label}
        </button>
      ))}
    </>
  )

  const dropMenuStyle: React.CSSProperties = {
    background: 'white',
    border: `1px solid ${border}`,
    borderRadius: '10px',
    padding: '6px',
    zIndex: 200,
    minWidth: '220px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  }

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

  // Guest media with content
  const visibleGuestMedia = guestMedia.filter(p => !hiddenIds.has(p.id))

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '28px', height: '28px', border: `1.5px solid ${border}`, borderTopColor: accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }}/>
        <p style={{ fontSize: '13px', fontWeight: 400, color: subtle, fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em' }}>Chargement...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <p style={{ fontSize: '14px', fontWeight: 400, color: muted, fontFamily: 'Inter, sans-serif' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#1A1A1A', overflowX: 'hidden' }}>

      {/* Header */}
      <nav className="gallery-nav" style={{ background: '#FFFFFF', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo / brand left */}
          {operator?.logo_url ? (
            <img src={operator.logo_url} alt={operator.name} style={{ height: '40px', maxWidth: '140px', objectFit: 'contain', display: 'block' }} />
          ) : (
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: 'italic',
              fontSize: '18px',
              fontWeight: 500,
              color: '#1A1A1A',
            }}>
              {operator?.name || ''}
            </span>
          )}

          {/* Download button right */}
          <div ref={navDropRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setNavDropOpen(o => !o)}
              disabled={!!zipKey}
              style={{
                background: 'transparent', color: '#1A1A1A', border: 'none',
                padding: '8px 0', fontSize: '13px', fontWeight: 400,
                letterSpacing: '0.04em', cursor: zipKey ? 'default' : 'pointer',
                fontFamily: "'Inter', sans-serif", opacity: zipKey ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {zipKey ? `${zipProgress.done}/${zipProgress.total}...` : 'Telecharger'}
            </button>
            {navDropOpen && (
              <div style={{ ...dropMenuStyle, position: 'absolute', top: 'calc(100% + 6px)', right: 0 }}>
                {dropMenuContent}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Edit mode badge */}
      {isEditor && (
        <div style={{ background: accent, color: 'white', textAlign: 'center', padding: '8px', fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Mode edition — cliquez sur le bouton masquer pour retirer un media
        </div>
      )}

      {/* Hero */}
      <div className="gallery-hero" style={{ textAlign: 'center' }}>
        {event && (
          <>
            <h1 className="gallery-couple-name" style={{ color: '#1A1A1A', marginBottom: '8px' }}>
              {event.coupleName}
            </h1>
            {event.expiresAt && (
              <p style={{ fontSize: '13px', fontWeight: 400, color: subtle, fontFamily: "'Inter', sans-serif", margin: '0 0 16px', letterSpacing: '0.01em' }}>
                Galerie disponible encore {Math.max(0, Math.ceil((new Date(event.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} jours
              </p>
            )}
          </>
        )}
        <button
          onClick={() => setShareOpen(true)}
          style={{
            background: 'transparent', border: 'none', color: subtle,
            fontSize: '13px', fontWeight: 400, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 0',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Partager
        </button>
      </div>

      {/* Tabs */}
      <div className="gallery-tabs-area">
        {(folders.length > 1 || visibleGuestMedia.length > 0) && (
          <div className="tabs-scroll">
            {folders.map((folder, i) => {
              const isActive = !showGuestTab && activeTab === i
              return (
                <button
                  key={folder.folderid}
                  onClick={() => { setActiveTab(i); setShowGuestTab(false); setSelectedIds(new Set()); setSelectionMode(false) }}
                  style={{
                    flexShrink: 0,
                    background: 'transparent',
                    color: isActive ? '#1A1A1A' : subtle,
                    border: 'none',
                    borderBottom: isActive ? '2px solid #1A1A1A' : '2px solid transparent',
                    borderRadius: 0,
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 400,
                    lineHeight: '20px',
                    fontFamily: "'Inter', sans-serif",
                    cursor: 'pointer',
                    letterSpacing: '0.01em',
                    transition: 'all 0.15s',
                    minHeight: '40px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tabLabel(folder.name)}
                  <sup style={{ marginLeft: '3px', fontSize: '10px', opacity: 0.5, fontWeight: 400 }}>{folder.videos.length}</sup>
                </button>
              )
            })}
            {visibleGuestMedia.length > 0 && (
              <button
                onClick={() => { setShowGuestTab(true); setSelectedIds(new Set()); setSelectionMode(false) }}
                style={{
                  flexShrink: 0,
                  background: 'transparent',
                  color: showGuestTab ? '#1A1A1A' : subtle,
                  border: 'none',
                  borderBottom: showGuestTab ? '2px solid #1A1A1A' : '2px solid transparent',
                  borderRadius: 0,
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: showGuestTab ? 600 : 400,
                  lineHeight: '20px',
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  transition: 'all 0.15s',
                  minHeight: '40px',
                  whiteSpace: 'nowrap',
                }}
              >
                Photos & videos invites
                <sup style={{ marginLeft: '3px', fontSize: '10px', opacity: 0.5, fontWeight: 400 }}>{visibleGuestMedia.length}</sup>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selection mode toggle */}
      <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => { setSelectionMode(m => !m); if (selectionMode) setSelectedIds(new Set()) }}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 500, color: selectionMode ? '#c0524c' : '#6B6B6B',
            fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em',
            padding: '8px 0', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          {selectionMode ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Annuler
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Selectionner
            </>
          )}
        </button>
      </div>

      {/* Grid */}
      {!showGuestTab ? (
        <div className={isPhotosTab ? 'gallery-grid-photo gallery-content' : 'gallery-grid-video gallery-content'}>
          {(isEditor ? currentItems : currentItems.filter(item => !hiddenIds.has(item.id) && !item.hidden)).map((item) => {
            const isHidden = item.hidden || hiddenIds.has(item.id)
            const isPhoto = isPhotosTab || item.type === 'image'
            if (!isPhoto) return <VideoCard key={item.id} item={item} accent={accent} isEditor={isEditor} isHidden={isHidden} onHide={() => hideFile(item.id)} onUnhide={() => unhideFile(item.id)} selectionMode={selectionMode} selected={selectedIds.has(item.id)} onToggleSelect={() => toggleSelect(item.id)} />
            const photoIdx = photoItems.findIndex(p => p.id === item.id)
            return <PhotoCard key={item.id} item={item} accent={accent} onOpen={() => !isHidden && (selectionMode ? toggleSelect(item.id) : setLightboxIndex(photoIdx))} isEditor={isEditor} isHidden={isHidden} onHide={() => hideFile(item.id)} onUnhide={() => unhideFile(item.id)} selectionMode={selectionMode} selected={selectedIds.has(item.id)} />
          })}
        </div>
      ) : (
        <div className="gallery-content" style={{ padding: '20px' }}>
          {/* Upload zone */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <button
              type="button"
              onClick={triggerUpload}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'transparent', color: accent, padding: '10px 24px',
                borderRadius: '8px', fontSize: '13px', fontWeight: 500, fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.04em', textTransform: 'uppercase', cursor: uploading ? 'default' : 'pointer',
                opacity: uploading ? 0.5 : 1, border: `1.5px solid ${accent}`,
                transition: 'all 0.15s',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {uploading ? `${uploadProgress.done}/${uploadProgress.total}...` : 'Ajouter photos & videos'}
            </button>
            {uploadSuccess && (
              <p style={{ fontSize: '13px', fontWeight: 400, color: '#0f6e56', fontFamily: "'Inter', sans-serif", marginTop: '12px' }}>
                Photos ajoutees avec succes !
              </p>
            )}
            {uploadError && (
              <p style={{ fontSize: '13px', fontWeight: 400, color: '#c0524c', fontFamily: "'Inter', sans-serif", marginTop: '12px' }}>
                {uploadError}
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
                      return <VideoCard key={item.id} item={item} accent={accent} isEditor={isEditor} isHidden={isHidden} onHide={() => hideFile(item.id)} onUnhide={() => unhideFile(item.id)} selectionMode={selectionMode} selected={selectedIds.has(item.id)} onToggleSelect={() => toggleSelect(item.id)} />
                    }
                    const photoIdx = guestPhotoItems.findIndex(p => p.id === item.id)
                    return <PhotoCard key={item.id} item={item} accent={accent} onOpen={() => !isHidden && (selectionMode ? toggleSelect(item.id) : setLightboxIndex(photoIdx))} isEditor={isEditor} isHidden={isHidden} onHide={() => hideFile(item.id)} onUnhide={() => unhideFile(item.id)} selectionMode={selectionMode} selected={selectedIds.has(item.id)} />
                  })}
                </div>
                {displayGuest.length === 0 && !uploading && (
                  <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: 400, color: subtle, fontFamily: "'Inter', sans-serif", marginTop: '24px' }}>
                    Aucun media pour l'instant. Soyez le premier a partager vos souvenirs !
                  </p>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Share modal */}
      {shareOpen && (() => {
        const galleryLink = `${window.location.origin}/galerie/${slug}`
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={() => setShareOpen(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '380px', width: '90%', position: 'relative' }}>
              <button onClick={() => setShareOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: subtle, lineHeight: 1, padding: '4px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: '#1A1A1A', fontFamily: "'Inter', sans-serif" }}>Partager la galerie</h3>

              {/* WhatsApp */}
              <a href={`https://wa.me/?text=${encodeURIComponent(`Retrouvez nos souvenirs sur ${galleryLink}`)}`}
                target="_blank" rel="noopener" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  width: '100%', padding: '12px', border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 500, fontFamily: "'Inter', sans-serif", cursor: 'pointer',
                  color: 'white', background: '#25D366', textDecoration: 'none', marginBottom: '10px',
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.555 4.122 1.527 5.853L.06 23.64l5.897-1.547A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82c-1.998 0-3.877-.537-5.49-1.474l-.394-.234-4.084 1.071 1.09-3.981-.256-.407A9.788 9.788 0 0 1 2.18 12c0-5.422 4.398-9.82 9.82-9.82 5.422 0 9.82 4.398 9.82 9.82 0 5.422-4.398 9.82-9.82 9.82z"/></svg>
                WhatsApp
              </a>

              {/* Copier lien */}
              <button onClick={() => {
                navigator.clipboard.writeText(galleryLink)
                setShareOpen(false)
                setToast('Lien copie !')
                setTimeout(() => setToast(null), 4000)
              }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                width: '100%', padding: '12px', borderRadius: '10px',
                fontSize: '14px', fontWeight: 500, fontFamily: "'Inter', sans-serif", cursor: 'pointer',
                color: accent, background: 'transparent', border: `1.5px solid ${accent}`,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
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
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
            zIndex: 1000, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Counter top center */}
          {photoItems.length > 1 && (
            <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', color: 'white', opacity: 0.6, fontSize: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 400, letterSpacing: '0.05em' }}>
              {(lightboxIndex ?? 0) + 1} / {photoItems.length}
            </div>
          )}

          {/* Close button */}
          <button onClick={() => setLightboxIndex(null)} style={{ position: 'absolute', top: '16px', right: '20px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Left arrow */}
          {photoItems.length > 1 && (
            <button onClick={handleLightboxPrev} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '12px', opacity: 0.7, minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}

          {/* Right arrow */}
          {photoItems.length > 1 && (
            <button onClick={handleLightboxNext} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '12px', opacity: 0.7, minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}

          <img src={lightboxItem.streamUrl} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', display: 'block' }} />

          {/* Download bottom center */}
          <a
            href={`/api/proxy/${lightboxItem.id}?download=1&filename=${encodeURIComponent(lightboxItem.name)}`}
            download={lightboxItem.name}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
              background: 'transparent', color: 'white',
              padding: '8px 24px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif", textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', gap: '6px',
              minHeight: '40px', transition: 'border-color 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Telecharger
          </a>
        </div>
      )}

      {/* Selection bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 800,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)',
          borderTop: `1px solid ${border}`, padding: '14px 20px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          fontFamily: "'Inter', sans-serif",
        }}>
          {/* Row 1: counter + select all */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1A1A1A' }}>
              {selectedIds.size} element{selectedIds.size > 1 ? 's' : ''} selectionne{selectedIds.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => {
                const visibleItems = showGuestTab
                  ? guestMedia.filter(f => !hiddenIds.has(f.id) && !f.hidden)
                  : currentItems.filter(f => !hiddenIds.has(f.id) && !f.hidden)
                const allSelected = visibleItems.every(f => selectedIds.has(f.id))
                if (allSelected) setSelectedIds(new Set())
                else setSelectedIds(new Set(visibleItems.map(f => f.id)))
              }}
              style={{
                background: 'transparent', border: `1px solid ${border}`, borderRadius: '6px',
                padding: '6px 12px', fontSize: '12px', fontWeight: 500, color: muted,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
              }}
            >
              {(() => {
                const visibleItems = showGuestTab
                  ? guestMedia.filter(f => !hiddenIds.has(f.id) && !f.hidden)
                  : currentItems.filter(f => !hiddenIds.has(f.id) && !f.hidden)
                return visibleItems.every(f => selectedIds.has(f.id)) ? 'Tout deselectionner' : 'Tout selectionner'
              })()}
            </button>
          </div>

          {/* Row 2: action buttons — 5 mutually exclusive cases */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

            {/* Case A: Desktop, 1 file → direct download */}
            {!isMobile && selectedIds.size === 1 && (() => {
              const allVisible = [...allFiles, ...guestMedia].filter(f => !hiddenIds.has(f.id) && !f.hidden)
              const file = allVisible.find(f => selectedIds.has(f.id))
              if (!file) return null
              const ext = /\.[a-z0-9]+$/i.test(file.name) ? '' : (file.type === 'image' ? '.jpg' : '.mp4')
              return (
                <a
                  href={`/api/proxy/${file.id}?download=1&filename=${encodeURIComponent(file.name + ext)}`}
                  download={file.name + ext}
                  style={{
                    flex: 1, background: '#e97872', color: 'white', border: 'none', borderRadius: '8px',
                    padding: '10px 16px', fontSize: '12px', fontWeight: 600,
                    fontFamily: "'Inter', sans-serif", textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Telecharger
                </a>
              )
            })()}

            {/* Case B: Desktop, 2+ files → ZIP */}
            {!isMobile && selectedIds.size >= 2 && (
              <button
                onClick={handleSelectionZip}
                disabled={!!zipKey}
                style={{
                  flex: 1, background: '#e97872', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '10px 16px', fontSize: '12px', fontWeight: 600,
                  cursor: zipKey ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif",
                  opacity: zipKey ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {zipKey === 'selection' ? `${zipProgress.done}/${zipProgress.total}...` : 'Telecharger en ZIP'}
              </button>
            )}

            {/* Case C: Mobile + share + ≤20 → "Enregistrer dans Photos" + ZIP fallback */}
            {isMobile && shareSupported && selectedIds.size <= 20 && (
              <>
                <button
                  onClick={handleNativeShare}
                  disabled={!!zipKey}
                  style={{
                    flex: 1, background: '#e97872', color: 'white', border: 'none', borderRadius: '8px',
                    padding: '10px 16px', fontSize: '12px', fontWeight: 600,
                    cursor: zipKey ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif",
                    opacity: zipKey ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  {zipKey === 'share' ? `${zipProgress.done}/${zipProgress.total}...` : 'Enregistrer dans Photos'}
                </button>
                <button
                  onClick={handleSelectionZip}
                  disabled={!!zipKey}
                  style={{
                    background: 'transparent', color: muted, border: `1px solid ${border}`,
                    borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontWeight: 500,
                    cursor: zipKey ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif",
                    opacity: zipKey ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {zipKey === 'selection' ? `${zipProgress.done}/${zipProgress.total}...` : 'ZIP'}
                </button>
              </>
            )}

            {/* Case D: Mobile + share + >20 → hint + ZIP */}
            {isMobile && shareSupported && selectedIds.size > 20 && (
              <>
                <span style={{ fontSize: '11px', fontWeight: 400, color: muted, flex: 1 }}>
                  Pour enregistrer dans Photos, selectionnez 20 fichiers ou moins
                </span>
                <button
                  onClick={handleSelectionZip}
                  disabled={!!zipKey}
                  style={{
                    background: '#e97872', color: 'white', border: 'none', borderRadius: '8px',
                    padding: '10px 16px', fontSize: '12px', fontWeight: 600,
                    cursor: zipKey ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif",
                    opacity: zipKey ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {zipKey === 'selection' ? `${zipProgress.done}/${zipProgress.total}...` : 'ZIP'}
                </button>
              </>
            )}

            {/* Case E: Mobile no share → ZIP only */}
            {isMobile && !shareSupported && (
              <button
                onClick={handleSelectionZip}
                disabled={!!zipKey}
                style={{
                  flex: 1, background: '#e97872', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '10px 16px', fontSize: '12px', fontWeight: 600,
                  cursor: zipKey ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif",
                  opacity: zipKey ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {zipKey === 'selection' ? `${zipProgress.done}/${zipProgress.total}...` : 'Telecharger en ZIP'}
              </button>
            )}

          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#1A1A1A', color: 'white', padding: '10px 20px', borderRadius: '8px',
          fontSize: '13px', fontWeight: 500, fontFamily: "'Inter', sans-serif", zIndex: 2000,
          maxWidth: '90vw', textAlign: 'center', animation: 'fadeInOut 4s ease',
          letterSpacing: '0.01em',
        }}>
          {toast}
        </div>
      )}
      <style>{`@keyframes fadeInOut { 0% { opacity: 0; transform: translateX(-50%) translateY(8px); } 10% { opacity: 1; transform: translateX(-50%) translateY(0); } 80% { opacity: 1; } 100% { opacity: 0; } }`}</style>
    </div>
  )
}

function VideoCard({ item, accent, isEditor, isHidden, onHide, onUnhide, selectionMode, selected, onToggleSelect }: { item: MediaFile; accent: string; isEditor: boolean; isHidden: boolean; onHide: () => void; onUnhide: () => void; selectionMode?: boolean; selected?: boolean; onToggleSelect?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [playing, setPlaying] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: '100%', position: 'relative', opacity: isHidden ? 0.35 : 1, borderRadius: '12px', overflow: 'hidden' }}
    >
      {selectionMode && !isHidden && (
        <div
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.() }}
          style={{
            position: 'absolute', top: '8px', right: '8px', zIndex: 15,
            width: '28px', height: '28px', borderRadius: '6px',
            background: selected ? '#e97872' : 'rgba(0,0,0,0.35)',
            border: '2px solid white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '44px', minHeight: '44px',
            padding: '8px', boxSizing: 'content-box', margin: '-8px',
          }}
        >
          {selected && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
      )}
      {!playing ? (
        <div
          onClick={() => { if (selectionMode) { onToggleSelect?.(); return } if (!isHidden) setPlaying(true) }}
          style={{ position: 'relative', cursor: isHidden ? 'default' : 'pointer', aspectRatio: '9/16', background: '#111' }}
        >
          <img
            src={`/api/proxy/${item.id}?thumb=1`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Hover overlay */}
          {hovered && !isHidden && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', transition: 'opacity 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {/* Play icon */}
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="8,5 20,12 8,19"/></svg>
              </div>
              {/* Download at bottom */}
              <a
                href={`/api/proxy/${item.id}?download=1&filename=${encodeURIComponent(item.name)}.mp4`}
                download
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', bottom: '12px', left: '12px', right: '12px',
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  padding: '8px 0', fontSize: '11px', fontWeight: 500,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  fontFamily: 'Inter, sans-serif', textAlign: 'center', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Telecharger
              </a>
            </div>
          )}
        </div>
      ) : (
        <video
          controls
          autoPlay
          playsInline
          preload="metadata"
          src={`/api/proxy/${item.id}`}
          poster={`/api/proxy/${item.id}?thumb=1`}
          style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover', display: 'block', background: '#111' }}
        />
      )}

      {/* Editor controls */}
      {isEditor && !isHidden && (
        <button onClick={onHide} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} title="Masquer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
      {isEditor && isHidden && (
        <button onClick={onUnhide} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: accent, color: 'white', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', zIndex: 10 }}>Restaurer</button>
      )}
    </div>
  )
}

function PhotoCard({ item, accent, onOpen, isEditor, isHidden, onHide, onUnhide, selectionMode, selected }: { item: MediaFile; accent: string; onOpen: () => void; isEditor: boolean; isHidden: boolean; onHide: () => void; onUnhide: () => void; selectionMode?: boolean; selected?: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{ position: 'relative', aspectRatio: '3/4', borderRadius: '12px', overflow: 'hidden', cursor: isHidden ? 'default' : 'pointer', width: '100%', opacity: isHidden ? 0.35 : 1 }}
    >
      {selectionMode && !isHidden && (
        <div style={{
          position: 'absolute', top: '8px', right: '8px', zIndex: 15,
          width: '28px', height: '28px', borderRadius: '6px',
          background: selected ? '#e97872' : 'rgba(0,0,0,0.35)',
          border: '2px solid white', pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
      )}
      <img src={item.streamUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {hovered && !isHidden && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </div>
      )}
      {isEditor && !isHidden && (
        <button onClick={e => { e.stopPropagation(); onHide() }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} title="Masquer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
      {isEditor && isHidden && (
        <button onClick={e => { e.stopPropagation(); onUnhide() }} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: accent, color: 'white', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', zIndex: 10 }}>Restaurer</button>
      )}
    </div>
  )
}
