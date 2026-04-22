'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type OperatorProfile = {
  accent_color: string | null
  bg_color: string | null
  welcome_message: string | null
  logo_url: string | null
  default_expires_days: number | null
}

export default function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  const [form, setForm] = useState({
    accent_color: '#2C2C2C',
    bg_color: '#FAFAF8',
    welcome_message: '',
    logo_url: '',
    default_expires_days: '90',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
      return
    }
    const opSlug = (session?.user as any)?.operatorSlug
    if (opSlug && opSlug !== slug) {
      router.push(`/${opSlug}/profile`)
      return
    }

    // Fetch operator data
    fetch(`/api/operators/${slug}`, {
      headers: { Authorization: 'Bearer __skip__' }, // Will use NextAuth session cookie
    })
      .then(r => r.json())
      .then(data => {
        const op = data.operator || data
        if (op) {
          setForm({
            accent_color: op.accent_color || '#2C2C2C',
            bg_color: op.bg_color || '#FAFAF8',
            welcome_message: op.welcome_message || '',
            logo_url: op.logo_url || '',
            default_expires_days: String(op.default_expires_days || 90),
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, router, session, sessionStatus])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/operators/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accent_color: form.accent_color,
          bg_color: form.bg_color,
          welcome_message: form.welcome_message,
          logo_url: form.logo_url || null,
          default_expires_days: parseInt(form.default_expires_days) || 90,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json()
        alert(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch {
      alert('Erreur réseau')
    }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '1px solid #2C2C2C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: '15px', fontWeight: 300, color: '#6B6B6B', fontFamily: 'Inter, sans-serif' }}>Chargement...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#6B6B6B',
    display: 'block', marginBottom: 4,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #E8E4DF', borderRadius: 8,
    fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      {/* Header */}
      <header style={{
        background: '#FAFAF8', borderBottom: '1px solid #E8E4DF',
        padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 500,
            fontStyle: 'italic', color: '#1A1A1A', margin: 0,
          }}>
            Mon profil
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#9B9B9B', margin: '4px 0 0' }}>
            Paramètres de personnalisation
          </p>
        </div>
        <a href={`/${slug}/dashboard`} style={{
          background: 'transparent', border: '1px solid #E8E4DF', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontFamily: "'Inter', sans-serif",
          cursor: 'pointer', color: '#6B6B6B', fontWeight: 500, textDecoration: 'none',
        }}>
          Retour au dashboard
        </a>
      </header>

      <div style={{ padding: '32px', maxWidth: 560 }}>
        <form onSubmit={handleSave}>
          <div style={{
            background: 'white', border: '1px solid #E8E4DF', borderRadius: 14, padding: 28,
            boxShadow: '0 2px 12px -4px rgba(0,0,0,.06)', marginBottom: 24,
          }}>
            {/* Logo URL */}
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={labelStyle}>URL du logo</span>
              <input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                placeholder="https://..." style={inputStyle} />
            </label>

            {/* Accent color */}
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={labelStyle}>Couleur d'accent</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={form.accent_color}
                  onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                  style={{ width: 40, height: 36, border: '1px solid #E8E4DF', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
                <input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }} />
              </div>
            </label>

            {/* Bg color */}
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={labelStyle}>Couleur de fond</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={form.bg_color}
                  onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                  style={{ width: 40, height: 36, border: '1px solid #E8E4DF', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
                <input value={form.bg_color} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }} />
              </div>
            </label>

            {/* Welcome message */}
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={labelStyle}>Message d'accueil (200 car. max)</span>
              <textarea value={form.welcome_message} maxLength={200}
                onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#9B9B9B', marginTop: 2, display: 'block' }}>
                {form.welcome_message.length}/200
              </span>
            </label>

            {/* Default duration */}
            <label style={{ display: 'block', marginBottom: 0 }}>
              <span style={labelStyle}>Durée par défaut des galeries</span>
              <select value={form.default_expires_days}
                onChange={e => setForm(f => ({ ...f, default_expires_days: e.target.value }))}
                style={{ ...inputStyle, background: 'white' }}>
                <option value="30">30 jours</option>
                <option value="60">60 jours</option>
                <option value="90">90 jours</option>
                <option value="180">180 jours</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="submit" disabled={saving} style={{
              background: '#2C2C2C', color: 'white', border: 'none', borderRadius: 10,
              padding: '11px 28px', fontSize: 13, fontFamily: "'Inter', sans-serif",
              fontWeight: 500, cursor: saving ? 'default' : 'pointer',
              letterSpacing: '0.04em', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
            {saved && (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#2e7d32', fontWeight: 500 }}>
                Modifications enregistrées
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
