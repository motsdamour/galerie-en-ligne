'use client'

import { useState, use } from 'react'
import { useAdmin } from '@/components/admin/AdminShell'
import Topbar from '@/components/admin/Topbar'

export default function GalleryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { events, users, token, loadEvents } = useAdmin()
  const ev = events.find(e => e.slug === slug)

  const [editingEmail, setEditingEmail] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [emailModal, setEmailModal] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [qrModal, setQrModal] = useState(false)
  const [editingPwd, setEditingPwd] = useState<string | null>(null)
  const [savingPwd, setSavingPwd] = useState(false)

  if (!ev) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <p style={{ fontFamily: "'Poppins', sans-serif", color: '#9a9a97' }}>Galerie introuvable.</p>
    </div>
  )

  const now = new Date()
  function getStatus() {
    if (!ev!.expires_at) return 'active'
    const days = Math.ceil((new Date(ev!.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'expired'
    if (days <= 7) return 'expiring'
    return 'active'
  }
  const status = getStatus()
  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#e8f5e9', color: '#2e7d32', label: 'En ligne' },
    expiring: { bg: '#fff3e0', color: '#e65100', label: 'Expire bientôt' },
    expired: { bg: '#fce4ec', color: '#b71c1c', label: 'Expirée' },
  }
  const st = statusStyles[status]

  const guestUrl = `https://galerie.mots-damour.fr/galerie/${ev.slug}`
  const editUrl = ev.edit_token ? `https://galerie.mots-damour.fr/galerie/${ev.slug}/edit` : null

  async function saveEmail() {
    const res = await fetch(`/api/admin/events/${ev!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ couple_email: emailValue }),
    })
    if (res.ok) { setEditingEmail(false); loadEvents() }
    else { const data = await res.json(); alert(data.error) }
  }

  async function sendEmail(coupleEmail?: string) {
    setSendingEmail(true)
    const res = await fetch(`/api/admin/events/${ev!.id}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ couple_email: coupleEmail }),
    })
    setSendingEmail(false)
    setEmailModal(false)
    if (res.ok) { alert('Email envoyé !'); loadEvents() }
    else { const data = await res.json(); alert(data.error) }
  }

  async function downloadQR() {
    const res = await fetch(`/api/admin/events/${ev!.id}/qrcode`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `qr-${ev!.slug}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function deleteEvent() {
    if (!window.confirm('Supprimer cette galerie définitivement ?')) return
    const res = await fetch(`/api/admin/events/${ev!.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { window.location.href = '/admin/galleries' }
    else { const data = await res.json(); alert(data.error ?? 'Erreur') }
  }

  async function assignUser(userId: string | null) {
    await fetch(`/api/admin/events/${ev!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId }),
    })
    loadEvents()
  }

  async function savePassword() {
    if (!editingPwd) return
    setSavingPwd(true)
    const res = await fetch(`/api/admin/events/${ev!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: editingPwd }),
    })
    setSavingPwd(false)
    if (res.ok) { setEditingPwd(null); loadEvents() }
    else { const data = await res.json(); alert(data.error) }
  }

  const infoCardStyle: React.CSSProperties = {
    background: 'white', border: '1px solid #f0e6e0', borderRadius: 12, padding: 24,
  }
  const fieldLabel: React.CSSProperties = {
    fontFamily: "'Poppins', sans-serif", fontSize: 11, color: '#9a9a97',
    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4,
  }
  const fieldValue: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#3c3c3b',
    wordBreak: 'break-all',
  }

  return (
    <>
      {/* Back button */}
      <a href="/admin/galleries" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: "'Poppins', sans-serif", fontSize: 13, color: '#6e6968',
        textDecoration: 'none', marginBottom: 16,
      }}>
        ← Retour aux galeries
      </a>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 500,
            fontStyle: 'italic', color: '#3c3c3b', margin: 0, lineHeight: 1.2,
          }}>
            {ev.couple_name}
          </h1>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, color: '#9a9a97', marginTop: 4 }}>
            {ev.event_type} · {new Date(ev.event_date).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <span style={{
          background: st.bg, color: st.color,
          padding: '5px 14px', borderRadius: 999,
          fontSize: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 500,
          marginTop: 8,
        }}>
          {st.label}
        </span>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Info galerie */}
        <div style={infoCardStyle}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 20 }}>
            Informations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={fieldLabel}>Mot de passe</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={fieldValue}>{ev.password_plain || '—'}</span>
                <button onClick={() => setEditingPwd('')} style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968' }}>Modifier</button>
              </div>
              {editingPwd !== null && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input type="text" placeholder="Nouveau mot de passe" value={editingPwd} onChange={e => setEditingPwd(e.target.value)} style={{ flex: 1, fontSize: 13 }} autoFocus />
                  <button disabled={savingPwd || !editingPwd} onClick={savePassword} style={{ background: '#E98172', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>{savingPwd ? '...' : 'Sauver'}</button>
                  <button onClick={() => setEditingPwd(null)} style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968' }}>×</button>
                </div>
              )}
            </div>
            <div>
              <p style={fieldLabel}>Lien invités</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...fieldValue, fontSize: 12 }}>{guestUrl}</span>
                <button onClick={() => { navigator.clipboard.writeText(guestUrl); alert('Copié !') }} style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968', whiteSpace: 'nowrap' }}>Copier</button>
              </div>
            </div>
            {editUrl && (
              <div>
                <p style={fieldLabel}>Lien mariés</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...fieldValue, fontSize: 12 }}>{editUrl}</span>
                  <button onClick={() => { navigator.clipboard.writeText(editUrl); alert('Copié !') }} style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968', whiteSpace: 'nowrap' }}>Copier</button>
                </div>
              </div>
            )}
            <div>
              <p style={fieldLabel}>Email des mariés</p>
              {editingEmail ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="email" value={emailValue} onChange={e => setEmailValue(e.target.value)} style={{ flex: 1, fontSize: 13 }} autoFocus />
                  <button onClick={saveEmail} style={{ background: '#E98172', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>OK</button>
                  <button onClick={() => setEditingEmail(false)} style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968' }}>×</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={fieldValue}>{ev.couple_email || '—'}</span>
                  <button onClick={() => { setEmailValue(ev.couple_email || ''); setEditingEmail(true) }} style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968' }}>Modifier</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={infoCardStyle}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 20 }}>
              Statistiques
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Vidéos', value: '—' },
                { label: 'Photos', value: '—' },
                { label: 'Médias invités', value: '—' },
                { label: 'Vues', value: '—' },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, fontStyle: 'italic', color: '#3c3c3b', margin: 0 }}>{s.value}</p>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 11, color: '#9a9a97', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={infoCardStyle}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 16 }}>
              Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => ev.couple_email ? sendEmail() : setEmailModal(true)}
                style={{ width: '100%', background: '#E98172', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', fontWeight: 500 }}
              >
                Envoyer email aux mariés
              </button>
              <button
                onClick={() => setQrModal(true)}
                style={{ width: '100%', background: 'white', color: '#3c3c3b', border: '1px solid #f0e6e0', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}
              >
                QR code
              </button>
              <button
                onClick={deleteEvent}
                style={{ width: '100%', background: 'white', color: '#b71c1c', border: '1px solid #fce4ec', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}
              >
                Supprimer la galerie
              </button>
            </div>
          </div>

          {/* Assign loueur */}
          <div style={infoCardStyle}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 12 }}>
              Loueur associé
            </h3>
            <select
              value={ev.user_id || ''}
              onChange={e => assignUser(e.target.value || null)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #f0e6e0', fontFamily: "'Poppins', sans-serif", fontSize: 13, color: '#3c3c3b' }}
            >
              <option value="">— Aucun loueur —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.firstname} {u.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* QR modal */}
      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setQrModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 400, width: '100%', position: 'relative' }}>
            <button onClick={() => setQrModal(false)} style={{ position: 'absolute', top: 12, right: 16, background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9a9a97' }}>×</button>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic', marginBottom: 20 }}>{ev.couple_name}</h3>
            <img src={`/api/admin/events/${ev.id}/qrcode?t=${token}`} alt="QR Code" width={300} height={300} style={{ display: 'block', margin: '0 auto 20px', borderRadius: 8 }} />
            <button onClick={downloadQR} style={{ background: '#E98172', color: 'white', border: 'none', borderRadius: 999, padding: '10px 28px', fontSize: 12, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>Télécharger</button>
          </div>
        </div>
      )}

      {/* Email modal */}
      {emailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setEmailModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 32, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontStyle: 'italic', marginBottom: 16 }}>Email des mariés</h3>
            <input type="email" placeholder="couple@exemple.com" value={emailValue}
              onChange={e => setEmailValue(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }} autoFocus />
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={sendingEmail || !emailValue} onClick={() => sendEmail(emailValue)}
                style={{ background: '#E98172', color: 'white', border: 'none', borderRadius: 999, padding: '8px 20px', fontSize: 12, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
                {sendingEmail ? 'Envoi...' : 'Envoyer'}
              </button>
              <button onClick={() => setEmailModal(false)} style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 999, padding: '8px 16px', fontSize: 12, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
