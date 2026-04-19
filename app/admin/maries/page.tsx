'use client'

import { useAdmin } from '@/components/admin/AdminShell'
import Topbar from '@/components/admin/Topbar'

export default function MariesPage() {
  const { events } = useAdmin()
  const now = new Date()

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
        fontSize: 11, fontFamily: "'Poppins', sans-serif", fontWeight: 600,
      }}>
        {s.label}
      </span>
    )
  }

  function getInitials(name: string) {
    const parts = name.split(/\s*[&]\s*/)
    if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[1].trim().charAt(0).toUpperCase()
    return name.charAt(0).toUpperCase()
  }

  return (
    <div style={{ padding: '0 36px 36px' }}>
      <Topbar title="Mariés" subtitle="Gestion" />

      <div style={{ background: 'white', border: '1px solid #f0e6e0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px -4px rgba(60,60,59,.06)' }}>
        {events.length === 0 ? (
          <p style={{ padding: 24, fontFamily: "'Poppins', sans-serif", fontSize: 13, color: '#9a9a97' }}>Aucun couple enregistré.</p>
        ) : (
          events.map(ev => {
            const status = getStatus(ev)
            return (
              <a
                key={ev.id}
                href={`/admin/galleries/${ev.slug}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 20px', borderBottom: '1px solid #f7f0ec',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#faf6f3')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 999, background: '#f7f0ec',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 600,
                  color: '#6e6968', flexShrink: 0,
                }}>
                  {getInitials(ev.couple_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
                    fontStyle: 'italic', fontWeight: 500, color: '#3c3c3b',
                    margin: 0,
                  }}>
                    {ev.couple_name}
                  </p>
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#9a9a97', margin: 0,
                  }}>
                    {ev.couple_email || '—'}
                  </p>
                </div>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 12, color: '#6e6968', margin: 0, whiteSpace: 'nowrap' }}>
                  {new Date(ev.event_date).toLocaleDateString('fr-FR')}
                </p>
                {statusPill(status)}
                <span style={{ color: '#b3aeac', fontSize: 14 }}>→</span>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}
