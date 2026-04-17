import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthorized } from '@/lib/auth'

const PCLOUD_API = 'https://eapi.pcloud.com'
const MAX_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']

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
    return NextResponse.json({ error: 'Fichier trop volumineux (max 20MB)' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
    return NextResponse.json({ error: 'Format non supporte (jpg, png, heic, webp)' }, { status: 400 })
  }

  // Trouver ou creer le sous-dossier "photos-invites"
  const listRes = await fetch(
    `${PCLOUD_API}/listfolder?auth=${token}&folderid=${event.pcloud_folder_id}&recursive=0`
  )
  const listData = await listRes.json()
  const subfolders = (listData.metadata?.contents ?? []).filter((c: any) => c.isfolder)
  let photosFolder = subfolders.find((f: any) => f.name === 'photos-invites')

  if (!photosFolder) {
    const createRes = await fetch(
      `${PCLOUD_API}/createfolder?auth=${token}&folderid=${event.pcloud_folder_id}&name=photos-invites`
    )
    const createData = await createRes.json()
    if (createData.result !== 0 && createData.error !== 'File or folder alredy exists.') {
      return NextResponse.json({ error: 'Erreur creation dossier' }, { status: 502 })
    }
    // Re-lister pour obtenir le folderid
    if (createData.metadata) {
      photosFolder = createData.metadata
    } else {
      const relistRes = await fetch(
        `${PCLOUD_API}/listfolder?auth=${token}&folderid=${event.pcloud_folder_id}&recursive=0`
      )
      const relistData = await relistRes.json()
      photosFolder = (relistData.metadata?.contents ?? []).find((c: any) => c.isfolder && c.name === 'photos-invites')
    }
  }

  if (!photosFolder) {
    return NextResponse.json({ error: 'Impossible de trouver le dossier photos-invites' }, { status: 500 })
  }

  // Upload vers pCloud
  const uploadForm = new FormData()
  uploadForm.append('file', file, file.name)

  const uploadRes = await fetch(
    `${PCLOUD_API}/uploadfile?auth=${token}&folderid=${photosFolder.folderid}&filename=${encodeURIComponent(file.name)}`,
    { method: 'POST', body: uploadForm }
  )
  const uploadData = await uploadRes.json()

  if (uploadData.result !== 0) {
    return NextResponse.json({ error: uploadData.error || 'Erreur upload' }, { status: 502 })
  }

  const fileId = uploadData.metadata?.[0]?.fileid

  return NextResponse.json({ success: true, fileId })
}
