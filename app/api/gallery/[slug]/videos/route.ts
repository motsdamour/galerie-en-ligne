import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthorized } from '@/lib/auth'
import { listVideos, getStreamLink, getDownloadLink } from '@/lib/pcloud'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const authorized = await isAuthorized(slug)
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data: event } = await db
    .from('events')
    .select('pcloud_folder_id, couple_name, event_date')
    .eq('slug', slug)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
  }

  try {
    const files = await listVideos(event.pcloud_folder_id)

    const videos = await Promise.all(
      files.map(async (f) => ({
        id: f.fileid,
        name: f.name.replace(/\.[^/.]+$/, ''), // nom sans extension
        size: f.size,
        streamUrl: await getStreamLink(f.fileid),
        downloadUrl: await getDownloadLink(f.fileid),
      }))
    )

    return NextResponse.json({
      event: {
        coupleName: event.couple_name,
        eventDate: event.event_date,
      },
      videos,
    })
  } catch (err) {
    console.error('pCloud error:', err)
    return NextResponse.json({ error: 'Erreur lors du chargement des vidéos' }, { status: 500 })
  }
}
