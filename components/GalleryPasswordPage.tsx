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
    : null

  const formattedDate = (() => {
    try {
      const d = new Date(eventDate)
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return eventDate
    }
  })()

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
      background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 0,
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '440px',
        width: '100%',
      }}>
        {/* Couple name */}
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic',
          fontSize: '52px',
          fontWeight: 400,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          margin: '0 0 16px',
        }}>
          {coupleName}
        </h1>

        {/* Event date */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '14px',
          fontWeight: 400,
          color: 'rgba(255, 255, 255, 0.7)',
          margin: '0 0 32px',
          letterSpacing: '0.04em',
        }}>
          {formattedDate}
        </p>

        {/* Separator */}
        <div style={{
          width: '60px',
          height: '1px',
          background: 'rgba(255, 255, 255, 0.2)',
          marginBottom: '32px',
        }} />

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: "'Inter', sans-serif",
              color: '#ffffff',
              textAlign: 'center',
              letterSpacing: '0.1em',
              outline: 'none',
            }}
            required
            autoFocus
          />

          {error && (
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              color: '#ef4444',
              margin: 0,
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 32px',
              background: '#ffffff',
              color: '#1a1a1a',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Verification...' : 'Acceder a nos souvenirs'}
          </button>
        </form>

        {/* Days remaining */}
        {daysLeft !== null && daysLeft > 0 && (
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginTop: '48px',
            margin: '48px 0 0',
          }}>
            {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Placeholder style for password input placeholder color */}
      <style>{`
        input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }
      `}</style>
    </div>
  )
}
