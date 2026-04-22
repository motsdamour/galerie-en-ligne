import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'
import { auth } from '@/lib/auth-config'

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

  const { data: operator } = await db
    .from('operators')
    .select('id, name, slug, email, city, phone, logo_url, accent_color, bg_color, pcloud_folder_id, is_active, created_at')
    .eq('slug', slug)
    .single()

  if (!operator) {
    return NextResponse.json({ error: 'Loueur introuvable' }, { status: 404 })
  }

  const { data: galleries } = await db
    .from('events')
    .select('id, couple_name, event_date, event_type, slug, is_active, expires_at, created_at, password_plain, edit_token, couple_email')
    .eq('operator_id', operator.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ operator, galleries: galleries ?? [] })
}

const PCLOUD_API = 'https://eapi.pcloud.com'

export async function DELETE(
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

  // Find operator with pcloud info
  const { data: operator } = await db
    .from('operators')
    .select('id, name, pcloud_folder_id')
    .eq('slug', slug)
    .single()

  if (!operator) {
    return NextResponse.json({ error: 'Loueur introuvable' }, { status: 404 })
  }

  // Dissociate galleries (set operator_id to null)
  await db
    .from('events')
    .update({ operator_id: null })
    .eq('operator_id', operator.id)

  // Delete pCloud folders
  const pcloudToken = process.env.PCLOUD_AUTH_TOKEN
  if (pcloudToken) {
    // Delete operator event folder
    if (operator.pcloud_folder_id) {
      try {
        console.log('[DELETE] pcloud_folder_id:', operator.pcloud_folder_id)
        const delRes = await fetch(`${PCLOUD_API}/deletefolderrecursive?auth=${pcloudToken}&folderid=${operator.pcloud_folder_id}`)
        const delData = await delRes.json()
        console.log('[DELETE] pCloud event folder response:', JSON.stringify(delData))
      } catch (err) {
        console.error('[DELETE] pCloud operator folder error:', err)
      }
    } else {
      console.log('[DELETE] Pas de pcloud_folder_id pour', operator.name)
    }

    // Delete logo folder: Logos/[operator.name]
    const rootFolderId = process.env.PCLOUD_ROOT_FOLDER_ID || '0'
    try {
      const logosRes = await fetch(`${PCLOUD_API}/listfolder?auth=${pcloudToken}&folderid=${rootFolderId}&recursive=0`)
      const logosData = await logosRes.json()
      const logosFolder = (logosData.metadata?.contents ?? []).find(
        (c: any) => c.isfolder && c.name === 'Logos'
      )
      console.log('[DELETE] Logos folder found:', logosFolder?.folderid ?? 'non trouvé')
      if (logosFolder) {
        const subRes = await fetch(`${PCLOUD_API}/listfolder?auth=${pcloudToken}&folderid=${logosFolder.folderid}&recursive=0`)
        const subData = await subRes.json()
        const opLogoFolder = (subData.metadata?.contents ?? []).find(
          (c: any) => c.isfolder && c.name === operator.name
        )
        console.log('[DELETE] Logo subfolder for', operator.name, ':', opLogoFolder?.folderid ?? 'non trouvé')
        if (opLogoFolder) {
          const logoDelRes = await fetch(`${PCLOUD_API}/deletefolderrecursive?auth=${pcloudToken}&folderid=${opLogoFolder.folderid}`)
          const logoDelData = await logoDelRes.json()
          console.log('[DELETE] pCloud logo folder response:', JSON.stringify(logoDelData))
        }
      }
    } catch (err) {
      console.error('[DELETE] pCloud logo folder error:', err)
    }
  }

  // Delete operator from DB
  const { error } = await db
    .from('operators')
    .delete()
    .eq('id', operator.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Verify auth via NextAuth session
  const session = await auth()
  if (!session?.user?.operatorSlug || session.user.operatorSlug !== slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()

  const allowedFields = ['accent_color', 'bg_color', 'welcome_message', 'storage_limit_gb', 'type', 'logo_url', 'default_expires_days']
  const updates: Record<string, any> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('operators')
    .update(updates)
    .eq('slug', slug)
    .select('id, name, slug, accent_color, bg_color, welcome_message, logo_url, default_expires_days')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
