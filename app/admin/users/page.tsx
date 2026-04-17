'use client'

import { useState, useEffect } from 'react'

type User = {
  id: string
  name: string
  firstname: string
  email: string
  phone: string | null
  is_active: boolean
  gallery_count: number
}

export default function UsersPage() {
  const [token, setToken] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', firstname: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('admin_token')
    if (t) { setToken(t); loadUsers(t) }
  }, [])

  async function loadUsers(t: string) {
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${t}` } })
    const data = await res.json()
    if (Array.isArray(data)) setUsers(data)
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setForm({ name: '', firstname: '', email: '', phone: '' })
      setAdding(false)
      if (token) loadUsers(token)
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  async function deleteUser(id: string) {
    if (!window.confirm('Supprimer ce loueur ? Ses galeries seront dissociées.')) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setDeletingId(null)
    if (res.ok) {
      if (token) loadUsers(token)
    } else {
      const data = await res.json()
      alert(data.error ?? 'Erreur')
    }
  }

  if (!token) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--brown-muted)', fontFamily: 'Arial' }}>Non connecté. <a href="/admin" style={{ color: 'var(--rose)' }}>Retour admin</a></p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '32px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: 'var(--rose)', textTransform: 'uppercase', fontFamily: 'Arial', marginBottom: '4px' }}>Back-office</p>
            <h1 style={{ fontSize: '24px', fontStyle: 'italic' }}>Loueurs</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="/admin" className="btn-rose" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Galeries</a>
            <button className="btn-rose" onClick={() => { localStorage.removeItem('admin_token'); setToken(null) }}>Deconnexion</button>
          </div>
        </div>

        {/* Liste loueurs */}
        <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontStyle: 'italic' }}>Loueurs ({users.length})</h2>
            <button className="btn-rose-solid" style={{ fontSize: '11px', padding: '8px 20px' }} onClick={() => setAdding(a => !a)}>
              {adding ? 'Annuler' : 'Ajouter un loueur'}
            </button>
          </div>

          {/* Formulaire ajout */}
          {adding && (
            <form onSubmit={createUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', padding: '20px', background: 'var(--cream)', borderRadius: '8px', border: '0.5px solid var(--border)' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nom</label>
                <input type="text" placeholder="Dupont" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Prenom</label>
                <input type="text" placeholder="Marie" value={form.firstname} onChange={e => setForm(f => ({ ...f, firstname: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Email</label>
                <input type="email" placeholder="marie@exemple.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Telephone</label>
                <input type="tel" placeholder="06 12 34 56 78" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <button type="submit" className="btn-rose-solid" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}

          {users.length === 0
            ? <p style={{ color: 'var(--brown-muted)', fontFamily: 'Arial', fontSize: '13px' }}>Aucun loueur pour l'instant.</p>
            : (
              <table style={{ width: '100%', fontSize: '13px', fontFamily: 'Arial', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                    {['Nom', 'Prenom', 'Email', 'Telephone', 'Galeries', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--brown-muted)', fontWeight: 400, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: '12px' }}>{u.firstname}</td>
                      <td style={{ padding: '12px' }}>
                        <a href={`mailto:${u.email}`} style={{ color: 'var(--rose)', textDecoration: 'none' }}>{u.email}</a>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--brown-muted)' }}>{u.phone || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: '#e1f5ee', color: '#0f6e56', padding: '3px 10px', borderRadius: '10px', fontSize: '11px' }}>
                          {u.gallery_count}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          style={{
                            background: 'transparent', border: 'none', color: '#e57373',
                            fontFamily: "'Poppins', sans-serif", fontSize: '11px',
                            cursor: deletingId === u.id ? 'default' : 'pointer',
                            opacity: deletingId === u.id ? 0.5 : 1, padding: '4px 0',
                          }}
                          disabled={deletingId === u.id}
                          onClick={() => deleteUser(u.id)}
                        >
                          {deletingId === u.id ? '...' : 'Supprimer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </div>
  )
}
