import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { slug } = await params

  const db = supabaseAdmin()
  const { data: event } = await db
    .from('events')
    .select('pcloud_folder_id')
    .eq('slug', slug)
    .single()

  if (!event?.pcloud_folder_id) {
    return NextResponse.json({ videoCount: 0, photoCount: 0, guestCount: 0, totalMedia: 0 })
  }

  const auth = process.env.PCLOUD_AUTH_TOKEN
  if (!auth) {
    return NextResponse.json({ videoCount: 0, photoCount: 0, guestCount: 0, totalMedia: 0 })
  }

  let videoCount = 0
  let photoCount = 0
  let guestCount = 0

  function countFiles(contents: any[]) {
    if (!contents) return
    for (const item of contents) {
      if (item.isfolder) {
        countFiles(item.contents)
      } else {
        const name: string = (item.name || '').toLowerCase()
        if (name.match(/\.(mp4|mov)$/)) {
          videoCount++
        } else if (name.startsWith('invite_')) {
          guestCount++
        } else if (name.match(/\.(jpg|jpeg|png|webp|heic)$/)) {
          photoCount++
        }
      }
    }
  }

  try {
    const res = await fetch(
      `https://eapi.pcloud.com/listfolder?auth=${auth}&folderid=${event.pcloud_folder_id}&recursive=1`
    )
    if (res.ok) {
      const data = await res.json()
      if (data.result === 0) {
        countFiles(data.metadata?.contents)
      }
    }
  } catch {
    // pCloud unreachable — return zeros
  }

  return NextResponse.json({
    videoCount,
    photoCount,
    guestCount,
    totalMedia: videoCount + photoCount + guestCount,
  })
}
