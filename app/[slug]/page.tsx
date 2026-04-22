'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'

export default function OperatorLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(`/api/operators/${slug}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (res.ok) {
      router.push(`/${slug}/dashboard`)
    } else {
      setError(data.error || 'Erreur de connexion')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
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
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic',
          fontSize: '28px',
          fontWeight: 500,
          color: '#1A1A1A',
          margin: '0 0 8px',
        }}>
          Galerie en ligne
        </p>
        <p style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.16em',
          color: '#8B7355',
          textTransform: 'uppercase',
          fontFamily: "'Inter', sans-serif",
          marginBottom: '32px',
        }}>
          Espace loueur
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ width: '40px', height: '0.5px', background: '#8B7355', opacity: 0.4 }} />
          <div style={{ width: '5px', height: '5px', background: '#8B7355', transform: 'rotate(45deg)', opacity: 0.5 }} />
          <div style={{ width: '40px', height: '0.5px', background: '#8B7355', opacity: 0.4 }} />
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              marginBottom: '12px', textAlign: 'center', letterSpacing: '0.02em',
              width: '100%', padding: '14px', border: '0.5px solid #E8E4DF',
              borderRadius: '12px', fontSize: '15px', fontWeight: 300, fontFamily: "'Inter', sans-serif",
              outline: 'none', background: 'white', color: '#1A1A1A',
            }}
            required
            autoFocus
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              marginBottom: '16px', textAlign: 'center', letterSpacing: '0.06em',
              width: '100%', padding: '14px', border: '0.5px solid #E8E4DF',
              borderRadius: '12px', fontSize: '15px', fontWeight: 300, fontFamily: "'Inter', sans-serif",
              outline: 'none', background: 'white', color: '#1A1A1A',
            }}
            required
          />
          {error && (
            <p style={{ fontSize: '14px', fontWeight: 400, color: '#c0524c', fontFamily: "'Inter', sans-serif", marginBottom: '12px' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', background: '#2C2C2C', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 500,
              fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Connexion...' : 'Accéder à mes galeries'}
          </button>
        </form>
      </div>

      <p style={{ fontSize: '13px', fontWeight: 300, color: '#9B9B9B', fontFamily: "'Inter', sans-serif", marginTop: '32px', letterSpacing: '0.04em' }}>
        galerie-en-ligne.fr
      </p>
    </div>
  )
}
