import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

const PCLOUD_API = 'https://eapi.pcloud.com'

async function findOrCreateFolder(auth: string, parentId: string, name: string): Promise<string> {
  // List parent contents to find existing folder
  const listRes = await fetch(`${PCLOUD_API}/listfolder?auth=${auth}&folderid=${parentId}&recursive=0`)
  const listData = await listRes.json()
  const existing = (listData.metadata?.contents ?? []).find(
    (c: any) => c.isfolder && c.name === name
  )
  if (existing) return String(existing.folderid)

  // Create folder
  const createRes = await fetch(
    `${PCLOUD_API}/createfolder?auth=${auth}&folderid=${parentId}&name=${encodeURIComponent(name)}`
  )
  const createData = await createRes.json()
  if (createData.metadata?.folderid) return String(createData.metadata.folderid)
  throw new Error(`Impossible de créer le dossier "${name}"`)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { slug } = await params
  const pcloudToken = process.env.PCLOUD_AUTH_TOKEN
  if (!pcloudToken) {
    return NextResponse.json({ error: 'PCLOUD_AUTH_TOKEN manquant' }, { status: 500 })
  }

  const db = supabaseAdmin()
  const { data: operator } = await db
    .from('operators')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!operator) {
    return NextResponse.json({ error: 'Loueur introuvable' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('logo') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 MB)' }, { status: 400 })
  }

  const rootFolderId = process.env.PCLOUD_ROOT_FOLDER_ID || '0'

  // 1. Find or create "Logos" inside root
  console.log('[UPLOAD-LOGO] Root folder:', rootFolderId)
  const logosFolderId = await findOrCreateFolder(pcloudToken, rootFolderId, 'Logos')
  console.log('[UPLOAD-LOGO] Logos folder:', logosFolderId)

  // 2. Find or create operator subfolder inside "Logos"
  const operatorFolderId = await findOrCreateFolder(pcloudToken, logosFolderId, operator.name)
  console.log('[UPLOAD-LOGO] Operator folder:', operatorFolderId, 'for', operator.name)

  // 3. Upload logo into Logos/[operator.name]/
  const ext = file.name.split('.').pop() || 'png'
  const fileName = `logo.${ext}`

  const uploadForm = new FormData()
  uploadForm.append('file', file, fileName)

  const uploadRes = await fetch(
    `${PCLOUD_API}/uploadfile?auth=${pcloudToken}&folderid=${operatorFolderId}&filename=${encodeURIComponent(fileName)}&renameifexists=1`,
    { method: 'POST', body: uploadForm }
  )
  const uploadData = await uploadRes.json()

  if (uploadData.result !== 0) {
    return NextResponse.json({ error: `pCloud upload: ${uploadData.error || 'erreur'}` }, { status: 502 })
  }

  const fileId = uploadData.metadata?.[0]?.fileid
  if (!fileId) {
    return NextResponse.json({ error: 'Pas de fileid retourné' }, { status: 502 })
  }

  // Get public link
  const linkRes = await fetch(
    `${PCLOUD_API}/getfilepublink?auth=${pcloudToken}&fileid=${fileId}`
  )
  const linkData = await linkRes.json()

  if (linkData.result !== 0) {
    return NextResponse.json({ error: 'Impossible de créer le lien public' }, { status: 502 })
  }

  const logoUrl = `https://eapi.pcloud.com/getpubthumb?code=${linkData.code}&size=400x400`

  // Save to Supabase
  await db
    .from('operators')
    .update({ logo_url: logoUrl })
    .eq('id', operator.id)

  return NextResponse.json({ logo_url: logoUrl })
}
