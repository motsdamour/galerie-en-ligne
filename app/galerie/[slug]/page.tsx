import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyGalleryToken } from '@/lib/auth'
import GalleryPasswordPage from '@/components/GalleryPasswordPage'
import GalleryViewer from '@/components/GalleryViewer'

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const db = supabaseAdmin()
  const { data: event } = await db
    .from('events')
    .select('id, couple_name, event_date, is_active, expires_at')
    .eq('slug', slug)
    .single()

  if (!event || !event.is_active) notFound()

  if (event.expires_at && new Date(event.expires_at) < new Date()) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <p style={{ fontStyle: 'italic', color: 'var(--brown-muted)' }}>Cette galerie a expiré.</p>
      </div>
    )
  }

  // Vérifier si l'utilisateur est déjà authentifié
  const cookieStore = await cookies()
  const token = cookieStore.get(`gallery_${slug}`)?.value
  const isAuthenticated = token
    ? verifyGalleryToken(token)?.slug === slug
    : false

  if (!isAuthenticated) {
    return (
      <GalleryPasswordPage
        params={{ slug }}
        coupleName={event.couple_name}
        eventDate={event.event_date}
      />
    )
  }

  return <GalleryViewer slug={slug} />
}
