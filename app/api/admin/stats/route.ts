import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

/* ─── In-memory cache (10 min) ─── */
let pcloudCache: { totalMedia: number; totalGuest: number; ts: number } | null = null
const CACHE_TTL = 10 * 60 * 1000

async function countPCloudMedia(folderIds: string[]): Promise<{ totalMedia: number; totalGuest: number }> {
  if (pcloudCache && Date.now() - pcloudCache.ts < CACHE_TTL) {
    return { totalMedia: pcloudCache.totalMedia, totalGuest: pcloudCache.totalGuest }
  }

  const auth = process.env.PCLOUD_AUTH_TOKEN
  if (!auth || folderIds.length === 0) return { totalMedia: 0, totalGuest: 0 }

  let totalMedia = 0
  let totalGuest = 0

  function countFiles(contents: any[]) {
    if (!contents) return
    for (const item of contents) {
      if (item.isfolder) {
        countFiles(item.contents)
      } else {
        const name: string = (item.name || '').toLowerCase()
        if (name.match(/\.(mp4|mov|jpg|jpeg|png|webp|heic)$/)) {
          totalMedia++
          if (name.startsWith('invite_')) {
            totalGuest++
          }
        }
      }
    }
  }

  for (const folderId of folderIds) {
    try {
      const res = await fetch(
        `https://eapi.pcloud.com/listfolder?auth=${auth}&folderid=${folderId}&recursive=1`
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.result !== 0) continue
      countFiles(data.metadata?.contents)
    } catch {
      continue
    }
  }

  pcloudCache = { totalMedia, totalGuest, ts: Date.now() }
  return { totalMedia, totalGuest }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const db = supabaseAdmin()

  const { data: events } = await db
    .from('events')
    .select('id, is_active, expires_at, pcloud_folder_id')

  const allEvents = events || []
  const now = new Date().toISOString()

  const totalGalleries = allEvents.length
  const liveGalleries = allEvents.filter(
    e => e.is_active && (!e.expires_at || e.expires_at > now)
  ).length

  const folderIds = allEvents
    .map(e => e.pcloud_folder_id)
    .filter((id): id is string => !!id)

  const { totalMedia, totalGuest } = await countPCloudMedia(folderIds)

  return NextResponse.json({
    totalGalleries,
    liveGalleries,
    totalFiles: totalMedia,
    sharedFiles: totalGuest,
  })
}
