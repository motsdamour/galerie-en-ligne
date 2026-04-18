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

  // Supprimer le cookie de session si la galerie n'existe plus ou est inactive
  if (!event || !event.is_active) {
    const cookieStore = await cookies()
    cookieStore.delete(`gallery_${slug}`)
    notFound()
  }

  if (event.expires_at && new Date(event.expires_at) < new Date()) {
    const cookieStore = await cookies()
    cookieStore.delete(`gallery_${slug}`)
    notFound()
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
        expiresAt={event.expires_at}
      />
    )
  }

  return <GalleryViewer slug={slug} />
}
