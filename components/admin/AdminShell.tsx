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

const NAV_ITEMS = [
  { label: 'Vue d\u2019ensemble', href: '/admin', icon: '◻' },
  { label: 'Galeries', href: '/admin/galleries', icon: '◻', badge: true },
  { label: 'Mariés', href: '/admin/maries', icon: '◻' },
  { label: 'Loueurs', href: '/admin/loueurs', icon: '◻' },
  { label: 'Calendrier', href: '/admin/calendrier', icon: '◻' },
  { label: 'Statistiques', href: '/admin/statistiques', icon: '◻' },
]

const ACCOUNT_ITEMS = [
  { label: 'Paramètres', href: '/admin/parametres', icon: '◻' },
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

  // Login screen — kept identical to original
  if (!token) return (
    <div style={{ minHeight: '100vh', background: '#fff8f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', border: '1px solid #f0e6e0', borderRadius: 16, padding: 40, width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.16em', color: '#E98172', textTransform: 'uppercase', fontFamily: "'Poppins', sans-serif", marginBottom: 8 }}>Back-office</p>
        <h1 style={{ fontSize: 22, fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif", marginBottom: 32, color: '#3c3c3b' }}>Mots d&apos;Amour</h1>
        <form onSubmit={login}>
          <input type="password" placeholder="Mot de passe admin" value={password} onChange={e => setPassword(e.target.value)}
            style={{ marginBottom: 12, width: '100%', padding: '10px 14px', border: '1px solid #f0e6e0', borderRadius: 6, fontSize: 14, fontFamily: "'Poppins', sans-serif", color: '#3c3c3b', outline: 'none' }} required />
          {loginError && <p style={{ fontSize: 12, color: '#E98172', fontFamily: "'Poppins', sans-serif", marginBottom: 12 }}>{loginError}</p>}
          <button type="submit" style={{ width: '100%', background: '#E98172', color: 'white', border: 'none', borderRadius: 20, padding: '10px 24px', fontSize: 12, fontFamily: "'Poppins', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Accéder</button>
        </form>
      </div>
    </div>
  )

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
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
      <div style={{ display: 'flex', minHeight: '100vh', background: '#fff8f5' }}>
        {/* Sidebar */}
        <aside style={{
          width: 248,
          minWidth: 248,
          background: '#fff8f5',
          borderRight: '1px solid #f0e6e0',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}>
          {/* Logo */}
          <div style={{ padding: '28px 24px 24px' }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22,
              fontWeight: 500,
              fontStyle: 'italic',
              color: '#3c3c3b',
              margin: 0,
              lineHeight: 1.2,
            }}>
              Mots d&apos;amour
            </h2>
            <p style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#9a9a97',
              marginTop: 2,
            }}>
              Studio admin
            </p>
          </div>

          {/* Main nav */}
          <nav style={{ flex: 1, padding: '0 12px' }}>
            <p style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#9a9a97',
              padding: '16px 12px 8px',
              margin: 0,
            }}>
              Navigation
            </p>
            {NAV_ITEMS.map(item => {
              const active = isActive(item.href)
              return (
                <a
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? '#E98172' : '#3c3c3b',
                    background: active ? '#fef0ee' : 'transparent',
                    marginBottom: 2,
                    transition: 'background 0.15s',
                  }}
                >
                  {item.label}
                  {item.badge && events.length > 0 && (
                    <span style={{
                      background: '#E98172',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 600,
                      borderRadius: 999,
                      padding: '1px 7px',
                      marginLeft: 'auto',
                    }}>
                      {events.length}
                    </span>
                  )}
                </a>
              )
            })}

            {/* Compte section */}
            <p style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#9a9a97',
              padding: '24px 12px 8px',
              margin: 0,
            }}>
              Compte
            </p>
            {ACCOUNT_ITEMS.map(item => {
              const active = isActive(item.href)
              return (
                <a
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active ? '#E98172' : '#3c3c3b',
                    background: active ? '#fef0ee' : 'transparent',
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </a>
              )
            })}

            {/* Espace réservations */}
            <p style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#9a9a97',
              padding: '24px 12px 8px',
              margin: 0,
            }}>
              Espace réservations
            </p>
            <a
              href="https://mda-dashboard.vercel.app/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                fontFamily: "'Poppins', sans-serif",
                fontSize: 13,
                color: '#3c3c3b',
              }}
            >
              Dashboard réservations
              <span style={{ fontSize: 10, color: '#9a9a97', marginLeft: 'auto' }}>↗</span>
            </a>
          </nav>

          {/* Footer user */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #f0e6e0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: '#3c3c3b',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Poppins', sans-serif",
              fontSize: 14,
              fontWeight: 500,
            }}>
              C
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 500, color: '#3c3c3b', margin: 0 }}>Christian</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 10, color: '#9a9a97', margin: 0 }}>Administrateur</p>
            </div>
            <button
              onClick={logout}
              title="Déconnexion"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                color: '#9a9a97',
                padding: 4,
              }}
            >
              ⏻
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '28px 36px', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </AdminContext.Provider>
  )
}
