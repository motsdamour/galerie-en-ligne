'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function OperatorSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'authenticated' && session?.user?.operatorSlug === slug) {
      router.replace(`/${slug}/dashboard`)
    } else {
      router.replace('/login')
    }
  }, [status, session, slug, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '1px solid #2C2C2C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: '15px', fontWeight: 300, color: '#6B6B6B', fontFamily: 'Inter, sans-serif' }}>Redirection…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
