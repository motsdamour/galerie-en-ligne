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
    .select('pcloud_folder_id, couple_name, event_date')
    .eq('slug', slug)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
  }

  try {
    const folders = await listVideosByFolder(event.pcloud_folder_id)

    const pcloudToken = process.env.PCLOUD_AUTH_TOKEN

    const foldersWithUrls = await Promise.all(folders.map(async (folder) => ({
      name: folder.name,
      folderid: folder.folderid,
      videos: await Promise.all(folder.videos.map(async (f) => {
        let streamUrl = `/api/proxy/${f.fileid}?filename=${encodeURIComponent(f.name)}`

        let hlsUrl: string | null = null

        if (f.mediaType === 'video' && pcloudToken) {
          // URL MP4 directe pCloud
          try {
            const linkRes = await fetch(
              `https://eapi.pcloud.com/getfilelink?auth=${pcloudToken}&fileid=${f.fileid}&forcedownload=0&contenttype=video/mp4`
            )
            const linkData = await linkRes.json()
            if (linkData.result === 0) {
              streamUrl = `https://${linkData.hosts[0]}${linkData.path}`
            }
          } catch {}

          // URL HLS .m3u8 pour Safari iOS
          try {
            const hlsRes = await fetch(
              `https://eapi.pcloud.com/gethlslink?auth=${pcloudToken}&fileid=${f.fileid}`
            )
            const hlsData = await hlsRes.json()
            if (hlsData.result === 0) {
              hlsUrl = `https://${hlsData.hosts[0]}${hlsData.path}`
            }
          } catch {}
        }

        return {
          id: f.fileid,
          name: f.name.replace(/\.[^/.]+$/, ''),
          size: f.size,
          type: f.mediaType,
          streamUrl,
          hlsUrl,
          downloadUrl: `/api/proxy/${f.fileid}?download=1&filename=${encodeURIComponent(f.name)}`,
          thumbUrl: f.mediaType === 'video' ? `/api/proxy/${f.fileid}?thumb=1` : undefined,
        }
      })),
    })))

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
