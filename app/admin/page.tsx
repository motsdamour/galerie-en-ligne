'use client'

import { useState } from 'react'
import { useAdmin } from '@/components/admin/AdminShell'
import Topbar from '@/components/admin/Topbar'

export default function OverviewPage() {
  const { events, users, token, loadEvents } = useAdmin()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ coupleName: '', eventDate: '', eventType: 'mariage', pcloudFolderId: '', customPassword: '', coupleEmail: '' })
  const [creating, setCreating] = useState(false)

  const now = new Date()
  const activeEvents = events.filter(e => e.is_active && (!e.expires_at || new Date(e.expires_at) > now))
  const expiringSoon = events.filter(e => {
    if (!e.expires_at) return false
    const days = Math.ceil((new Date(e.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return days > 0 && days <= 7
  })

  const today = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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
    } else {
      alert(data.error)
    }
  }

  function getStatus(ev: typeof events[0]) {
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
        fontSize: 11, fontFamily: "'Poppins', sans-serif", fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        {s.label}
      </span>
    )
  }

  function daysRemaining(ev: typeof events[0]) {
    if (!ev.expires_at) return 30
    return Math.max(0, Math.ceil((new Date(ev.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const recent = [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

  return (
    <>
      <Topbar
        title="Bonjour, Christian"
        subtitle={today}
        actionLabel="Nouvelle galerie"
        onAction={() => setShowCreate(true)}
      />

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 36, width: '100%', maxWidth: 520 }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', marginBottom: 24 }}>Nouvelle galerie</h3>
            <form onSubmit={createEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: '#9a9a97', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Noms des mariés</label>
                <input type="text" placeholder="Sophie & Thomas" value={form.coupleName} onChange={e => setForm(f => ({ ...f, coupleName: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a9a97', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Date</label>
                <input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a9a97', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Type</label>
                <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}>
                  <option value="mariage">Mariage</option>
                  <option value="anniversaire">Anniversaire</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a9a97', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>ID dossier pCloud</label>
                <input type="text" placeholder="123456789" value={form.pcloudFolderId} onChange={e => setForm(f => ({ ...f, pcloudFolderId: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a9a97', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Mot de passe (optionnel)</label>
                <input type="text" placeholder="Généré auto si vide" value={form.customPassword} onChange={e => setForm(f => ({ ...f, customPassword: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9a9a97', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email mariés (optionnel)</label>
                <input type="email" placeholder="couple@exemple.com" value={form.coupleEmail} onChange={e => setForm(f => ({ ...f, coupleEmail: e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: '1px solid #f0e6e0', borderRadius: 999, padding: '10px 24px', fontSize: 12, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#6e6968' }}>Annuler</button>
                <button type="submit" disabled={creating} style={{ background: '#E98172', color: 'white', border: 'none', borderRadius: 999, padding: '10px 24px', fontSize: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 500, cursor: 'pointer' }}>
                  {creating ? 'Création...' : 'Créer la galerie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Galeries totales', value: events.length, color: '#3c3c3b' },
          { label: 'En ligne', value: activeEvents.length, color: '#6a8b6e' },
          { label: 'Expire bientôt', value: expiringSoon.length, color: '#c28b3d' },
          { label: 'Médias livrés', value: '—', color: '#b89358' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: 'white', border: '1px solid #f0e6e0', borderRadius: 12, padding: 24,
          }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 600,
              fontStyle: 'italic', color: kpi.color, margin: 0, lineHeight: 1,
            }}>
              {kpi.value}
            </p>
            <p style={{
              fontFamily: "'Poppins', sans-serif", fontSize: 11, color: '#9a9a97',
              letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 8,
            }}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Galeries récentes */}
        <div style={{ background: 'white', border: '1px solid #f0e6e0', borderRadius: 12, padding: 24 }}>
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic',
            fontWeight: 500, color: '#3c3c3b', marginBottom: 20,
          }}>
            Galeries récentes
          </h3>
          {recent.length === 0 ? (
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, color: '#9a9a97' }}>Aucune galerie.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recent.map(ev => {
                const status = getStatus(ev)
                return (
                  <a
                    key={ev.id}
                    href={`/admin/galleries/${ev.slug}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 0', borderBottom: '1px solid #f7f0ec',
                      textDecoration: 'none', color: 'inherit',
                    }}
                  >
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
                      <p style={{
                        fontFamily: "'Poppins', sans-serif", fontSize: 11.5, color: '#9a9a97', margin: 0,
                      }}>
                        {ev.event_type} · {new Date(ev.event_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {statusPill(status)}
                    <span style={{ color: '#9a9a97', fontSize: 16 }}>→</span>
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* Expirations imminentes */}
        <div style={{ background: 'white', border: '1px solid #f0e6e0', borderRadius: 12, padding: 24 }}>
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontStyle: 'italic',
            fontWeight: 500, color: '#3c3c3b', marginBottom: 20,
          }}>
            Expirations imminentes
          </h3>
          {(() => {
            const expiring = events
              .filter(e => e.expires_at && daysRemaining(e) <= 30 && daysRemaining(e) > 0)
              .sort((a, b) => daysRemaining(a) - daysRemaining(b))
            if (expiring.length === 0) return <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, color: '#9a9a97' }}>Aucune expiration imminente.</p>
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {expiring.map(ev => {
                  const days = daysRemaining(ev)
                  const status = getStatus(ev)
                  const barColor = status === 'expiring' ? '#e65100' : '#6a8b6e'
                  const pct = Math.min(100, (days / 30) * 100)
                  return (
                    <div key={ev.id} style={{ padding: '12px 0', borderBottom: '1px solid #f7f0ec' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{
                          fontFamily: "'Cormorant Garamond', serif", fontSize: 16,
                          fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b', margin: 0,
                        }}>
                          {ev.couple_name}
                        </p>
                        {statusPill(status)}
                      </div>
                      <div style={{ background: '#f0e6e0', borderRadius: 999, height: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: barColor, transition: 'width 0.3s' }} />
                      </div>
                      <p style={{
                        fontFamily: "'Poppins', sans-serif", fontSize: 11, color: '#9a9a97', marginTop: 4,
                      }}>
                        {days} jour{days > 1 ? 's' : ''} restant{days > 1 ? 's' : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>
    </>
  )
}
