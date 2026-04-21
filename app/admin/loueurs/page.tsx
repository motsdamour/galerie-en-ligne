'use client'

import { useState } from 'react'
import { useAdmin } from '@/components/admin/AdminShell'
import Topbar from '@/components/admin/Topbar'

export default function LoueursPage() {
  const { users, token, loadUsers } = useAdmin()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', firstname: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
      setShowAdd(false)
      loadUsers()
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
    if (res.ok) loadUsers()
    else { const data = await res.json(); alert(data.error ?? 'Erreur') }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: '#9B9B9B', fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }

  return (
    <div style={{ padding: '0 36px 36px' }}>
      <Topbar title="Loueurs videobooth" subtitle="Gestion" actionLabel="Ajouter un loueur" onAction={() => setShowAdd(true)} />

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 36, width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontStyle: 'italic', fontWeight: 500, color: '#1A1A1A', marginBottom: 24 }}>Nouveau loueur</h3>
            <form onSubmit={createUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={labelStyle}>Nom</label><input type="text" placeholder="Dupont" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div><label style={labelStyle}>Prénom</label><input type="text" placeholder="Marie" value={form.firstname} onChange={e => setForm(f => ({ ...f, firstname: e.target.value }))} required /></div>
              <div><label style={labelStyle}>Email</label><input type="email" placeholder="marie@exemple.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
              <div><label style={labelStyle}>Téléphone</label><input type="tel" placeholder="06 12 34 56 78" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontFamily: "'Inter', sans-serif", cursor: 'pointer', color: '#6B6B6B' }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontFamily: "'Inter', sans-serif", fontWeight: 500, cursor: 'pointer' }}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid cards */}
      {users.length === 0 ? (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9B9B9B' }}>Aucun loueur pour l&apos;instant.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
          {users.map(u => (
            <div key={u.id} style={{
              background: 'white',
              border: '1px solid #E8E4DF',
              borderRadius: 14,
              padding: 22,
              position: 'relative',
              boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)',
            }}>
              <button
                onClick={() => deleteUser(u.id)}
                disabled={deletingId === u.id}
                style={{
                  position: 'absolute', top: 14, right: 14,
                  background: 'transparent', border: 'none', fontSize: 16,
                  cursor: 'pointer', color: '#9B9B9B',
                  opacity: deletingId === u.id ? 0.5 : 1, padding: 0, lineHeight: 1,
                }}
              >
                ×
              </button>
              <div style={{
                width: 52, height: 52, borderRadius: 999, background: '#2C2C2C',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 500,
                fontStyle: 'italic', marginBottom: 14,
              }}>
                {u.firstname.charAt(0).toUpperCase()}
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: '0 0 2px 0' }}>
                {u.firstname} {u.name}
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#9B9B9B', margin: '0 0 14px 0' }}>
                {u.email}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  background: '#e8f5e9', color: '#2e7d32',
                  padding: '3px 10px', borderRadius: 999,
                  fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 600,
                }}>
                  {u.gallery_count} galerie{u.gallery_count !== 1 ? 's' : ''}
                </span>
                {u.phone && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: '#9B9B9B' }}>
                    {u.phone}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
