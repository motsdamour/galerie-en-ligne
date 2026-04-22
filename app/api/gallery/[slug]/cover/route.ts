import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const PCLOUD_API = 'https://eapi.pcloud.com'
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const db = supabaseAdmin()
  const { data: event, error } = await db
    .from('events')
    .select('pcloud_folder_id')
    .eq('slug', slug)
    .single()

  if (error || !event?.pcloud_folder_id) {
    return NextResponse.json({ error: 'Galerie introuvable' }, { status: 404 })
  }

  const token = process.env.PCLOUD_AUTH_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
  }

  // List files in the pCloud folder (non-recursive)
  const listRes = await fetch(
    `${PCLOUD_API}/listfolder?auth=${token}&folderid=${event.pcloud_folder_id}&nofiles=0&recursive=0`
  )
  const listData = await listRes.json() as {
    result: number
    metadata?: {
      contents?: Array<{ isfolder: boolean; fileid: number; name: string }>
    }
  }

  if (listData.result !== 0 || !listData.metadata?.contents) {
    return NextResponse.json({ error: 'Erreur pCloud' }, { status: 502 })
  }

  // Find first image file
  const image = listData.metadata.contents.find(
    (f) => !f.isfolder && IMAGE_EXTENSIONS.test(f.name)
  )

  if (!image) {
    return NextResponse.json({ error: 'Aucune image trouvee' }, { status: 404 })
  }

  // Redirect to the proxy URL
  return NextResponse.redirect(
    new URL(`/api/proxy/${image.fileid}?filename=cover`, _req.url)
  )
}
