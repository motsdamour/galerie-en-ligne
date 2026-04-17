'use client'

import { useState, useEffect } from 'react'

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
}

type CreatedEvent = {
  slug: string
  password: string
  galleryUrl: string
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [form, setForm] = useState({ coupleName: '', eventDate: '', eventType: 'mariage', pcloudFolderId: '', customPassword: '', coupleEmail: '' })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatedEvent | null>(null)
  const [editingPwd, setEditingPwd] = useState<{ id: string; value: string } | null>(null)
  const [savingPwd, setSavingPwd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<{ id: string; value: string } | null>(null)
  const [addingPwd, setAddingPwd] = useState<{ id: string; value: string } | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [filter, setFilter] = useState<'active' | 'expired' | 'all'>('all')
  const [emailModal, setEmailModal] = useState<{ id: string; email: string } | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('admin_token')
    if (t) { setToken(t); loadEvents(t); loadUsers(t) }
  }, [])

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
      loadEvents(data.token)
      loadUsers(data.token)
    } else {
      setLoginError(data.error)
    }
  }

  async function loadEvents(t: string) {
    const res = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${t}` } })
    const data = await res.json()
    if (Array.isArray(data)) setEvents(data)
  }

  async function loadUsers(t: string) {
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${t}` } })
    const data = await res.json()
    if (Array.isArray(data)) setUsers(data)
  }

  async function assignUser(eventId: string, userId: string | null) {
    await fetch(`/api/admin/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId }),
    })
    if (token) loadEvents(token)
  }

  async function saveName(id: string, couple_name: string) {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ couple_name }),
    })
    if (res.ok) { setEditingName(null); if (token) loadEvents(token) }
    else { const data = await res.json(); alert(data.error) }
  }

  async function savePasswordPlain(id: string, password_plain: string) {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password_plain }),
    })
    if (res.ok) { setAddingPwd(null); if (token) loadEvents(token) }
    else { const data = await res.json(); alert(data.error) }
  }

  async function deleteEvent(id: string) {
    if (!window.confirm('Supprimer cette galerie ?')) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setDeletingId(null)
    if (res.ok) { if (token) loadEvents(token) }
    else { const data = await res.json(); alert(data.error ?? 'Erreur') }
  }

  async function savePassword(id: string, newPassword: string) {
    setSavingPwd(true)
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: newPassword }),
    })
    setSavingPwd(false)
    if (res.ok) { setEditingPwd(null) }
    else { const data = await res.json(); alert(data.error) }
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
      setCreated(data)
      setForm({ coupleName: '', eventDate: '', eventType: 'mariage', pcloudFolderId: '', customPassword: '', coupleEmail: '' })
      if (token) loadEvents(token)
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
    if (res.ok) { alert('Email envoye !'); if (token) loadEvents(token) }
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

  const now = new Date()
  const filteredEvents = events.filter(ev => {
    if (filter === 'active') return ev.is_active && (!ev.expires_at || new Date(ev.expires_at) > now)
    if (filter === 'expired') return ev.expires_at && new Date(ev.expires_at) <= now
    return true
  })

  if (!token) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: 'var(--rose)', textTransform: 'uppercase', fontFamily: 'Arial', marginBottom: '8px' }}>Back-office</p>
        <h1 style={{ fontSize: '22px', fontStyle: 'italic', marginBottom: '32px' }}>Mots d'Amour</h1>
        <form onSubmit={login}>
          <input type="password" placeholder="Mot de passe admin" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: '12px' }} required/>
          {loginError && <p style={{ fontSize: '12px', color: 'var(--rose)', fontFamily: 'Arial', marginBottom: '12px' }}>{loginError}</p>}
          <button type="submit" className="btn-rose-solid" style={{ width: '100%' }}>Acceder</button>
        </form>
      </div>
    </div>
  )

  const labelStyle: React.CSSProperties = { fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '32px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: 'var(--rose)', textTransform: 'uppercase', fontFamily: 'Arial', marginBottom: '4px' }}>Back-office</p>
            <h1 style={{ fontSize: '24px', fontStyle: 'italic' }}>Mots d'Amour</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="/admin/dashboard" className="btn-rose" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Dashboard</a>
            <a href="/admin/users" className="btn-rose" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Loueurs</a>
            <button className="btn-rose" onClick={() => { localStorage.removeItem('admin_token'); setToken(null) }}>Deconnexion</button>
          </div>
        </div>

        {/* Formulaire creation */}
        <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontStyle: 'italic', marginBottom: '24px' }}>Creer une nouvelle galerie</h2>
          <form onSubmit={createEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Noms des maries</label>
              <input type="text" placeholder="Sophie & Thomas" value={form.coupleName} onChange={e => setForm(f => ({ ...f, coupleName: e.target.value }))} required/>
            </div>
            <div>
              <label style={labelStyle}>Date de l'evenement</label>
              <input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} required/>
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}>
                <option value="mariage">Mariage</option>
                <option value="anniversaire">Anniversaire</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>ID dossier pCloud</label>
              <input type="text" placeholder="123456789" value={form.pcloudFolderId} onChange={e => setForm(f => ({ ...f, pcloudFolderId: e.target.value }))} required/>
            </div>
            <div>
              <label style={labelStyle}>Mot de passe (optionnel)</label>
              <input type="text" placeholder="Genere auto si vide" value={form.customPassword} onChange={e => setForm(f => ({ ...f, customPassword: e.target.value }))}/>
            </div>
            <div>
              <label style={labelStyle}>Email des maries (optionnel)</label>
              <input type="email" placeholder="couple@exemple.com" value={form.coupleEmail} onChange={e => setForm(f => ({ ...f, coupleEmail: e.target.value }))}/>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn-rose-solid" disabled={creating}>
                {creating ? 'Creation...' : 'Creer la galerie'}
              </button>
            </div>
          </form>

          {created && (
            <div style={{ marginTop: '24px', background: 'var(--cream)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
              <p style={{ fontSize: '11px', color: 'var(--rose)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Arial', marginBottom: '12px' }}>Galerie creee</p>
              <div style={{ display: 'grid', gap: '8px', fontFamily: 'Arial', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--brown-muted)' }}>Lien galerie</span>
                  <a href={created.galleryUrl} target="_blank" style={{ color: 'var(--rose)' }}>{created.galleryUrl}</a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--brown-muted)' }}>Mot de passe</span>
                  <strong style={{ color: 'var(--text-dark)', letterSpacing: '0.1em' }}>{created.password}</strong>
                </div>
              </div>
              <button className="btn-rose" style={{ marginTop: '12px' }} onClick={() => {
                navigator.clipboard.writeText(`Votre galerie Mots d'Amour est prete !\n\nLien : ${created.galleryUrl}\nMot de passe : ${created.password}`)
              }}>
                Copier le message
              </button>
            </div>
          )}
        </div>

        {/* Liste galeries */}
        <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontStyle: 'italic' }}>Galeries ({filteredEvents.length})</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['all', 'active', 'expired'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '6px 14px', borderRadius: '16px', fontSize: '11px',
                    fontFamily: 'Arial', cursor: 'pointer', letterSpacing: '0.04em',
                    background: filter === f ? '#e97872' : 'transparent',
                    color: filter === f ? 'white' : 'var(--brown-muted)',
                    border: `0.5px solid ${filter === f ? '#e97872' : 'var(--border)'}`,
                  }}
                >
                  {f === 'all' ? 'Toutes' : f === 'active' ? 'Actives' : 'Expirees'}
                </button>
              ))}
            </div>
          </div>

          {filteredEvents.length === 0
            ? <p style={{ color: 'var(--brown-muted)', fontFamily: 'Arial', fontSize: '13px' }}>Aucune galerie.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', fontFamily: 'Arial', borderCollapse: 'collapse', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                    {['Evenement', 'Loueur', 'Liens', 'Mot de passe', 'Lien maries', 'Expiration', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--brown-muted)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(ev => (
                    <>
                      <tr key={ev.id} style={{ borderBottom: editingPwd?.id === ev.id ? 'none' : '0.5px solid var(--border)' }}>
                        {/* Evenement */}
                        <td style={{ padding: '10px' }}>
                          {editingName?.id === ev.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input type="text" value={editingName.value} onChange={e => setEditingName({ id: ev.id, value: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter' && editingName.value.trim()) saveName(ev.id, editingName.value); if (e.key === 'Escape') setEditingName(null) }}
                                style={{ width: '140px', padding: '4px 6px', fontSize: '12px', fontStyle: 'italic' }} autoFocus />
                              <button onClick={() => editingName.value.trim() && saveName(ev.id, editingName.value)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0f6e56', fontSize: '14px', padding: '2px' }}>ok</button>
                              <button onClick={() => setEditingName(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-muted)', fontSize: '12px', padding: '2px' }}>x</button>
                            </div>
                          ) : (
                            <div>
                              <span style={{ fontStyle: 'italic', cursor: 'pointer' }} onClick={() => setEditingName({ id: ev.id, value: ev.couple_name })}>{ev.couple_name}</span>
                              <div style={{ fontSize: '10px', color: 'var(--brown-muted)', marginTop: '2px' }}>
                                {new Date(ev.event_date).toLocaleDateString('fr-FR')} · {ev.event_type}
                                {' · '}
                                <span style={{ color: ev.is_active ? '#0f6e56' : '#993556' }}>{ev.is_active ? 'Active' : 'Inactive'}</span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Loueur */}
                        <td style={{ padding: '10px' }}>
                          <select value={ev.user_id || ''} onChange={e => assignUser(ev.id, e.target.value || null)}
                            style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '6px', border: '0.5px solid var(--border)', fontFamily: 'Arial', color: 'var(--brown-muted)', background: 'white', maxWidth: '120px' }}>
                            <option value="">—</option>
                            {users.map(u => (<option key={u.id} value={u.id}>{u.firstname} {u.name}</option>))}
                          </select>
                        </td>

                        {/* Liens */}
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <a href={`/galerie/${ev.slug}`} target="_blank" style={{ color: 'var(--rose)', textDecoration: 'none', fontSize: '11px' }}>Invites →</a>
                            {ev.edit_token && <a href={`/galerie/${ev.slug}?edit_token=${ev.edit_token}`} target="_blank" style={{ color: 'var(--brown-muted)', textDecoration: 'none', fontSize: '10px' }}>Editeur →</a>}
                          </div>
                        </td>

                        {/* Mot de passe */}
                        <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--brown-muted)' }}>
                          {ev.password_plain ? ev.password_plain : addingPwd?.id === ev.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input type="text" placeholder="mdp" value={addingPwd.value} onChange={e => setAddingPwd({ id: ev.id, value: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter' && addingPwd.value) savePasswordPlain(ev.id, addingPwd.value); if (e.key === 'Escape') setAddingPwd(null) }}
                                style={{ width: '80px', padding: '3px 6px', fontSize: '11px', fontFamily: 'monospace' }} autoFocus />
                              <button onClick={() => addingPwd.value && savePasswordPlain(ev.id, addingPwd.value)}
                                style={{ background: 'var(--rose)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '9px', padding: '3px 8px', borderRadius: '8px', fontFamily: 'Arial' }}>ok</button>
                            </div>
                          ) : (
                            <button onClick={() => setAddingPwd({ id: ev.id, value: '' })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', fontStyle: 'italic', fontFamily: 'Arial', fontSize: '11px', padding: 0 }}>Ajouter</button>
                          )}
                        </td>

                        {/* Lien maries */}
                        <td style={{ padding: '10px' }}>
                          {ev.edit_token ? (
                            <button onClick={() => {
                              const url = `https://galerie.mots-damour.fr/galerie/${ev.slug}?edit_token=${ev.edit_token}`
                              navigator.clipboard.writeText(url)
                              alert('Lien maries copie !')
                            }} style={{ background: 'transparent', border: '0.5px solid var(--border)', cursor: 'pointer', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontFamily: 'Arial', color: 'var(--brown-muted)' }}>
                              Copier
                            </button>
                          ) : <span style={{ color: 'var(--brown-light)', fontSize: '11px' }}>—</span>}
                        </td>

                        {/* Expiration */}
                        <td style={{ padding: '10px' }}>
                          {(() => {
                            const exp = ev.expires_at ? new Date(ev.expires_at) : new Date(new Date(ev.created_at).getTime() + 365 * 24 * 60 * 60 * 1000)
                            const days = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                            const color = days <= 0 ? '#993556' : days < 7 ? '#c0392b' : days < 30 ? '#e67e22' : '#0f6e56'
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color, fontWeight: 500 }}>
                                  {days <= 0 ? 'Expiree' : `${days}j`}
                                </span>
                                <button onClick={async () => {
                                  await fetch(`/api/admin/events/${ev.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ extend: true }),
                                  })
                                  if (token) loadEvents(token)
                                }} style={{ background: 'transparent', border: '0.5px solid var(--border)', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', fontSize: '9px', fontFamily: 'Arial', color: 'var(--brown-muted)' }}>
                                  +365j
                                </button>
                              </div>
                            )
                          })()}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button className="btn-rose" style={{ fontSize: '9px', padding: '3px 8px' }}
                              onClick={() => setEditingPwd(editingPwd?.id === ev.id ? null : { id: ev.id, value: '' })}>Mdp</button>
                            <button style={{ background: 'transparent', border: '0.5px solid var(--border)', cursor: 'pointer', padding: '3px 8px', borderRadius: '8px', fontSize: '9px', fontFamily: 'Arial', color: 'var(--brown-muted)' }}
                              onClick={() => {
                                if (ev.couple_email) sendEmail(ev.id)
                                else setEmailModal({ id: ev.id, email: '' })
                              }}>Email</button>
                            <button style={{ background: 'transparent', border: '0.5px solid var(--border)', cursor: 'pointer', padding: '3px 8px', borderRadius: '8px', fontSize: '9px', fontFamily: 'Arial', color: 'var(--brown-muted)' }}
                              onClick={() => downloadQR(ev.id)}>QR</button>
                            <button style={{ background: 'transparent', border: 'none', color: '#e57373', fontFamily: 'Arial', fontSize: '10px', cursor: deletingId === ev.id ? 'default' : 'pointer', opacity: deletingId === ev.id ? 0.5 : 1, padding: '3px 0' }}
                              disabled={deletingId === ev.id} onClick={() => deleteEvent(ev.id)}>
                              {deletingId === ev.id ? '...' : 'Suppr'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingPwd?.id === ev.id && (
                        <tr key={`${ev.id}-pwd`} style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--cream)' }}>
                          <td colSpan={7} style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="text" placeholder="Nouveau mot de passe" value={editingPwd.value} onChange={e => setEditingPwd({ id: ev.id, value: e.target.value })}
                                style={{ width: '200px', padding: '6px 10px', fontSize: '12px' }} autoFocus />
                              <button className="btn-rose-solid" style={{ fontSize: '10px', padding: '6px 14px' }} disabled={savingPwd || !editingPwd.value}
                                onClick={() => savePassword(ev.id, editingPwd.value)}>{savingPwd ? '...' : 'Sauver'}</button>
                              <button className="btn-rose" style={{ fontSize: '10px', padding: '6px 12px' }} onClick={() => setEditingPwd(null)}>Annuler</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              </div>
            )
          }
        </div>

      </div>

      {/* Email modal */}
      {emailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setEmailModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '14px', fontStyle: 'italic', marginBottom: '16px' }}>Email des maries</h3>
            <input type="email" placeholder="couple@exemple.com" value={emailModal.email}
              onChange={e => setEmailModal({ ...emailModal, email: e.target.value })}
              style={{ width: '100%', marginBottom: '12px', padding: '10px', borderRadius: '8px', border: '0.5px solid var(--border)', fontSize: '13px' }} autoFocus />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-rose-solid" style={{ fontSize: '11px', padding: '8px 20px' }}
                disabled={sendingEmail || !emailModal.email}
                onClick={() => sendEmail(emailModal.id, emailModal.email)}>
                {sendingEmail ? 'Envoi...' : 'Envoyer'}
              </button>
              <button className="btn-rose" style={{ fontSize: '11px', padding: '8px 16px' }} onClick={() => setEmailModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
