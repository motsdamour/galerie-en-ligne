'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'

type Event = {
  id: string
  couple_name: string
  event_date: string
  event_type: string
  slug: string
  is_active: boolean
  expires_at: string
  created_at: string
  password_plain: string | null
  user_id: string | null
  edit_token: string | null
  couple_email: string | null
}

type User = {
  id: string
  name: string
  firstname: string
  email: string
  phone: string | null
  is_active: boolean
  gallery_count: number
}

type AdminContextType = {
  token: string
  events: Event[]
  users: User[]
  loadEvents: () => Promise<void>
  loadUsers: () => Promise<void>
  logout: () => void
}

export const AdminContext = createContext<AdminContextType | null>(null)
export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminShell')
  return ctx
}

/* ─── NAV CONFIG ─── */
const NAV_ITEMS = [
  {
    label: "Vue d\u2019ensemble", href: '/admin',
    icon: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    label: 'Galeries', href: '/admin/galleries', badge: true,
    icon: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>,
  },
  {
    label: 'Mariés', href: '/admin/maries',
    icon: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  },
  {
    label: 'Loueurs', href: '/admin/loueurs',
    icon: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    label: 'Calendrier', href: '/admin/calendrier',
    icon: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    label: 'Statistiques', href: '/admin/statistiques',
    icon: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
]

const ACCOUNT_ITEMS = [
  {
    label: 'Paramètres', href: '/admin/parametres',
    icon: (c: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [checking, setChecking] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const t = localStorage.getItem('admin_token')
    if (t) {
      setToken(t)
      fetchEvents(t)
      fetchUsers(t)
    }
    setChecking(false)
  }, [])

  async function fetchEvents(t: string) {
    const res = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) { if (res.status === 401) { localStorage.removeItem('admin_token'); setToken(null) }; return }
    const data = await res.json()
    if (Array.isArray(data)) setEvents(data)
  }

  async function fetchUsers(t: string) {
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data)) setUsers(data)
  }

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (res.ok) {
      localStorage.setItem('admin_token', data.token)
      setToken(data.token)
      fetchEvents(data.token)
      fetchUsers(data.token)
    } else {
      setLoginError(data.error)
    }
  }

  function logout() {
    localStorage.removeItem('admin_token')
    setToken(null)
    setEvents([])
    setUsers([])
  }

  if (checking) return null

  /* ─── LOGIN SCREEN ─── */
  if (!token) return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', border: '1px solid #E8E4DF', borderRadius: 16, padding: 40, width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.16em', color: '#8B7355', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>Back-office</p>
        <h1 style={{ fontSize: 22, fontStyle: 'italic', fontFamily: "'Playfair Display', serif", marginBottom: 32, color: '#1A1A1A' }}>Galerie en ligne</h1>
        <form onSubmit={login}>
          <input type="password" placeholder="Mot de passe admin" value={password} onChange={e => setPassword(e.target.value)}
            style={{ marginBottom: 12, width: '100%', padding: '10px 14px', border: '1px solid #E8E4DF', borderRadius: 6, fontSize: 14, fontFamily: "'Inter', sans-serif", color: '#1A1A1A', outline: 'none' }} required />
          {loginError && <p style={{ fontSize: 12, color: '#c0524c', fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>{loginError}</p>}
          <button type="submit" style={{ width: '100%', background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 12, fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Accéder</button>
        </form>
      </div>
    </div>
  )

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  /* ─── NAV ITEM RENDERER ─── */
  function NavItem({ item }: { item: typeof NAV_ITEMS[0] }) {
    const active = isActive(item.href)
    const iconColor = active ? '#2C2C2C' : '#9B9B9B'
    return (
      <a
        href={item.href}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 14px',
          borderRadius: 10,
          textDecoration: 'none',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13.5,
          fontWeight: active ? 600 : 500,
          color: active ? '#2C2C2C' : '#6B6B6B',
          background: active ? '#fff' : 'transparent',
          boxShadow: active ? '0 2px 10px -4px rgba(0,0,0,.08)' : 'none',
          marginBottom: 2,
          transition: 'all 0.15s ease',
        }}
      >
        {item.icon(iconColor)}
        <span style={{ flex: 1 }}>{item.label}</span>
        {'badge' in item && item.badge && events.length > 0 && (
          <span style={{
            background: active ? '#2C2C2C' : '#E8E4DF',
            color: active ? 'white' : '#6B6B6B',
            fontSize: 10.5,
            fontWeight: 600,
            borderRadius: 999,
            padding: '1px 8px',
            minWidth: 22,
            textAlign: 'center',
          }}>
            {events.length}
          </span>
        )}
      </a>
    )
  }

  return (
    <AdminContext.Provider value={{
      token,
      events,
      users,
      loadEvents: () => fetchEvents(token),
      loadUsers: () => fetchUsers(token),
      logout,
    }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8' }}>
        {/* ─── SIDEBAR ─── */}
        <aside style={{
          width: 248,
          minWidth: 248,
          background: '#FAFAF8',
          borderRight: '1px solid #E8E4DF',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}>
          {/* Logo */}
          <div style={{ padding: '28px 22px 20px' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 30,
              fontWeight: 500,
              fontStyle: 'italic',
              color: '#1A1A1A',
              margin: 0,
              lineHeight: 1.15,
            }}>
              Galerie en ligne
            </h2>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#9B9B9B',
              marginTop: 3,
            }}>
              Studio admin
            </p>
          </div>

          {/* Main nav */}
          <nav style={{ flex: 1, padding: '0 12px' }}>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#9B9B9B',
              padding: '18px 14px 10px',
              margin: 0,
            }}>
              Navigation
            </p>
            {NAV_ITEMS.map(item => <NavItem key={item.href} item={item} />)}

            {/* Compte section */}
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#9B9B9B',
              padding: '26px 14px 10px',
              margin: 0,
            }}>
              Compte
            </p>
            {ACCOUNT_ITEMS.map(item => <NavItem key={item.href} item={item as any} />)}
          </nav>

          {/* Footer user */}
          <div style={{
            margin: '12px',
            padding: '14px 14px',
            background: 'white',
            border: '1px solid #E8E4DF',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: '#2C2C2C',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Playfair Display', serif",
              fontSize: 17,
              fontWeight: 500,
              fontStyle: 'italic',
              flexShrink: 0,
            }}>
              A
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#1A1A1A', margin: 0, lineHeight: 1.3 }}>Admin</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#9B9B9B', margin: 0, lineHeight: 1.3 }}>Administrateur</p>
            </div>
            <button
              onClick={logout}
              title="Déconnexion"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: '#9B9B9B',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <main style={{ flex: 1, minWidth: 0, background: '#FAFAF8' }}>
          {children}
        </main>
      </div>
    </AdminContext.Provider>
  )
}
