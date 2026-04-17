'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GalleryPasswordPage({
  params,
  coupleName,
  eventDate,
}: {
  params: { slug: string }
  coupleName: string
  eventDate: string
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const formattedDate = new Date(eventDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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
      background: 'var(--cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'white',
        border: '0.5px solid var(--border)',
        borderRadius: '16px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 24px' }}>
          <circle cx="24" cy="24" r="22" stroke="#c9748a" strokeWidth="0.8" opacity="0.4"/>
          <path d="M24 12 C18 12, 12 17, 12 23 C12 30, 18 35, 24 40 C30 35, 36 30, 36 23 C36 17, 30 12, 24 12Z" fill="#c9748a" opacity="0.12"/>
          <path d="M24 12 C21 15, 20 18, 20 23 C20 28, 21 33, 24 40" stroke="#c9748a" strokeWidth="0.8" opacity="0.5" fill="none"/>
          <path d="M24 12 C27 15, 28 18, 28 23 C28 28, 27 33, 24 40" stroke="#c9748a" strokeWidth="0.8" opacity="0.5" fill="none"/>
          <ellipse cx="17" cy="21" rx="4" ry="5" fill="#c9748a" opacity="0.18" transform="rotate(-20 17 21)"/>
          <ellipse cx="31" cy="21" rx="4" ry="5" fill="#c9748a" opacity="0.18" transform="rotate(20 31 21)"/>
        </svg>

        <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: 'var(--rose)', textTransform: 'uppercase', fontFamily: 'Arial', marginBottom: '8px' }}>
          Galerie privée
        </p>
        <h1 style={{ fontSize: '24px', fontWeight: 400, fontStyle: 'italic', color: 'var(--text-dark)', marginBottom: '4px' }}>
          {coupleName}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--brown-muted)', fontFamily: 'Arial', marginBottom: '32px' }}>
          {formattedDate}
        </p>

        <div className="ornament" style={{ marginBottom: '32px' }}>
          <div className="ornament-line"/>
          <div className="ornament-diamond"/>
          <div className="ornament-line"/>
        </div>

        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: '13px', color: 'var(--brown-muted)', fontFamily: 'Arial', marginBottom: '16px' }}>
            Entrez le mot de passe pour accéder à vos souvenirs
          </p>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ marginBottom: '12px', textAlign: 'center', letterSpacing: '0.1em' }}
            required
            autoFocus
          />
          {error && (
            <p style={{ fontSize: '12px', color: '#c9748a', fontFamily: 'Arial', marginBottom: '12px' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn-rose-solid"
            disabled={loading}
            style={{ width: '100%', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Vérification...' : 'Accéder à la galerie'}
          </button>
        </form>

        <p style={{ fontSize: '11px', color: 'var(--brown-light)', fontFamily: 'Arial', marginTop: '24px' }}>
          Le mot de passe vous a été communiqué par les mariés
        </p>
      </div>
    </div>
  )
}
