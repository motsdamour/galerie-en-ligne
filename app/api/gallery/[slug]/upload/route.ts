import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthorized } from '@/lib/auth'

const MAX_SIZE = 200 * 1024 * 1024 // 200MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params

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
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 200MB)' }, { status: 400 })
  }

  const ext = file.name.toLowerCase().split('.').pop() || ''
  const allowedExts = ['jpg', 'jpeg', 'png', 'heic', 'webp', 'mp4', 'mov', 'webm']
  if (!ALLOWED_TYPES.includes(file.type) && !allowedExts.includes(ext)) {
    return NextResponse.json({ error: 'Format non supporte (jpg, png, heic, webp, mp4, mov, webm)' }, { status: 400 })
  }

  console.log('[UPLOAD] file name:', file.name, 'size:', file.size, 'type:', file.type)
  console.log('[UPLOAD] folderid:', event.pcloud_folder_id)

  const buffer = Buffer.from(await file.arrayBuffer())

  const pcloudForm = new FormData()
  pcloudForm.append('auth', token)
  pcloudForm.append('folderid', event.pcloud_folder_id)
  pcloudForm.append('filename', `invite_${Date.now()}_${file.name}`)
  pcloudForm.append('file', new Blob([buffer], { type: file.type }), file.name)

  const uploadRes = await fetch('https://eapi.pcloud.com/uploadfile', {
    method: 'POST',
    body: pcloudForm,
  })

  const uploadData = await uploadRes.json()
  console.log('[UPLOAD PCLOUD RESPONSE]', JSON.stringify(uploadData))

  if (uploadData.result !== 0) {
    return NextResponse.json({ error: 'pCloud upload failed', details: uploadData }, { status: 500 })
  }

  return NextResponse.json({ success: true, fileId: uploadData.metadata[0].fileid })
}
