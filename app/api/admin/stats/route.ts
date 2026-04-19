import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

const MEDIA_EXTENSIONS = new Set(['mp4', 'mov', 'jpg', 'jpeg', 'png', 'webp'])

async function countPCloudFiles(): Promise<{ totalFiles: number; sharedFiles: number }> {
  const token = process.env.PCLOUD_AUTH_TOKEN
  if (!token) return { totalFiles: 0, sharedFiles: 0 }

  try {
    const res = await fetch(
      `https://eapi.pcloud.com/listfolder?folderid=0&recursive=1&auth=${token}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return { totalFiles: 0, sharedFiles: 0 }

    const data = await res.json()
    if (data.result !== 0) return { totalFiles: 0, sharedFiles: 0 }

    let totalFiles = 0
    let sharedFiles = 0

    function walk(contents: any[]) {
      for (const item of contents) {
        if (item.isfolder) {
          if (item.contents) walk(item.contents)
        } else {
          const name: string = item.name || ''
          const ext = name.split('.').pop()?.toLowerCase() || ''
          if (MEDIA_EXTENSIONS.has(ext)) {
            totalFiles++
            if (name.startsWith('invite_')) {
              sharedFiles++
            }
          }
        }
      }
    }

    if (data.metadata?.contents) {
      walk(data.metadata.contents)
    }

    return { totalFiles, sharedFiles }
  } catch {
    return { totalFiles: 0, sharedFiles: 0 }
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const db = supabaseAdmin()

  const [eventsRes, pcloudStats] = await Promise.all([
    db.from('events').select('id, is_active, expires_at'),
    countPCloudFiles(),
  ])

  const events = eventsRes.data || []
  const now = new Date().toISOString()

  const totalGalleries = events.length
  const liveGalleries = events.filter(
    e => e.is_active && (!e.expires_at || e.expires_at > now)
  ).length

  return NextResponse.json({
    totalGalleries,
    liveGalleries,
    totalFiles: pcloudStats.totalFiles,
    sharedFiles: pcloudStats.sharedFiles,
  })
}
