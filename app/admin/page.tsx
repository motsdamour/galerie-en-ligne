'use client'

import { useState, useEffect, useRef } from 'react'
import { useAdmin } from '@/components/admin/AdminShell'
import Topbar from '@/components/admin/Topbar'

/* ─── Count-up hook ─── */
function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (started.current || target === 0) { setValue(target); return }
    started.current = true
    const start = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

export default function OverviewPage() {
  const { events, users, token, loadEvents } = useAdmin()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ coupleName: '', eventDate: '', eventType: 'mariage', pcloudFolderId: '', customPassword: '', coupleEmail: '' })
  const [creating, setCreating] = useState(false)
  const [stats, setStats] = useState({ totalGalleries: 0, liveGalleries: 0, totalFiles: 0, sharedFiles: 0 })

  useEffect(() => {
    if (!token) return
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.totalGalleries !== undefined) setStats(d) })
      .catch(() => {})
  }, [token])

  const now = new Date()

  const countTotal = useCountUp(stats.totalGalleries)
  const countLive = useCountUp(stats.liveGalleries)
  const countMedia = useCountUp(stats.totalFiles)
  const countShared = useCountUp(stats.sharedFiles)

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
    const s: Record<string, { bg: string; color: string; label: string }> = {
      active: { bg: '#e8f5e9', color: '#2e7d32', label: 'En ligne' },
      expiring: { bg: '#fff3e0', color: '#e65100', label: 'Expire bientôt' },
      expired: { bg: '#fce4ec', color: '#b71c1c', label: 'Expirée' },
    }
    const st = s[status] || s.active
    return (
      <span style={{
        background: st.bg, color: st.color,
        padding: '3px 10px', borderRadius: 999,
        fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {st.label}
      </span>
    )
  }

  function daysRemaining(ev: typeof events[0]) {
    if (!ev.expires_at) return 30
    return Math.max(0, Math.ceil((new Date(ev.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const recent = [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

  const urgentWatch = events
    .filter(e => e.expires_at && daysRemaining(e) <= 15 && daysRemaining(e) > 0)
    .sort((a, b) => daysRemaining(a) - daysRemaining(b))
  const toWatch = urgentWatch.length > 0
    ? urgentWatch
    : [...events]
        .filter(e => daysRemaining(e) > 0)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4)

  const kpis = [
    { label: 'Galeries créées', value: countTotal, color: '#1A1A1A', bg: '#1A1A1A18',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
    { label: 'En ligne', value: countLive, color: '#6a8b6e', bg: '#6a8b6e18',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
    { label: 'Médias livrés', value: countMedia, color: '#8B7355', bg: '#8B735518',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> },
    { label: 'Souvenirs partagés', value: countShared, color: '#8B7355', bg: '#8B735518',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  ]

  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#9B9B9B', fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

  return (
    <div style={{ padding: '0 36px 36px' }}>
      <Topbar
        title="Bonjour"
        subtitle={today}
        actionLabel="Nouvelle galerie"
        onAction={() => setShowCreate(true)}
      />

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 36, width: '100%', maxWidth: 520 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontStyle: 'italic', fontWeight: 500, color: '#1A1A1A', marginBottom: 24 }}>Nouvelle galerie</h3>
            <form onSubmit={createEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={labelStyle}>Noms des mariés</label><input type="text" placeholder="Sophie & Thomas" value={form.coupleName} onChange={e => setForm(f => ({ ...f, coupleName: e.target.value }))} required /></div>
              <div><label style={labelStyle}>Date</label><input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} required /></div>
              <div><label style={labelStyle}>Type</label><select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}><option value="mariage">Mariage</option><option value="anniversaire">Anniversaire</option><option value="autre">Autre</option></select></div>
              <div><label style={labelStyle}>ID dossier pCloud</label><input type="text" placeholder="123456789" value={form.pcloudFolderId} onChange={e => setForm(f => ({ ...f, pcloudFolderId: e.target.value }))} required /></div>
              <div><label style={labelStyle}>Mot de passe (optionnel)</label><input type="text" placeholder="Généré auto si vide" value={form.customPassword} onChange={e => setForm(f => ({ ...f, customPassword: e.target.value }))} /></div>
              <div><label style={labelStyle}>Email mariés (optionnel)</label><input type="email" placeholder="couple@exemple.com" value={form.coupleEmail} onChange={e => setForm(f => ({ ...f, coupleEmail: e.target.value }))} /></div>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontFamily: "'Inter', sans-serif", cursor: 'pointer', color: '#6B6B6B' }}>Annuler</button>
                <button type="submit" disabled={creating} style={{ background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontFamily: "'Inter', sans-serif", fontWeight: 500, cursor: 'pointer' }}>
                  {creating ? 'Création...' : 'Créer la galerie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{
            background: 'white',
            border: '1px solid #E8E4DF',
            borderRadius: 14,
            padding: 20,
            boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9B9B9B', margin: 0,
              }}>
                {kpi.label}
              </p>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: kpi.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {kpi.icon}
              </div>
            </div>
            <p style={{
              fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 500,
              color: kpi.color, margin: 0, lineHeight: 1,
            }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Galeries récentes */}
        <div style={{ background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)' }}>
          <h3 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: '#1A1A1A', marginBottom: 20, margin: '0 0 20px 0',
          }}>
            Galeries récentes
          </h3>
          {recent.length === 0 ? (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9B9B9B' }}>Aucune galerie.</p>
          ) : (
            <div>
              {recent.map(ev => {
                const status = getStatus(ev)
                return (
                  <a
                    key={ev.id}
                    href={`/admin/galleries/${ev.slug}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 4px', borderBottom: '1px solid #F0EDE8',
                      textDecoration: 'none', color: 'inherit',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F0EDE8')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg, #F0EDE8 0%, #E8E4DF 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                      fontSize: 18, fontWeight: 500, color: '#8B7355', flexShrink: 0,
                    }}>
                      {ev.couple_name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: "'Playfair Display', serif", fontSize: 18,
                        fontStyle: 'italic', fontWeight: 500, color: '#1A1A1A',
                        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.couple_name}
                      </p>
                      <p style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: '#9B9B9B', margin: 0,
                      }}>
                        {ev.event_type} · {new Date(ev.event_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {statusPill(status)}
                    <span style={{ color: '#9B9B9B', fontSize: 14 }}>→</span>
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* À surveiller */}
        <div style={{ background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)' }}>
          <h3 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: 'italic',
            fontWeight: 500, color: '#1A1A1A', marginBottom: 20, margin: '0 0 20px 0',
          }}>
            À surveiller
          </h3>
          {toWatch.length === 0 ? (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9B9B9B' }}>Aucune galerie.</p>
          ) : (
            <div>
              {toWatch.map(ev => {
                const days = daysRemaining(ev)
                const status = getStatus(ev)
                const barColor = days < 7 ? '#c0524c' : days <= 15 ? '#8B7355' : '#6a8b6e'
                const pct = Math.min(100, (days / 30) * 100)
                return (
                  <div key={ev.id} style={{ padding: '12px 0', borderBottom: '1px solid #F0EDE8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={{
                        fontFamily: "'Playfair Display', serif", fontSize: 17,
                        fontStyle: 'italic', fontWeight: 500, color: '#1A1A1A', margin: 0,
                      }}>
                        {ev.couple_name}
                      </p>
                      {statusPill(status)}
                    </div>
                    <div style={{ background: '#E8E4DF', borderRadius: 999, height: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: barColor, transition: 'width 0.3s' }} />
                    </div>
                    <p style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#9B9B9B', marginTop: 4, margin: '4px 0 0 0',
                    }}>
                      {days} jour{days > 1 ? 's' : ''} restant{days > 1 ? 's' : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
