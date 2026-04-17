import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthorized } from '@/lib/auth'
import { listVideosByFolder } from '@/lib/pcloud'

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
    .select('pcloud_folder_id, couple_name, event_date, hidden_files, edit_token, expires_at')
    .eq('slug', slug)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
  }

  try {
    const folders = await listVideosByFolder(event.pcloud_folder_id)
    const hiddenFiles = new Set((event.hidden_files ?? []).map(String))
    const editTokenParam = req.nextUrl.searchParams.get('edit_token')
    const isEditor = editTokenParam && editTokenParam === event.edit_token

    const foldersWithUrls = folders.map((folder) => ({
      name: folder.name,
      folderid: folder.folderid,
      videos: folder.videos.filter((f) => isEditor || !hiddenFiles.has(String(f.fileid))).map((f) => ({
        id: f.fileid,
        name: f.name.replace(/\.[^/.]+$/, ''),
        size: f.size,
        type: f.mediaType,
        hidden: hiddenFiles.has(String(f.fileid)),
        streamUrl: `/api/proxy/${f.fileid}?filename=${encodeURIComponent(f.name)}`,
        downloadUrl: `/api/proxy/${f.fileid}?download=1&filename=${encodeURIComponent(f.name)}`,
        thumbUrl: f.mediaType === 'video' ? `/api/proxy/${f.fileid}?thumb=1` : undefined,
      })),
    }))

    const totalVideos = foldersWithUrls.reduce((sum, f) => sum + f.videos.length, 0)

    return NextResponse.json({
      event: {
        coupleName: event.couple_name,
        eventDate: event.event_date,
        expiresAt: event.expires_at,
      },
      folders: foldersWithUrls,
      totalVideos,
      isEditor: !!isEditor,
    })
  } catch (err) {
    console.error('pCloud error:', err)
    return NextResponse.json({ error: 'Erreur lors du chargement des vidéos' }, { status: 500 })
  }
}
