import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthorized } from '@/lib/auth'
import { listVideosByFolder, getStreamLink, getDownloadLink } from '@/lib/pcloud'

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
    const folders = await listVideosByFolder(event.pcloud_folder_id)

    const foldersWithUrls = await Promise.all(
      folders.map(async (folder) => ({
        name: folder.name,
        folderid: folder.folderid,
        videos: await Promise.all(
          folder.videos.map(async (f) => ({
            id: f.fileid,
            name: f.name.replace(/\.[^/.]+$/, ''),
            size: f.size,
            type: f.mediaType,
            streamUrl: f.mediaType === 'video' ? await getStreamLink(f.fileid) : await getDownloadLink(f.fileid),
            downloadUrl: await getDownloadLink(f.fileid),
          }))
        ),
      }))
    )

    const totalVideos = foldersWithUrls.reduce((sum, f) => sum + f.videos.length, 0)

    return NextResponse.json({
      event: {
        coupleName: event.couple_name,
        eventDate: event.event_date,
      },
      folders: foldersWithUrls,
      totalVideos,
    })
  } catch (err) {
    console.error('pCloud error:', err)
    return NextResponse.json({ error: 'Erreur lors du chargement des vidéos' }, { status: 500 })
  }
}
