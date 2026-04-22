'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

type GalleryEvent = {
  id: string
  couple_name: string
  event_date: string
  event_type: string
  slug: string
  is_active: boolean
  expires_at: string
  created_at: string
  password_plain: string | null
  edit_token: string | null
  couple_email: string | null
  view_count?: number
  download_count?: number
}

export default function OperatorDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [galleries, setGalleries] = useState<GalleryEvent[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newForm, setNewForm] = useState({ coupleName: '', eventDate: '', coupleEmail: '', expiresDays: '90' })
  const [creating, setCreating] = useState(false)
  const [uploadSlug, setUploadSlug] = useState<string | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, { done: boolean; error?: string }>>({})
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [storage, setStorage] = useState<{ used_gb: number; limit_gb: number; percent: number } | null>(null)

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
      return
    }
    // Verify the session matches this operator slug
    const opSlug = (session?.user as any)?.operatorSlug
    if (opSlug && opSlug !== slug) {
      router.push(`/${opSlug}/dashboard`)
      return
    }

    fetch(`/api/operators/${slug}/galleries`)
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setGalleries(data.galleries ?? [])
        setStats(data.stats ?? { total: 0, active: 0 })
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))

    fetch(`/api/operators/${slug}/storage`).then(r => r.json()).then(d => setStorage(d)).catch(() => {})
  }, [slug, router, session, sessionStatus])

  const now = new Date()

  function getStatus(ev: GalleryEvent) {
    if (!ev.expires_at) return 'active'
    const days = Math.ceil((new Date(ev.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'expired'
    if (days <= 7) return 'expiring'
    return 'active'
  }

  function statusPill(status: string) {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      active: { bg: '#e8f5e9', color: '#2e7d32', label: 'En ligne' },
      expiring: { bg: '#fff3e0', color: '#e65100', label: 'Expire bientôt' },
      expired: { bg: '#fce4ec', color: '#b71c1c', label: 'Expirée' },
    }
    const s = styles[status] || styles.active
    return (
      <span style={{
        background: s.bg, color: s.color,
        padding: '3px 10px', borderRadius: 999,
        fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {s.label}
      </span>
    )
  }

  function daysRemaining(ev: GalleryEvent) {
    if (!ev.expires_at) return 30
    return Math.max(0, Math.ceil((new Date(ev.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function sendEmailToCouple(ev: GalleryEvent) {
    if (!ev.couple_email) {
      alert('Aucun email configuré pour ce couple.')
      return
    }
    setSendingId(ev.id)
    try {
      const res = await fetch(`/api/admin/events/${ev.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_email: ev.couple_email }),
      })
      if (res.ok) alert('Email envoyé !')
      else alert('Erreur lors de l\'envoi')
    } catch {
      alert('Erreur réseau')
    }
    setSendingId(null)
  }

  async function createGallery(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch(`/api/operators/${slug}/galleries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Erreur'); return }
      alert(`Galerie créée !\nURL : ${data.galleryUrl}\nMot de passe : ${data.password}`)
      setShowNewModal(false)
      setNewForm({ coupleName: '', eventDate: '', coupleEmail: '', expiresDays: '90' })
      // Reload galleries
      const r = await fetch(`/api/operators/${slug}/galleries`)
      const d = await r.json()
      if (d) { setGalleries(d.galleries ?? []); setStats(d.stats ?? { total: 0, active: 0 }) }
    } catch { alert('Erreur réseau') }
    finally { setCreating(false) }
  }

  async function handleUpload() {
    if (!uploadSlug || uploadFiles.length === 0) return
    setUploading(true)
    const progress: Record<string, { done: boolean; error?: string }> = {}
    for (const file of uploadFiles) {
      progress[file.name] = { done: false }
    }
    setUploadProgress({ ...progress })

    for (const file of uploadFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`/api/gallery/${uploadSlug}/upload`, { method: 'POST', body: formData })
        const data = await res.json()
        progress[file.name] = { done: true, error: res.ok && data.success ? undefined : (data.error || 'Erreur') }
      } catch {
        progress[file.name] = { done: true, error: 'Erreur réseau' }
      }
      setUploadProgress({ ...progress })
    }
    setUploading(false)
  }

  function openUploadModal(eventSlug: string) {
    setUploadSlug(eventSlug)
    setUploadFiles([])
    setUploadProgress({})
    setUploading(false)
    setDragOver(false)
  }

  function logout() {
    document.cookie = 'operator_session=; path=/; max-age=0'
    signOut({ callbackUrl: '/login' })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '1px solid #2C2C2C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: '15px', fontWeight: 300, color: '#6B6B6B', fontFamily: 'Inter, sans-serif' }}>Chargement…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8' }}>
      <p style={{ fontSize: '15px', fontWeight: 300, color: '#6B6B6B', fontFamily: 'Inter, sans-serif' }}>{error}</p>
    </div>
  )

  const copyBtnStyle: React.CSSProperties = {
    background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 6,
    padding: '3px 10px', fontSize: 11, fontFamily: "'Inter', sans-serif",
    fontWeight: 500, cursor: 'pointer', color: '#6B6B6B', whiteSpace: 'nowrap',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      {/* Header */}
      <header style={{
        background: '#FAFAF8', borderBottom: '1px solid #E8E4DF',
        padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 500,
            fontStyle: 'italic', color: '#1A1A1A', margin: 0,
          }}>
            Mes galeries
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#9B9B9B', margin: '4px 0 0' }}>
            Espace loueur · galerie-en-ligne.fr
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setShowNewModal(true)} style={{
            background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 8,
            padding: '8px 18px', fontSize: 13, fontFamily: "'Inter', sans-serif",
            cursor: 'pointer', fontWeight: 500,
          }}>
            + Nouvelle galerie
          </button>
          <a href={`/${slug}/profile`} style={{
            background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontFamily: "'Inter', sans-serif",
            cursor: 'pointer', color: '#6B6B6B', fontWeight: 500, textDecoration: 'none',
          }}>
            Profil
          </a>
          <button onClick={logout} style={{
            background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontFamily: "'Inter', sans-serif",
            cursor: 'pointer', color: '#6B6B6B', fontWeight: 500,
          }}>
            Déconnexion
          </button>
        </div>
      </header>

      <div style={{ padding: '32px' }}>
        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32, maxWidth: 500 }}>
          <div style={{
            background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, padding: 20,
            boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)',
          }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9B9B9B', margin: '0 0 8px' }}>
              Galeries totales
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 500, color: '#1A1A1A', margin: 0, lineHeight: 1 }}>
              {stats.total}
            </p>
          </div>
          <div style={{
            background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, padding: 20,
            boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)',
          }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9B9B9B', margin: '0 0 8px' }}>
              En ligne
            </p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 500, color: '#6a8b6e', margin: 0, lineHeight: 1 }}>
              {stats.active}
            </p>
          </div>
        </div>

        {storage && (
          <div style={{ marginBottom: 24, maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9B9B9B', fontFamily: "'Inter', sans-serif", marginBottom: 6 }}>
              <span>Stockage utilisé</span>
              <span>{storage.used_gb} GB / {storage.limit_gb} GB</span>
            </div>
            <div style={{ height: 6, background: '#F0EDE8', borderRadius: 999 }}>
              <div style={{ height: '100%', width: `${Math.min(storage.percent, 100)}%`, background: storage.percent > 80 ? '#E53E3E' : storage.percent > 60 ? '#DD6B20' : '#2C2C2C', borderRadius: 999, transition: 'width 0.5s ease' }}/>
            </div>
          </div>
        )}

        {/* Gallery list */}
        <div style={{ background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)' }}>
          {galleries.length === 0 ? (
            <p style={{ padding: 24, fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9B9B9B' }}>Aucune galerie pour le moment.</p>
          ) : (
            galleries.map(ev => {
              const status = getStatus(ev)
              const days = daysRemaining(ev)
              const guestUrl = `https://galerie-en-ligne.fr/galerie/${ev.slug}`
              const editUrl = ev.edit_token ? `https://galerie-en-ligne.fr/galerie/${ev.slug}?edit_token=${ev.edit_token}` : null

              return (
                <div key={ev.id} style={{
                  padding: '20px 24px', borderBottom: '1px solid #F0EDE8',
                }}>
                  {/* Row 1: name + status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: 'linear-gradient(135deg, #F0EDE8 0%, #E8E4DF 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                        fontSize: 17, fontWeight: 500, color: '#8B7355', flexShrink: 0,
                      }}>
                        {ev.couple_name.charAt(0)}
                      </div>
                      <div>
                        <p style={{
                          fontFamily: "'Playfair Display', serif", fontSize: 18,
                          fontStyle: 'italic', fontWeight: 500, color: '#1A1A1A', margin: 0,
                        }}>
                          {ev.couple_name}
                        </p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#9B9B9B', margin: 0 }}>
                          {ev.event_type} · {new Date(ev.event_date).toLocaleDateString('fr-FR')} · {days}j restants
                        </p>
                      </div>
                    </div>
                    {statusPill(status)}
                  </div>

                  {/* Row 2: links */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10, paddingLeft: 54 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#9B9B9B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invités</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: '#1A1A1A', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guestUrl}</span>
                      <button onClick={() => copyToClipboard(guestUrl, `guest-${ev.id}`)} style={copyBtnStyle}>
                        {copiedId === `guest-${ev.id}` ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                    {ev.password_plain && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#9B9B9B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mdp</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#1A1A1A' }}>{ev.password_plain}</span>
                        <button onClick={() => copyToClipboard(ev.password_plain!, `pwd-${ev.id}`)} style={copyBtnStyle}>
                          {copiedId === `pwd-${ev.id}` ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                    )}
                  </div>

                  {editUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingLeft: 54 }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#9B9B9B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mariés</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: '#1A1A1A', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editUrl}</span>
                      <button onClick={() => copyToClipboard(editUrl, `edit-${ev.id}`)} style={copyBtnStyle}>
                        {copiedId === `edit-${ev.id}` ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                  )}

                  {/* Row 3: actions */}
                  <div style={{ paddingLeft: 54 }}>
                    <button
                      onClick={() => sendEmailToCouple(ev)}
                      disabled={sendingId === ev.id || !ev.couple_email}
                      style={{
                        background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 8,
                        padding: '7px 16px', fontSize: 12, fontFamily: "'Inter', sans-serif",
                        fontWeight: 500, cursor: (!ev.couple_email || sendingId === ev.id) ? 'default' : 'pointer',
                        opacity: (!ev.couple_email || sendingId === ev.id) ? 0.5 : 1,
                      }}
                    >
                      {sendingId === ev.id ? 'Envoi...' : 'Envoyer le lien aux mariés'}
                    </button>
                    {!ev.couple_email && (
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#9B9B9B', marginLeft: 10 }}>
                        Aucun email configuré
                      </span>
                    )}
                    <button
                      onClick={() => openUploadModal(ev.slug)}
                      style={{
                        background: 'transparent', border: '1px solid #1a1a1a', borderRadius: 8,
                        padding: '7px 16px', fontSize: 13, fontFamily: "'Inter', sans-serif",
                        fontWeight: 500, cursor: 'pointer', color: '#1a1a1a', marginLeft: 8,
                      }}
                    >
                      Ajouter des médias
                    </button>
                  </div>
                  <div style={{ paddingLeft: 54, marginTop: 6 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#9B9B9B' }}>
                      👁 {(ev as any).view_count || 0} vues · ⬇ {(ev as any).download_count || 0} téléchargements
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal Upload médias */}
      {uploadSlug && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => !uploading && setUploadSlug(null)}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 36, width: '100%', maxWidth: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: 'italic',
              fontWeight: 500, color: '#1A1A1A', margin: '0 0 20px',
            }}>
              Ajouter des médias
            </h2>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
                if (files.length) setUploadFiles(prev => [...prev, ...files])
              }}
              style={{
                border: `2px dashed ${dragOver ? '#1a1a1a' : '#E8E4DF'}`,
                borderRadius: 12, padding: '32px 24px', textAlign: 'center',
                background: dragOver ? '#F5F5F5' : '#FAFAF8', transition: 'all 0.15s',
                marginBottom: 16, cursor: 'pointer',
              }}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*,video/*'
                input.multiple = true
                input.onchange = () => {
                  const files = Array.from(input.files || [])
                  if (files.length) setUploadFiles(prev => [...prev, ...files])
                }
                input.click()
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9B9B9B" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 12px', display: 'block' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#6B6B6B', margin: 0 }}>
                Glissez vos fichiers ici ou <span style={{ color: '#1a1a1a', fontWeight: 600 }}>cliquez pour parcourir</span>
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#9B9B9B', margin: '6px 0 0' }}>
                Photos et vidéos uniquement
              </p>
            </div>

            {/* File list */}
            {uploadFiles.length > 0 && (
              <div style={{ marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
                {uploadFiles.map((file, i) => {
                  const p = uploadProgress[file.name]
                  return (
                    <div key={`${file.name}-${i}`} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                      borderBottom: '1px solid #F0EDE8',
                    }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#1a1a1a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#9B9B9B', flexShrink: 0 }}>
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      {p?.done && !p.error && (
                        <span style={{ color: '#2e7d32', fontSize: 14 }}>✓</span>
                      )}
                      {p?.done && p.error && (
                        <span style={{ color: '#c0524c', fontSize: 11, fontFamily: "'Inter', sans-serif" }}>{p.error}</span>
                      )}
                      {p && !p.done && (
                        <div style={{ width: 16, height: 16, border: '2px solid #E8E4DF', borderTopColor: '#1a1a1a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      )}
                      {!p && !uploading && (
                        <button onClick={() => setUploadFiles(prev => prev.filter((_, j) => j !== i))} style={{
                          background: 'transparent', border: 'none', color: '#9B9B9B', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
                        }}>×</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setUploadSlug(null)} disabled={uploading} style={{
                background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 8,
                padding: '9px 20px', fontSize: 13, fontFamily: "'Inter', sans-serif",
                cursor: uploading ? 'default' : 'pointer', color: '#6B6B6B', fontWeight: 500,
                opacity: uploading ? 0.5 : 1,
              }}>
                {uploading ? 'Upload en cours...' : 'Fermer'}
              </button>
              {uploadFiles.length > 0 && !uploading && !Object.values(uploadProgress).some(p => p.done) && (
                <button onClick={handleUpload} style={{
                  background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 8,
                  padding: '9px 24px', fontSize: 13, fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer', fontWeight: 500,
                }}>
                  Envoyer {uploadFiles.length} fichier{uploadFiles.length > 1 ? 's' : ''}
                </button>
              )}
              {Object.values(uploadProgress).length > 0 && Object.values(uploadProgress).every(p => p.done) && (
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#2e7d32', fontWeight: 500, alignSelf: 'center' }}>
                  Upload terminé
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouvelle galerie */}
      {showNewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowNewModal(false)}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 36, width: '100%', maxWidth: 440,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: 'italic',
              fontWeight: 500, color: '#1A1A1A', margin: '0 0 24px',
            }}>
              Nouvelle galerie
            </h2>
            <form onSubmit={createGallery}>
              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#6B6B6B', display: 'block', marginBottom: 4 }}>Nom des mariés *</span>
                <input required value={newForm.coupleName} onChange={e => setNewForm(f => ({ ...f, coupleName: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#6B6B6B', display: 'block', marginBottom: 4 }}>Date *</span>
                <input required type="date" value={newForm.eventDate} onChange={e => setNewForm(f => ({ ...f, eventDate: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#6B6B6B', display: 'block', marginBottom: 4 }}>Email mariés (optionnel)</span>
                <input type="email" value={newForm.coupleEmail} onChange={e => setNewForm(f => ({ ...f, coupleEmail: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
              </label>
              <label style={{ display: 'block', marginBottom: 24 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#6B6B6B', display: 'block', marginBottom: 4 }}>Durée</span>
                <select value={newForm.expiresDays} onChange={e => setNewForm(f => ({ ...f, expiresDays: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box', background: 'white' }}>
                  <option value="30">30 jours</option>
                  <option value="60">60 jours</option>
                  <option value="90">90 jours</option>
                  <option value="180">180 jours</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowNewModal(false)} style={{
                  background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 8,
                  padding: '9px 20px', fontSize: 13, fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer', color: '#6B6B6B', fontWeight: 500,
                }}>
                  Annuler
                </button>
                <button type="submit" disabled={creating} style={{
                  background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 8,
                  padding: '9px 24px', fontSize: 13, fontFamily: "'Inter', sans-serif",
                  cursor: creating ? 'default' : 'pointer', fontWeight: 500,
                  opacity: creating ? 0.6 : 1,
                }}>
                  {creating ? 'Création...' : 'Créer la galerie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
