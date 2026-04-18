import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthorized } from '@/lib/auth'

const PCLOUD_API = 'https://eapi.pcloud.com'
const MAX_SIZE = 200 * 1024 * 1024 // 200MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const authorized = await isAuthorized(slug)
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const token = process.env.PCLOUD_AUTH_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 500 })
  }

  const db = supabaseAdmin()
  const { data: event } = await db
    .from('events')
    .select('pcloud_folder_id')
    .eq('slug', slug)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Evenement introuvable' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 200MB)' }, { status: 400 })
  }

  const ext = file.name.toLowerCase().split('.').pop() || ''
  const allowedExts = ['jpg', 'jpeg', 'png', 'heic', 'webp', 'mp4', 'mov', 'webm']
  if (!ALLOWED_TYPES.includes(file.type) && !allowedExts.includes(ext)) {
    return NextResponse.json({ error: 'Format non supporte (jpg, png, heic, webp, mp4, mov, webm)' }, { status: 400 })
  }

  // Upload directement dans le dossier racine avec prefixe invite_
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
