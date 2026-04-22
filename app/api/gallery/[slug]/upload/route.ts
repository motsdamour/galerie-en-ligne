import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
}

const PCLOUD_API = 'https://eapi.pcloud.com'

function sumFileSize(contents: any[]): number {
  let total = 0
  for (const item of contents) {
    if (item.isfolder) {
      total += sumFileSize(item.contents ?? [])
    } else {
      total += item.size || 0
    }
  }
  return total
}
const MAX_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_GUEST_PHOTOS = 1000
const MAX_GUEST_VIDEOS = 200
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
const VIDEO_EXTS = ['mp4', 'mov', 'webm']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const token = process.env.PCLOUD_AUTH_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 500 })
  }

  const db = supabaseAdmin()
  const { data: event } = await db
    .from('events')
    .select('pcloud_folder_id, is_active, expires_at, operator_id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Galerie introuvable' }, { status: 404 })
  }

  if (event.expires_at && new Date(event.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Galerie expirée' }, { status: 403 })
  }

  // Quota check for operator storage
  if (event.operator_id) {
    const { data: operator } = await db
      .from('operators')
      .select('pcloud_folder_id, storage_limit_gb')
      .eq('id', event.operator_id)
      .single()

    if (operator?.pcloud_folder_id) {
      const limitGb = operator.storage_limit_gb || 100
      try {
        const quotaRes = await fetch(
          `${PCLOUD_API}/listfolder?auth=${token}&folderid=${operator.pcloud_folder_id}&recursive=1`
        )
        const quotaData = await quotaRes.json()
        if (quotaData.result === 0) {
          const totalBytes = sumFileSize(quotaData.metadata?.contents ?? [])
          const usedGb = totalBytes / 1073741824
          if (usedGb >= limitGb) {
            return NextResponse.json({ error: 'Quota de stockage dépassé' }, { status: 403 })
          }
        }
      } catch (err) {
        console.error('[UPLOAD] Quota check error:', err)
      }
    }
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 100 Mo)' }, { status: 400 })
  }

  const ext = file.name.toLowerCase().split('.').pop() || ''
  const allowedExts = ['jpg', 'jpeg', 'png', 'heic', 'webp', 'mp4', 'mov', 'webm']
  if (!ALLOWED_TYPES.includes(file.type) && !allowedExts.includes(ext)) {
    return NextResponse.json({ error: 'Format non supporté (jpg, png, heic, webp, mp4, mov, webm)' }, { status: 400 })
  }

  const isVideo = VIDEO_EXTS.includes(ext) || file.type.startsWith('video/')

  // Compter les fichiers invite_* existants dans le dossier racine
  const listRes = await fetch(
    `${PCLOUD_API}/listfolder?auth=${token}&folderid=${event.pcloud_folder_id}&recursive=0`
  )
  const listData = await listRes.json()
  const rootFiles = (listData.metadata?.contents ?? []).filter(
    (c: any) => !c.isfolder && c.name.startsWith('invite_')
  )

  const guestPhotos = rootFiles.filter((f: any) => !VIDEO_EXTS.includes(f.name.split('.').pop()?.toLowerCase() || ''))
  const guestVideos = rootFiles.filter((f: any) => VIDEO_EXTS.includes(f.name.split('.').pop()?.toLowerCase() || ''))

  if (isVideo && guestVideos.length >= MAX_GUEST_VIDEOS) {
    return NextResponse.json({ error: `Limite de ${MAX_GUEST_VIDEOS} vidéos invités atteinte` }, { status: 400 })
  }

  if (!isVideo && guestPhotos.length >= MAX_GUEST_PHOTOS) {
    return NextResponse.json({ error: `Limite de ${MAX_GUEST_PHOTOS} photos invités atteinte` }, { status: 400 })
  }

  // Upload dans le dossier racine avec prefixe invite_
  const prefixedName = `invite_${Date.now()}_${file.name}`
  const uploadForm = new FormData()
  uploadForm.append('file', file, prefixedName)

  const folderId = event.pcloud_folder_id
  console.log('[UPLOAD] slug:', slug, '| folderid:', folderId, '| filename:', prefixedName, '| fileSize:', file.size, '| fileType:', file.type)

  const uploadRes = await fetch(
    `${PCLOUD_API}/uploadfile?auth=${token}&folderid=${folderId}&filename=${encodeURIComponent(prefixedName)}`,
    { method: 'POST', body: uploadForm }
  )
  const uploadData = await uploadRes.json()

  console.log('[UPLOAD PCLOUD RESPONSE]', JSON.stringify(uploadData))

  if (uploadData.result !== 0) {
    console.error('[UPLOAD ERROR] pCloud result:', uploadData.result, '| error:', uploadData.error)
    return NextResponse.json({ error: uploadData.error || 'Erreur upload' }, { status: 502 })
  }

  const fileId = uploadData.metadata?.[0]?.fileid
  console.log('[UPLOAD] success, fileId:', fileId)

  return NextResponse.json({ success: true, fileId })
}
