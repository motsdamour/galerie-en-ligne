import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOperatorSession } from '@/lib/operator-auth'
import { auth } from '@/lib/auth-config'
import { hashPassword } from '@/lib/auth'
import { sendNewGalleryEmail } from '@/lib/email'

const PCLOUD_API = 'https://eapi.pcloud.com'

function slugify(name: string, year: number): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-') + `-${year}`
}

function passwordFromName(name: string, year: number): string {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
  return words.join('') + year
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Try NextAuth session first, then fall back to JWT cookie
  let operatorId: string | null = null

  const nextAuthSession = await auth()
  if (nextAuthSession?.user?.operatorSlug === slug) {
    const db = supabaseAdmin()
    const { data: op } = await db.from('operators').select('id').eq('slug', slug).single()
    if (op) operatorId = op.id
  }

  if (!operatorId) {
    const jwtSession = await getOperatorSession()
    if (jwtSession?.operatorSlug === slug) {
      operatorId = jwtSession.operatorId
    }
  }

  if (!operatorId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data: events } = await db
    .from('events')
    .select('id, couple_name, event_date, event_type, slug, is_active, expires_at, created_at, password_plain, edit_token, couple_email')
    .eq('operator_id', operatorId)
    .order('created_at', { ascending: false })

  const galleries = events ?? []
  const now = new Date()
  const activeCount = galleries.filter(e => {
    if (!e.expires_at) return true
    return new Date(e.expires_at) > now
  }).length

  return NextResponse.json({
    galleries,
    stats: {
      total: galleries.length,
      active: activeCount,
    },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Verify auth (NextAuth session OR JWT cookie)
  let operatorId: string | null = null

  const nextAuthSession = await auth()
  if (nextAuthSession?.user?.operatorSlug === slug) {
    const db = supabaseAdmin()
    const { data: op } = await db.from('operators').select('id').eq('slug', slug).single()
    if (op) operatorId = op.id
  }

  if (!operatorId) {
    const jwtSession = await getOperatorSession()
    if (jwtSession?.operatorSlug === slug) {
      operatorId = jwtSession.operatorId
    }
  }

  if (!operatorId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { coupleName, eventDate, coupleEmail, expiresDays } = await req.json()

  if (!coupleName || !eventDate) {
    return NextResponse.json({ error: 'Nom et date requis' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Get operator info
  const { data: operator } = await db
    .from('operators')
    .select('id, slug, pcloud_folder_id, name')
    .eq('id', operatorId)
    .single()

  if (!operator) {
    return NextResponse.json({ error: 'Opérateur introuvable' }, { status: 404 })
  }

  // Create pCloud subfolder in operator's folder
  const pcloudToken = process.env.PCLOUD_AUTH_TOKEN
  if (!pcloudToken) {
    return NextResponse.json({ error: 'PCLOUD_AUTH_TOKEN manquant' }, { status: 500 })
  }

  let pcloudFolderId: string | null = null
  try {
    const createRes = await fetch(
      `${PCLOUD_API}/createfolder?auth=${pcloudToken}&folderid=${operator.pcloud_folder_id}&name=${encodeURIComponent(coupleName)}`
    )
    const createData = await createRes.json()
    if (createData.result !== 0 && createData.result !== 2004) {
      // 2004 = folder already exists
      return NextResponse.json({ error: `Erreur pCloud: ${createData.error || 'Inconnu'}` }, { status: 500 })
    }
    pcloudFolderId = createData.metadata?.folderid
      ? String(createData.metadata.folderid)
      : null

    // If folder already existed (2004), try to get it
    if (!pcloudFolderId) {
      const listRes = await fetch(
        `${PCLOUD_API}/listfolder?auth=${pcloudToken}&folderid=${operator.pcloud_folder_id}&recursive=0`
      )
      const listData = await listRes.json()
      const existing = (listData.metadata?.contents ?? []).find(
        (c: any) => c.isfolder && c.name === coupleName
      )
      if (existing) pcloudFolderId = String(existing.folderid)
    }
  } catch (err) {
    console.error('pCloud createfolder error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création du dossier pCloud' }, { status: 500 })
  }

  if (!pcloudFolderId) {
    return NextResponse.json({ error: 'Impossible de créer le dossier pCloud' }, { status: 500 })
  }

  const year = new Date(eventDate).getFullYear()
  const eventSlug = operator.slug + '-' + slugify(coupleName, year)
  const password = passwordFromName(coupleName, year)
  const passwordHash = await hashPassword(password)
  const editToken = crypto.randomUUID()

  const days = parseInt(expiresDays) || 90
  const expiresAt = new Date(eventDate)
  expiresAt.setDate(expiresAt.getDate() + days)

  const { data: event, error } = await db
    .from('events')
    .insert({
      couple_name: coupleName,
      event_date: eventDate,
      event_type: 'mariage',
      pcloud_folder_id: pcloudFolderId,
      slug: eventSlug,
      password_hash: passwordHash,
      password_plain: password,
      edit_token: editToken,
      couple_email: coupleEmail?.trim() || null,
      expires_at: expiresAt.toISOString(),
      is_active: true,
      operator_id: operatorId,
      custom_expires_days: days,
    })
    .select('id, slug')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce slug existe déjà, modifiez les noms ou la date' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send email if couple email provided
  if (coupleEmail?.trim()) {
    try {
      await sendNewGalleryEmail({
        couple_name: coupleName,
        slug: eventSlug,
        password_plain: password,
        edit_token: editToken,
        couple_email: coupleEmail.trim(),
      })
    } catch (err) {
      console.error('Email error:', err)
    }
  }

  const galleryUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://galerie-en-ligne.fr'}/galerie/${eventSlug}`

  return NextResponse.json({
    slug: eventSlug,
    password,
    galleryUrl,
  })
}
