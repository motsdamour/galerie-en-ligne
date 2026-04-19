'use client'

import { useState } from 'react'
import { useAdmin } from '@/components/admin/AdminShell'
import Topbar from '@/components/admin/Topbar'

export default function GalleriesPage() {
  const { events, users, token, loadEvents } = useAdmin()
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ coupleName: '', eventDate: '', eventType: 'mariage', pcloudFolderId: '', customPassword: '', coupleEmail: '' })
  const [creating, setCreating] = useState(false)
  const [emailModal, setEmailModal] = useState<{ id: string; email: string } | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [qrModal, setQrModal] = useState<{ id: string; name: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const now = new Date()

  function getStatus(ev: typeof events[0]) {
    if (!ev.expires_at) return 'active'
    const days = Math.ceil((new Date(ev.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'expired'
    if (days <= 7) return 'expiring'
    return 'active'
  }

  const filtered = events.filter(ev => {
    if (filter === 'all') return true
    return getStatus(ev) === filter
  })

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
        fontSize: 11, fontFamily: "'Poppins', sans-serif", fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        {s.label}
      </span>
    )
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCreating(false)
    if (res.ok) {
      setForm({ coupleName: '', eventDate: '', eventType: 'mariage', pcloudFolderId: '', customPassword: '', coupleEmail: '' })
      setShowCreate(false)
      loadEvents()
      alert(`Galerie créée !\nLien : ${data.galleryUrl}\nMot de passe : ${data.password}`)
    } else { alert(data.error) }
  }

  async function sendEmail(id: string, coupleEmail?: string) {
    setSendingEmail(true)
    const res = await fetch(`/api/admin/events/${id}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ couple_email: coupleEmail }),
    })
    setSendingEmail(false)
    setEmailModal(null)
    if (res.ok) { alert('Email envoyé !'); loadEvents() }
    else { const data = await res.json(); alert(data.error) }
  }

  async function downloadQR(id: string) {
    const res = await fetch(`/api/admin/events/${id}/qrcode`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `qr-${id}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function deleteEvent(id: string) {
    if (!window.confirm('Supprimer cette galerie ?')) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setDeletingId(null)
    if (res.ok) loadEvents()
    else { const data = await res.json(); alert(data.error ?? 'Erreur') }
  }

  const filters = [
    { key: 'all' as const, label: 'Toutes' },
    { key: 'active' as const, label: 'Actives' },
    { key: 'expiring' as const, label: 'Expire bientôt' },
    { key: 'expired' as const, label: 'Expirées' },
  ]

  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#9a9a97', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

  return (
    <>
      <Topbar title="Galeries" subtitle="Gestion" actionLabel="Nouvelle galerie" onAction={() => setShowCreate(true)} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 18px', borderRadius: 999, fontSize: 12,
              fontFamily: "'Poppins', sans-serif", cursor: 'pointer',
              background: filter === f.key ? '#E98172' : 'white',
              color: filter === f.key ? 'white' : '#6e6968',
              border: `1px solid ${filter === f.key ? '#E98172' : '#f0e6e0'}`,
              fontWeight: filter === f.key ? 500 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Gallery list */}
      <div style={{ background: 'white', border: '1px solid #f0e6e0', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ padding: 24, fontFamily: "'Poppins', sans-serif", fontSize: 13, color: '#9a9a97' }}>Aucune galerie.</p>
        ) : (
          filtered.map(ev => {
            const status = getStatus(ev)
            const user = users.find(u => u.id === ev.user_id)
            return (
              <div key={ev.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px', borderBottom: '1px solid #f7f0ec',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 999, background: '#f7f0ec',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                  fontSize: 16, color: '#6e6968', flexShrink: 0,
                }}>
                  {ev.couple_name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
                    fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b',
                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ev.couple_name}
                  </p>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 11.5, color: '#9a9a97', margin: 0 }}>
                    {ev.event_type} · {new Date(ev.event_date).toLocaleDateString('fr-FR')}
                    {user && ` · ${user.firstname} ${user.name}`}
                  </p>
                </div>
                {statusPill(status)}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); ev.couple_email ? sendEmail(ev.id) : setEmailModal({ id: ev.id, email: '' }) }}
                    style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968' }}
                  >
                    Email
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setQrModal({ id: ev.id, name: ev.couple_name }) }}
                    style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968' }}
                  >
                    QR
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id) }}
                    disabled={deletingId === ev.id}
                    style={{ background: 'transparent', border: 'none', fontSize: 11, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#b71c1c', opacity: deletingId === ev.id ? 0.5 : 1, padding: '5px 4px' }}
                  >
                    {deletingId === ev.id ? '...' : 'Suppr'}
                  </button>
                </div>
                <a href={`/admin/galleries/${ev.slug}`} style={{ color: '#9a9a97', fontSize: 18, textDecoration: 'none', padding: '4px 0' }}>→</a>
              </div>
            )
          })
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 36, width: '100%', maxWidth: 520 }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 24 }}>Nouvelle galerie</h3>
            <form onSubmit={createEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={labelStyle}>Noms des mariés</label><input type="text" placeholder="Sophie & Thomas" value={form.coupleName} onChange={e => setForm(f => ({ ...f, coupleName: e.target.value }))} required /></div>
              <div><label style={labelStyle}>Date</label><input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} required /></div>
              <div><label style={labelStyle}>Type</label><select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}><option value="mariage">Mariage</option><option value="anniversaire">Anniversaire</option><option value="autre">Autre</option></select></div>
              <div><label style={labelStyle}>ID dossier pCloud</label><input type="text" placeholder="123456789" value={form.pcloudFolderId} onChange={e => setForm(f => ({ ...f, pcloudFolderId: e.target.value }))} required /></div>
              <div><label style={labelStyle}>Mot de passe (optionnel)</label><input type="text" placeholder="Généré auto si vide" value={form.customPassword} onChange={e => setForm(f => ({ ...f, customPassword: e.target.value }))} /></div>
              <div><label style={labelStyle}>Email mariés (optionnel)</label><input type="email" placeholder="couple@exemple.com" value={form.coupleEmail} onChange={e => setForm(f => ({ ...f, coupleEmail: e.target.value }))} /></div>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 999, padding: '10px 24px', fontSize: 12, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968' }}>Annuler</button>
                <button type="submit" disabled={creating} style={{ background: '#E98172', color: 'white', border: 'none', borderRadius: 999, padding: '10px 24px', fontSize: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 500, cursor: 'pointer' }}>
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR modal */}
      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setQrModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 400, width: '100%' }}>
            <button onClick={() => setQrModal(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9a9a97' }}>×</button>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic', marginBottom: 20 }}>{qrModal.name}</h3>
            <img src={`/api/admin/events/${qrModal.id}/qrcode?t=${token}`} alt="QR Code" width={300} height={300} style={{ display: 'block', margin: '0 auto 20px', borderRadius: 8 }} />
            <button onClick={() => downloadQR(qrModal.id)} style={{ background: '#E98172', color: 'white', border: 'none', borderRadius: 999, padding: '10px 28px', fontSize: 12, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>Télécharger</button>
          </div>
        </div>
      )}

      {/* Email modal */}
      {emailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setEmailModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, padding: 32, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontStyle: 'italic', marginBottom: 16 }}>Email des mariés</h3>
            <input type="email" placeholder="couple@exemple.com" value={emailModal.email}
              onChange={e => setEmailModal({ ...emailModal, email: e.target.value })}
              style={{ width: '100%', marginBottom: 12 }} autoFocus />
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={sendingEmail || !emailModal.email} onClick={() => sendEmail(emailModal.id, emailModal.email)}
                style={{ background: '#E98172', color: 'white', border: 'none', borderRadius: 999, padding: '8px 20px', fontSize: 12, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
                {sendingEmail ? 'Envoi...' : 'Envoyer'}
              </button>
              <button onClick={() => setEmailModal(null)} style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 999, padding: '8px 16px', fontSize: 12, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
