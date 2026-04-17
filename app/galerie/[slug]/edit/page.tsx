import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export default async function EditRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const db = supabaseAdmin()
  const { data: event } = await db
    .from('events')
    .select('edit_token')
    .eq('slug', slug)
    .single()

  if (!event?.edit_token) {
    redirect(`/galerie/${slug}`)
  }

  redirect(`/galerie/${slug}?edit_token=${event.edit_token}`)
}
