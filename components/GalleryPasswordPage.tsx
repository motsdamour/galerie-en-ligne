'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GalleryPasswordPage({
  params,
  coupleName,
  eventDate,
  expiresAt,
}: {
  params: { slug: string }
  coupleName: string
  eventDate: string
  expiresAt?: string
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 365

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(`/api/gallery/${params.slug}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()

    if (res.ok) {
      router.refresh()
    } else {
      setError(data.error || 'Mot de passe incorrect')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FAFAF8 0%, #F0EDE8 50%, #E8E4DF 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'white',
        border: '0.5px solid #E8E4DF',
        borderRadius: '20px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic',
          fontSize: '28px',
          fontWeight: 500,
          color: '#1A1A1A',
          margin: '0 0 28px',
        }}>
          Galerie en ligne
        </p>

        <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', letterSpacing: '0.16em', color: '#8B7355', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", marginBottom: '8px' }}>
          Galerie privee
        </p>
        <h1 style={{ fontSize: '24px', fontWeight: 500, color: '#1A1A1A', marginBottom: '12px', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', lineHeight: '20px' }}>
          {coupleName}
        </h1>

        {daysLeft > 0 && (
          <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#9B9B9B', fontFamily: "'Inter', sans-serif", marginBottom: '28px' }}>
            Il reste {daysLeft} jour{daysLeft > 1 ? 's' : ''} d'acces
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ width: '40px', height: '0.5px', background: '#8B7355', opacity: 0.4 }}/>
          <div style={{ width: '5px', height: '5px', background: '#8B7355', transform: 'rotate(45deg)', opacity: 0.5 }}/>
          <div style={{ width: '40px', height: '0.5px', background: '#8B7355', opacity: 0.4 }}/>
        </div>

        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#6B6B6B', fontFamily: "'Inter', sans-serif", marginBottom: '16px' }}>
            Entrez le mot de passe pour acceder a vos souvenirs
          </p>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              marginBottom: '12px', textAlign: 'center', letterSpacing: '0.1em',
              width: '100%', padding: '14px', border: '0.5px solid #E8E4DF',
              borderRadius: '12px', fontSize: '16px', fontWeight: 300, fontFamily: "'Inter', sans-serif",
              outline: 'none',
            }}
            required
            autoFocus
          />
          {error && (
            <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#c0524c', fontFamily: "'Inter', sans-serif", marginBottom: '12px' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', background: '#2C2C2C', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 400,
              fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em', lineHeight: '20px',
              textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Verification...' : 'Acceder'}
          </button>
        </form>
      </div>

      <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#9B9B9B', fontFamily: "'Inter', sans-serif", marginTop: '32px', letterSpacing: '0.06em' }}>
        Galerie privee · galerie-en-ligne.fr
      </p>
    </div>
  )
}
