'use client'

import { useState, useEffect } from 'react'
import { useAdmin } from '@/components/admin/AdminShell'
import Topbar from '@/components/admin/Topbar'

type Operator = {
  id: string
  name: string
  slug: string
  email: string
  city: string | null
  phone: string | null
  logo_url: string | null
  pcloud_folder_id: string | null
  is_active: boolean
  created_at: string
}

export default function LoueursPage() {
  const { users, token, loadUsers } = useAdmin()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', firstname: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Operators (comptes loueurs)
  const [operators, setOperators] = useState<Operator[]>([])
  const [showCreateOp, setShowCreateOp] = useState(false)
  const [opForm, setOpForm] = useState({ name: '', slug: '', email: '', password: '', city: '', phone: '', accent_color: '#2C2C2C', bg_color: '#FAFAF8' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [creatingOp, setCreatingOp] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [deletingOpSlug, setDeletingOpSlug] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch('/api/operators', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setOperators(data) })
      .catch(() => {})
  }, [token])

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

  async function createOperator(e: React.FormEvent) {
    e.preventDefault()
    setCreatingOp(true)

    // 1. Create operator
    const res = await fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(opForm),
    })
    const data = await res.json()

    if (!res.ok) {
      setCreatingOp(false)
      alert(data.error)
      return
    }

    let finalData = data

    // 2. Upload logo if selected
    if (logoFile && data.slug) {
      const formData = new FormData()
      formData.append('logo', logoFile)
      const logoRes = await fetch(`/api/operators/${data.slug}/upload-logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const logoData = await logoRes.json()
      if (logoRes.ok && logoData.logo_url) {
        finalData = { ...finalData, logo_url: logoData.logo_url }
      }
    }

    setCreatingOp(false)
    setOperators(prev => [finalData, ...prev])
    setOpForm({ name: '', slug: '', email: '', password: '', city: '', phone: '', accent_color: '#2C2C2C', bg_color: '#FAFAF8' })
    setLogoFile(null)
    setLogoPreview(null)
    setShowCreateOp(false)
    alert(`Compte loueur créé !\nAccès : https://galerie-en-ligne.fr/${data.slug}`)
  }

  async function deleteOperator(opSlug: string) {
    if (!window.confirm('Supprimer ce loueur ? Cette action est irréversible.')) return
    setDeletingOpSlug(opSlug)
    const res = await fetch(`/api/operators/${opSlug}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setDeletingOpSlug(null)
    if (res.ok) {
      setOperators(prev => prev.filter(op => op.slug !== opSlug))
    } else {
      const data = await res.json()
      alert(data.error ?? 'Erreur')
    }
  }

  function generateSlug(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: '#9B9B9B', fontFamily: "'Inter', sans-serif",
    letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }

  return (
    <div style={{ padding: '0 36px 36px' }}>
      <Topbar title="Loueurs videobooth" subtitle="Gestion" actionLabel="Ajouter un loueur" onAction={() => setShowAdd(true)} />

      {/* Section: Comptes loueurs (operators) */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: '#1A1A1A', margin: 0 }}>
            Comptes loueurs
          </h2>
          <button
            onClick={() => setShowCreateOp(true)}
            style={{
              background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 8,
              padding: '8px 16px', fontSize: 12, fontFamily: "'Inter', sans-serif",
              fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Créer un compte loueur
          </button>
        </div>

        {operators.length === 0 ? (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#9B9B9B' }}>Aucun compte loueur créé.</p>
        ) : (
          <div style={{ background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)' }}>
            {operators.map(op => {
              const link = `https://galerie-en-ligne.fr/${op.slug}`
              return (
                <div key={op.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', borderBottom: '1px solid #F0EDE8',
                }}>
                  {op.logo_url ? (
                    <img src={op.logo_url} alt={op.name} style={{ width: 42, height: 42, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 42, height: 42, borderRadius: 999, background: '#2C2C2C',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 500,
                      fontStyle: 'italic', flexShrink: 0,
                    }}>
                      {op.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                      {op.name}
                    </p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#9B9B9B', margin: 0 }}>
                      {op.email}{op.city ? ` · ${op.city}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#6B6B6B', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      /{op.slug}
                    </span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(link); setCopiedLink(op.id); setTimeout(() => setCopiedLink(null), 2000) }}
                      style={{
                        background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 6,
                        padding: '4px 10px', fontSize: 11, fontFamily: "'Inter', sans-serif",
                        fontWeight: 500, cursor: 'pointer', color: '#6B6B6B',
                      }}
                    >
                      {copiedLink === op.id ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                  <span style={{
                    background: op.is_active ? '#e8f5e9' : '#fce4ec',
                    color: op.is_active ? '#2e7d32' : '#b71c1c',
                    padding: '3px 10px', borderRadius: 999,
                    fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 600,
                  }}>
                    {op.is_active ? 'Actif' : 'Inactif'}
                  </span>
                  <button
                    onClick={() => deleteOperator(op.slug)}
                    disabled={deletingOpSlug === op.slug}
                    style={{
                      background: 'transparent', border: 'none', fontSize: 11,
                      fontFamily: "'Inter', sans-serif", cursor: 'pointer', color: '#b71c1c',
                      opacity: deletingOpSlug === op.slug ? 0.5 : 1, padding: '4px 6px', fontWeight: 500,
                    }}
                  >
                    {deletingOpSlug === op.slug ? '...' : 'Suppr'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create operator modal */}
      {showCreateOp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreateOp(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 36, width: '100%', maxWidth: 520 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontStyle: 'italic', fontWeight: 500, color: '#1A1A1A', marginBottom: 24 }}>Nouveau compte loueur</h3>
            <form onSubmit={createOperator} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nom de l&apos;entreprise</label>
                <input type="text" placeholder="VideoFun Lyon" value={opForm.name}
                  onChange={e => { setOpForm(f => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) })) }} required />
              </div>
              <div>
                <label style={labelStyle}>Slug (URL)</label>
                <input type="text" placeholder="videofun-lyon" value={opForm.slug}
                  onChange={e => setOpForm(f => ({ ...f, slug: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" placeholder="contact@videofun.fr" value={opForm.email}
                  onChange={e => setOpForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Mot de passe</label>
                <input type="text" placeholder="Mot de passe initial" value={opForm.password}
                  onChange={e => setOpForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Ville</label>
                <input type="text" placeholder="Lyon" value={opForm.city}
                  onChange={e => setOpForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input type="tel" placeholder="06 12 34 56 78" value={opForm.phone}
                  onChange={e => setOpForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Logo (optionnel, max 10 MB)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={e => {
                      const f = e.target.files?.[0] || null
                      setLogoFile(f)
                      if (f) {
                        const reader = new FileReader()
                        reader.onload = () => setLogoPreview(reader.result as string)
                        reader.readAsDataURL(f)
                      } else {
                        setLogoPreview(null)
                      }
                    }}
                    style={{ flex: 1, fontSize: 13, fontFamily: "'Inter', sans-serif" }}
                  />
                  {logoPreview && (
                    <img src={logoPreview} alt="Aperçu" style={{ height: 40, borderRadius: 6, objectFit: 'contain', border: '1px solid #E8E4DF' }} />
                  )}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Couleur accent</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={opForm.accent_color}
                    onChange={e => setOpForm(f => ({ ...f, accent_color: e.target.value }))}
                    style={{ width: 36, height: 36, padding: 0, border: '1px solid #E8E4DF', borderRadius: 6, cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={opForm.accent_color}
                    onChange={e => setOpForm(f => ({ ...f, accent_color: e.target.value }))}
                    style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Couleur fond</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={opForm.bg_color}
                    onChange={e => setOpForm(f => ({ ...f, bg_color: e.target.value }))}
                    style={{ width: 36, height: 36, padding: 0, border: '1px solid #E8E4DF', borderRadius: 6, cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={opForm.bg_color}
                    onChange={e => setOpForm(f => ({ ...f, bg_color: e.target.value }))}
                    style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
                  />
                </div>
              </div>
              {opForm.slug && (
                <div style={{ gridColumn: 'span 2', background: '#F0EDE8', borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#6B6B6B', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Lien d&apos;accès
                  </p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#1A1A1A', margin: 0 }}>
                    galerie-en-ligne.fr/{opForm.slug}
                  </p>
                </div>
              )}
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowCreateOp(false)} style={{ background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontFamily: "'Inter', sans-serif", cursor: 'pointer', color: '#6B6B6B' }}>Annuler</button>
                <button type="submit" disabled={creatingOp} style={{ background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontFamily: "'Inter', sans-serif", fontWeight: 500, cursor: 'pointer' }}>
                  {creatingOp ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section: Loueurs existants (ancienne table users) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: 'italic', fontWeight: 500, color: '#1A1A1A', margin: 0 }}>
          Loueurs (contacts)
        </h2>
      </div>

      {/* Add user modal */}
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
