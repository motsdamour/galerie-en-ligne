'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

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
}

export default function OperatorDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [galleries, setGalleries] = useState<GalleryEvent[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/operators/${slug}/galleries`)
      .then(r => {
        if (r.status === 401) { router.push(`/loueur/${slug}`); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setGalleries(data.galleries ?? [])
        setStats(data.stats ?? { total: 0, active: 0 })
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [slug, router])

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

  function logout() {
    document.cookie = 'operator_session=; path=/; max-age=0'
    router.push(`/loueur/${slug}`)
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
        <button onClick={logout} style={{
          background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontFamily: "'Inter', sans-serif",
          cursor: 'pointer', color: '#6B6B6B', fontWeight: 500,
        }}>
          Déconnexion
        </button>
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
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
