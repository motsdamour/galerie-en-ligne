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
  const [form, setForm] = useState({ coupleName: '', eventDate: '', eventType: 'mariage', pcloudFolderId: '', customPassword: '' })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatedEvent | null>(null)
  const [editingPwd, setEditingPwd] = useState<{ id: string; value: string } | null>(null)
  const [savingPwd, setSavingPwd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<{ id: string; value: string } | null>(null)
  const [addingPwd, setAddingPwd] = useState<{ id: string; value: string } | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('admin_token')
    if (t) { setToken(t); loadEvents(t) }
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
    } else {
      setLoginError(data.error)
    }
  }

  async function loadEvents(t: string) {
    const res = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${t}` } })
    const data = await res.json()
    if (Array.isArray(data)) setEvents(data)
  }

  async function saveName(id: string, couple_name: string) {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ couple_name }),
    })
    if (res.ok) {
      setEditingName(null)
      if (token) loadEvents(token)
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  async function savePasswordPlain(id: string, password_plain: string) {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password_plain }),
    })
    if (res.ok) {
      setAddingPwd(null)
      if (token) loadEvents(token)
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  async function deleteEvent(id: string) {
    if (!window.confirm('Supprimer cette galerie ?')) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setDeletingId(null)
    if (res.ok) {
      if (token) loadEvents(token)
    } else {
      const data = await res.json()
      alert(data.error ?? 'Erreur lors de la suppression')
    }
  }

  async function savePassword(id: string, newPassword: string) {
    setSavingPwd(true)
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: newPassword }),
    })
    setSavingPwd(false)
    if (res.ok) {
      setEditingPwd(null)
    } else {
      const data = await res.json()
      alert(data.error)
    }
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
      setForm({ coupleName: '', eventDate: '', eventType: 'mariage', pcloudFolderId: '', customPassword: '' })
      if (token) loadEvents(token)
    } else {
      alert(data.error)
    }
  }

  // Page de login
  if (!token) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: 'var(--rose)', textTransform: 'uppercase', fontFamily: 'Arial', marginBottom: '8px' }}>Back-office</p>
        <h1 style={{ fontSize: '22px', fontStyle: 'italic', marginBottom: '32px' }}>Mots d'Amour</h1>
        <form onSubmit={login}>
          <input type="password" placeholder="Mot de passe admin" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: '12px' }} required/>
          {loginError && <p style={{ fontSize: '12px', color: 'var(--rose)', fontFamily: 'Arial', marginBottom: '12px' }}>{loginError}</p>}
          <button type="submit" className="btn-rose-solid" style={{ width: '100%' }}>Accéder</button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '32px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: 'var(--rose)', textTransform: 'uppercase', fontFamily: 'Arial', marginBottom: '4px' }}>Back-office</p>
            <h1 style={{ fontSize: '24px', fontStyle: 'italic' }}>Mots d'Amour</h1>
          </div>
          <button className="btn-rose" onClick={() => { localStorage.removeItem('admin_token'); setToken(null) }}>Déconnexion</button>
        </div>

        {/* Formulaire création */}
        <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontStyle: 'italic', marginBottom: '24px' }}>Créer une nouvelle galerie</h2>
          <form onSubmit={createEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Noms des mariés</label>
              <input type="text" placeholder="Sophie & Thomas" value={form.coupleName} onChange={e => setForm(f => ({ ...f, coupleName: e.target.value }))} required/>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Date de l'événement</label>
              <input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} required/>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Type d'événement</label>
              <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}>
                <option value="mariage">Mariage</option>
                <option value="anniversaire">Anniversaire</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>ID dossier pCloud</label>
              <input type="text" placeholder="123456789" value={form.pcloudFolderId} onChange={e => setForm(f => ({ ...f, pcloudFolderId: e.target.value }))} required/>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '11px', color: 'var(--brown-muted)', fontFamily: 'Arial', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Mot de passe personnalisé (optionnel — généré auto si vide)</label>
              <input type="text" placeholder="Laissez vide pour générer automatiquement" value={form.customPassword} onChange={e => setForm(f => ({ ...f, customPassword: e.target.value }))}/>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn-rose-solid" disabled={creating}>
                {creating ? 'Création...' : 'Créer la galerie'}
              </button>
            </div>
          </form>

          {/* Résultat création */}
          {created && (
            <div style={{ marginTop: '24px', background: 'var(--cream)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
              <p style={{ fontSize: '11px', color: 'var(--rose)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Arial', marginBottom: '12px' }}>Galerie créée avec succès</p>
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
                navigator.clipboard.writeText(`Votre galerie Mots d'Amour est prête !\n\nLien : ${created.galleryUrl}\nMot de passe : ${created.password}\n\nPartagez ce lien à tous vos invités pour qu'ils puissent voir et télécharger leurs vidéos.`)
              }}>
                Copier le message à envoyer aux mariés
              </button>
            </div>
          )}
        </div>

        {/* Liste des galeries */}
        <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '32px' }}>
          <h2 style={{ fontSize: '16px', fontStyle: 'italic', marginBottom: '24px' }}>Galeries existantes ({events.length})</h2>
          {events.length === 0
            ? <p style={{ color: 'var(--brown-muted)', fontFamily: 'Arial', fontSize: '13px' }}>Aucune galerie pour l'instant.</p>
            : (
              <table style={{ width: '100%', fontSize: '13px', fontFamily: 'Arial', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                    {['Événement', 'Date', 'Type', 'Statut', 'Lien', 'Mot de passe', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--brown-muted)', fontWeight: 400, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => (
                    <>
                      <tr key={ev.id} style={{ borderBottom: editingPwd?.id === ev.id ? 'none' : '0.5px solid var(--border)' }}>
                        <td style={{ padding: '12px' }}>
                          {editingName?.id === ev.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="text"
                                value={editingName.value}
                                onChange={e => setEditingName({ id: ev.id, value: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && editingName.value.trim()) saveName(ev.id, editingName.value)
                                  if (e.key === 'Escape') setEditingName(null)
                                }}
                                style={{ width: '160px', padding: '4px 8px', fontSize: '13px', fontStyle: 'italic' }}
                                autoFocus
                              />
                              <button onClick={() => editingName.value.trim() && saveName(ev.id, editingName.value)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0f6e56', fontSize: '15px', padding: '2px', lineHeight: 1 }}>✓</button>
                              <button onClick={() => setEditingName(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-muted)', fontSize: '13px', padding: '2px', lineHeight: 1 }}>✕</button>
                            </div>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontStyle: 'italic' }}>
                              {ev.couple_name}
                              <button onClick={() => setEditingName({ id: ev.id, value: ev.couple_name })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 2px', fontSize: '11px', opacity: 0.45, lineHeight: 1 }} title="Modifier le nom">✏️</button>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--brown-muted)' }}>{new Date(ev.event_date).toLocaleDateString('fr-FR')}</td>
                        <td style={{ padding: '12px', color: 'var(--brown-muted)', textTransform: 'capitalize' }}>{ev.event_type}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: ev.is_active ? '#e1f5ee' : '#fbeaf0', color: ev.is_active ? '#0f6e56' : '#993556', padding: '3px 10px', borderRadius: '10px', fontSize: '11px' }}>
                            {ev.is_active ? 'Active' : 'Désactivée'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <a href={`/galerie/${ev.slug}`} target="_blank" style={{ color: 'var(--rose)', textDecoration: 'none' }}>Voir →</a>
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--brown-muted)' }}>
                          {ev.password_plain ? ev.password_plain : addingPwd?.id === ev.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="text"
                                placeholder="Mot de passe"
                                value={addingPwd.value}
                                onChange={e => setAddingPwd({ id: ev.id, value: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && addingPwd.value) savePasswordPlain(ev.id, addingPwd.value)
                                  if (e.key === 'Escape') setAddingPwd(null)
                                }}
                                style={{ width: '110px', padding: '4px 8px', fontSize: '12px', fontFamily: 'monospace' }}
                                autoFocus
                              />
                              <button
                                onClick={() => addingPwd.value && savePasswordPlain(ev.id, addingPwd.value)}
                                style={{ background: 'var(--rose)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '10px', padding: '4px 10px', borderRadius: '10px', fontFamily: 'Arial', whiteSpace: 'nowrap' }}
                              >Régénérer</button>
                              <button onClick={() => setAddingPwd(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-muted)', fontSize: '13px', padding: '2px', lineHeight: 1 }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setAddingPwd({ id: ev.id, value: '' })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', fontStyle: 'italic', fontFamily: 'Arial', fontSize: '12px', padding: 0 }}>Ajouter…</button>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              className="btn-rose"
                              style={{ fontSize: '10px', padding: '4px 12px' }}
                              onClick={() => setEditingPwd(editingPwd?.id === ev.id ? null : { id: ev.id, value: '' })}
                            >
                              Modifier mdp
                            </button>
                            <button
                              style={{
                                background: 'transparent', border: 'none', color: '#e57373',
                                fontFamily: "'Poppins', sans-serif", fontSize: '11px',
                                cursor: deletingId === ev.id ? 'default' : 'pointer',
                                opacity: deletingId === ev.id ? 0.5 : 1, padding: '4px 0',
                              }}
                              disabled={deletingId === ev.id}
                              onClick={() => deleteEvent(ev.id)}
                            >
                              {deletingId === ev.id ? '…' : 'Supprimer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingPwd?.id === ev.id && (
                        <tr key={`${ev.id}-pwd`} style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--cream)' }}>
                          <td colSpan={7} style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="text"
                                placeholder="Nouveau mot de passe"
                                value={editingPwd.value}
                                onChange={e => setEditingPwd({ id: ev.id, value: e.target.value })}
                                style={{ width: '220px', padding: '6px 10px', fontSize: '13px' }}
                                autoFocus
                              />
                              <button
                                className="btn-rose-solid"
                                style={{ fontSize: '11px', padding: '6px 16px' }}
                                disabled={savingPwd || !editingPwd.value}
                                onClick={() => savePassword(ev.id, editingPwd.value)}
                              >
                                {savingPwd ? '…' : 'Sauvegarder'}
                              </button>
                              <button
                                className="btn-rose"
                                style={{ fontSize: '11px', padding: '6px 14px' }}
                                onClick={() => setEditingPwd(null)}
                              >
                                Annuler
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
