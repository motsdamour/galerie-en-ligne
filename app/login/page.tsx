'use client'

import { signIn, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      const isAdmin = (session?.user as any)?.isAdmin
      if (isAdmin) { router.push('/admin'); return }
      const slug = (session?.user as any)?.operatorSlug
      if (slug) router.push(`/${slug}/dashboard`)
    }
  }, [status, session, router])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 48,
        border: '1px solid #E8E4DF',
        textAlign: 'center',
        width: 380,
      }}>
        <div style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 28,
          fontStyle: 'italic',
          color: '#1A1A1A',
          marginBottom: 8,
        }}>Galerie en ligne</div>
        <div style={{ fontSize: 13, color: '#9B9B9B', marginBottom: 40 }}>
          Espace opérateur
        </div>
        <button
          onClick={() => signIn('google', { callbackUrl: '/login' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            width: '100%',
            padding: '14px 24px',
            background: 'white',
            border: '1px solid #E8E4DF',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: '#1A1A1A',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          Se connecter avec Google
        </button>
      </div>
    </div>
  )
}
