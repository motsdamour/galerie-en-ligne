'use client'

import { useState, useEffect, use } from 'react'
import { useAdmin } from '@/components/admin/AdminShell'

type OperatorDetail = {
  id: string
  name: string
  slug: string
  email: string
  city: string | null
  phone: string | null
  logo_url: string | null
  accent_color: string | null
  bg_color: string | null
  type: string | null
  is_active: boolean
  created_at: string
}

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

export default function LoueurDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { token } = useAdmin()
  const [operator, setOperator] = useState<OperatorDetail | null>(null)
  const [galleries, setGalleries] = useState<GalleryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/operators/${slug}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.operator) setOperator(data.operator)
        if (data.galleries) setGalleries(data.galleries)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, slug])

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

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function sendEmail(ev: GalleryEvent) {
    if (!ev.couple_email) { alert('Aucun email configuré pour ce couple.'); return }
    setSendingId(ev.id)
    const res = await fetch(`/api/admin/events/${ev.id}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ couple_email: ev.couple_email }),
    })
    setSendingId(null)
    if (res.ok) alert('Email envoyé !')
    else alert('Erreur lors de l\'envoi')
  }

  const activeGalleries = galleries.filter(g => {
    if (!g.expires_at) return true
    return new Date(g.expires_at) > now
  })

  const card: React.CSSProperties = {
    background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, padding: 24,
    boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)',
  }
  const fieldLabel: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, color: '#9B9B9B',
    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, margin: '0 0 4px 0',
  }
  const fieldValue: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#1A1A1A',
  }
  const copyBtn: React.CSSProperties = {
    background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 6,
    padding: '3px 10px', fontSize: 11, fontFamily: "'Inter', sans-serif",
    fontWeight: 500, cursor: 'pointer', color: '#6B6B6B', whiteSpace: 'nowrap',
  }

  if (loading) return null

  if (!operator) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: '0 36px' }}>
      <p style={{ fontFamily: "'Inter', sans-serif", color: '#9B9B9B' }}>Loueur introuvable.</p>
    </div>
  )

  return (
    <div style={{ padding: '28px 36px 36px' }}>
      {/* Back */}
      <a href="/admin/loueurs" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: '#6B6B6B',
        textDecoration: 'none', marginBottom: 20,
      }}>
        ← Loueurs
      </a>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        {operator.logo_url ? (
          <img src={operator.logo_url} alt={operator.name} style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: '1px solid #E8E4DF' }} />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: 14, background: '#2C2C2C',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 500, fontStyle: 'italic',
          }}>
            {operator.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 500,
              fontStyle: 'italic', color: '#1A1A1A', margin: 0, lineHeight: 1.15,
            }}>
              {operator.name}
            </h1>
            {operator.type && (
              <span style={{
                background: operator.type === 'videobooth' ? '#EDE9FE' : '#DBEAFE',
                color: operator.type === 'videobooth' ? '#6D28D9' : '#1D4ED8',
                padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {operator.type}
              </span>
            )}
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9B9B9B', margin: '4px 0 0' }}>
            {operator.email}
            {operator.city && ` · ${operator.city}`}
            {operator.phone && ` · ${operator.phone}`}
          </p>
        </div>
        <span style={{
          background: operator.is_active ? '#e8f5e9' : '#fce4ec',
          color: operator.is_active ? '#2e7d32' : '#b71c1c',
          padding: '5px 14px', borderRadius: 999,
          fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 600,
        }}>
          {operator.is_active ? 'Actif' : 'Inactif'}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32, maxWidth: 600 }}>
        <div style={card}>
          <p style={fieldLabel}>Galeries totales</p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 500, color: '#1A1A1A', margin: 0, lineHeight: 1 }}>{galleries.length}</p>
        </div>
        <div style={card}>
          <p style={fieldLabel}>En ligne</p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 500, color: '#6a8b6e', margin: 0, lineHeight: 1 }}>{activeGalleries.length}</p>
        </div>
        <div style={card}>
          <p style={fieldLabel}>Branding</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: operator.accent_color || '#2C2C2C', border: '1px solid #E8E4DF' }} />
            <div style={{ width: 24, height: 24, borderRadius: 6, background: operator.bg_color || '#FAFAF8', border: '1px solid #E8E4DF' }} />
          </div>
        </div>
      </div>

      {/* Galleries list */}
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: '#1A1A1A', margin: '0 0 16px' }}>
        Galeries ({galleries.length})
      </h2>

      <div style={{ background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)' }}>
        {galleries.length === 0 ? (
          <p style={{ padding: 24, fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9B9B9B' }}>Aucune galerie.</p>
        ) : (
          galleries.map(ev => {
            const status = getStatus(ev)
            const days = daysRemaining(ev)
            const guestUrl = `https://galerie-en-ligne.fr/galerie/${ev.slug}`
            const editUrl = ev.edit_token ? `https://galerie-en-ligne.fr/galerie/${ev.slug}?edit_token=${ev.edit_token}` : null

            return (
              <div key={ev.id} style={{ padding: '18px 24px', borderBottom: '1px solid #F0EDE8' }}>
                {/* Row 1 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'linear-gradient(135deg, #F0EDE8 0%, #E8E4DF 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                      fontSize: 16, fontWeight: 500, color: '#8B7355', flexShrink: 0,
                    }}>
                      {ev.couple_name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontStyle: 'italic', fontWeight: 500, color: '#1A1A1A', margin: 0 }}>
                        {ev.couple_name}
                      </p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: '#9B9B9B', margin: 0 }}>
                        {ev.event_type} · {new Date(ev.event_date).toLocaleDateString('fr-FR')} · {days}j restants
                      </p>
                    </div>
                  </div>
                  {statusPill(status)}
                </div>

                {/* Row 2: links */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 8, paddingLeft: 52 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={fieldLabel}>Invités</span>
                    <span style={{ ...fieldValue, fontSize: 11.5, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guestUrl}</span>
                    <button onClick={() => copy(guestUrl, `g-${ev.id}`)} style={copyBtn}>{copiedId === `g-${ev.id}` ? 'Copié !' : 'Copier'}</button>
                  </div>
                  {ev.password_plain && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={fieldLabel}>Mdp</span>
                      <span style={{ ...fieldValue, fontSize: 12 }}>{ev.password_plain}</span>
                      <button onClick={() => copy(ev.password_plain!, `p-${ev.id}`)} style={copyBtn}>{copiedId === `p-${ev.id}` ? 'Copié !' : 'Copier'}</button>
                    </div>
                  )}
                </div>

                {editUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, paddingLeft: 52 }}>
                    <span style={fieldLabel}>Mariés</span>
                    <span style={{ ...fieldValue, fontSize: 11.5, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editUrl}</span>
                    <button onClick={() => copy(editUrl, `e-${ev.id}`)} style={copyBtn}>{copiedId === `e-${ev.id}` ? 'Copié !' : 'Copier'}</button>
                  </div>
                )}

                {/* Actions */}
                <div style={{ paddingLeft: 52 }}>
                  <button
                    onClick={() => sendEmail(ev)}
                    disabled={sendingId === ev.id || !ev.couple_email}
                    style={{
                      background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 8,
                      padding: '6px 14px', fontSize: 12, fontFamily: "'Inter', sans-serif",
                      fontWeight: 500, cursor: (!ev.couple_email || sendingId === ev.id) ? 'default' : 'pointer',
                      opacity: (!ev.couple_email || sendingId === ev.id) ? 0.5 : 1,
                    }}
                  >
                    {sendingId === ev.id ? 'Envoi...' : 'Envoyer le lien aux mariés'}
                  </button>
                  {!ev.couple_email && (
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#9B9B9B', marginLeft: 10 }}>Aucun email</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
