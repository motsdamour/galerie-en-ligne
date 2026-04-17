'use client'

import { useState, useEffect } from 'react'

type Stats = {
  active: number
  expired: number
  total: number
  totalUsers: number
  recent: { id: string; couple_name: string; slug: string; created_at: string; is_active: boolean }[]
}

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('admin_token')
    if (t) { setToken(t); loadStats(t) }
  }, [])

  async function loadStats(t: string) {
    const [evRes, usRes] = await Promise.all([
      fetch('/api/admin/events', { headers: { Authorization: `Bearer ${t}` } }),
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${t}` } }),
    ])
    const events = await evRes.json()
    const users = await usRes.json()

    if (!Array.isArray(events)) return

    const now = new Date()
    const active = events.filter((e: any) => e.is_active && (!e.expires_at || new Date(e.expires_at) > now)).length
    const expired = events.filter((e: any) => e.expires_at && new Date(e.expires_at) <= now).length

    setStats({
      active,
      expired,
      total: events.length,
      totalUsers: Array.isArray(users) ? users.length : 0,
      recent: events.slice(0, 5).map((e: any) => ({
        id: e.id,
        couple_name: e.couple_name,
        slug: e.slug,
        created_at: e.created_at,
        is_active: e.is_active,
      })),
    })
  }

  if (!token) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--brown-muted)', fontFamily: 'Arial' }}>Non connecte. <a href="/admin" style={{ color: 'var(--rose)' }}>Retour admin</a></p>
    </div>
  )

  const cardStyle: React.CSSProperties = {
    background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px',
    padding: '24px', textAlign: 'center',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '32px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: 'var(--rose)', textTransform: 'uppercase', fontFamily: 'Arial', marginBottom: '4px' }}>Back-office</p>
            <h1 style={{ fontSize: '24px', fontStyle: 'italic' }}>Dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="/admin" className="btn-rose" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Galeries</a>
            <a href="/admin/users" className="btn-rose" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Loueurs</a>
          </div>
        </div>

        {stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <div style={cardStyle}>
                <p style={{ fontSize: '32px', fontStyle: 'italic', color: '#0f6e56', marginBottom: '4px' }}>{stats.active}</p>
                <p style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actives</p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: '32px', fontStyle: 'italic', color: '#993556', marginBottom: '4px' }}>{stats.expired}</p>
                <p style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expirees</p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: '32px', fontStyle: 'italic', color: 'var(--rose)', marginBottom: '4px' }}>{stats.total}</p>
                <p style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total galeries</p>
              </div>
              <div style={cardStyle}>
                <p style={{ fontSize: '32px', fontStyle: 'italic', color: 'var(--text-dark)', marginBottom: '4px' }}>{stats.totalUsers}</p>
                <p style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Loueurs</p>
              </div>
            </div>

            <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '32px' }}>
              <h2 style={{ fontSize: '16px', fontStyle: 'italic', marginBottom: '20px' }}>Dernieres galeries</h2>
              <table style={{ width: '100%', fontSize: '13px', fontFamily: 'Arial', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                    {['Couple', 'Date creation', 'Statut', 'Lien'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--brown-muted)', fontWeight: 400, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map(ev => (
                    <tr key={ev.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontStyle: 'italic' }}>{ev.couple_name}</td>
                      <td style={{ padding: '12px', color: 'var(--brown-muted)' }}>{new Date(ev.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: ev.is_active ? '#e1f5ee' : '#fbeaf0', color: ev.is_active ? '#0f6e56' : '#993556', padding: '3px 10px', borderRadius: '10px', fontSize: '11px' }}>
                          {ev.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <a href={`/galerie/${ev.slug}`} target="_blank" style={{ color: 'var(--rose)', textDecoration: 'none' }}>Voir →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
