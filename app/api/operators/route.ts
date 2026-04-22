import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken, hashPassword } from '@/lib/auth'

const PCLOUD_API = 'https://eapi.pcloud.com'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { name, slug, email, password, city, phone, logo_url, accent_color, bg_color } = await req.json()

  if (!name || !slug || !email || !password) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const passwordHash = await hashPassword(password)

  // Create pCloud folder for this operator
  let pcloudFolderId: string | null = null
  const pcloudToken = process.env.PCLOUD_AUTH_TOKEN
  const rootFolderId = process.env.PCLOUD_ROOT_FOLDER_ID || '0'

  if (pcloudToken) {
    try {
      const pcRes = await fetch(
        `${PCLOUD_API}/createfolder?auth=${pcloudToken}&folderid=${rootFolderId}&name=${encodeURIComponent(name)}`
      )
      const pcData = await pcRes.json()
      if (pcData.metadata?.folderid) {
        pcloudFolderId = String(pcData.metadata.folderid)
      }
    } catch (err) {
      console.error('pCloud createfolder error:', err)
    }
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('operators')
    .insert({
      name, slug, email, password_hash: passwordHash,
      city: city || null, phone: phone || null,
      logo_url: logo_url || null,
      accent_color: accent_color || '#2C2C2C',
      bg_color: bg_color || '#FAFAF8',
      pcloud_folder_id: pcloudFolderId,
    })
    .select('id, name, slug, email, city, phone, logo_url, accent_color, bg_color, pcloud_folder_id, is_active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce slug ou email existe déjà' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data } = await db
    .from('operators')
    .select('id, name, slug, email, city, phone, logo_url, accent_color, bg_color, pcloud_folder_id, is_active, created_at')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
