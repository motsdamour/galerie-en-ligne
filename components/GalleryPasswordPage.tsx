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
      background: 'linear-gradient(180deg, #ffffff 0%, #fdf5f4 50%, #fbeae8 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'white',
        border: '0.5px solid #e8e0d8',
        borderRadius: '20px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(233,120,114,0.08)',
      }}>
        {/* Logo */}
        <img
          src="/logo.svg"
          alt="Mots d'Amour"
          width="120"
          height="68"
          style={{ display: 'block', margin: '0 auto 28px' }}
        />

        <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', letterSpacing: '0.16em', color: '#e97872', textTransform: 'uppercase', fontFamily: "'Poppins', sans-serif", marginBottom: '8px' }}>
          Galerie privee
        </p>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#3c3c3b', marginBottom: '12px', fontFamily: "'Poppins', sans-serif", lineHeight: '20px' }}>
          {coupleName}
        </h1>

        {daysLeft > 0 && (
          <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#b4b2a9', fontFamily: "'Poppins', sans-serif", marginBottom: '28px' }}>
            Il reste {daysLeft} jour{daysLeft > 1 ? 's' : ''} d'acces
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ width: '40px', height: '0.5px', background: '#e97872', opacity: 0.4 }}/>
          <div style={{ width: '5px', height: '5px', background: '#e97872', transform: 'rotate(45deg)', opacity: 0.5 }}/>
          <div style={{ width: '40px', height: '0.5px', background: '#e97872', opacity: 0.4 }}/>
        </div>

        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#888780', fontFamily: "'Poppins', sans-serif", marginBottom: '16px' }}>
            Entrez le mot de passe pour acceder a vos souvenirs
          </p>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              marginBottom: '12px', textAlign: 'center', letterSpacing: '0.1em',
              width: '100%', padding: '14px', border: '0.5px solid #e8e0d8',
              borderRadius: '12px', fontSize: '16px', fontWeight: 300, fontFamily: "'Poppins', sans-serif",
              outline: 'none',
            }}
            required
            autoFocus
          />
          {error && (
            <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#e97872', fontFamily: "'Poppins', sans-serif", marginBottom: '12px' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', background: '#e97872', color: 'white',
              border: 'none', borderRadius: '25px', fontSize: '16px', fontWeight: 300,
              fontFamily: "'Poppins', sans-serif", letterSpacing: '0.06em', lineHeight: '20px',
              textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Verification...' : 'Acceder a notre galerie'}
          </button>
        </form>
      </div>

      <p style={{ fontSize: '16px', fontWeight: 300, lineHeight: '20px', color: '#b4b2a9', fontFamily: "'Poppins', sans-serif", marginTop: '32px', letterSpacing: '0.06em' }}>
        Galerie privee · Mots d'Amour
      </p>
    </div>
  )
}
