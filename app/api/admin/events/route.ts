import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, verifyAdminToken } from '@/lib/auth'
import { sendNewGalleryEmail } from '@/lib/email'

function generateSlug(coupleName: string, date: string) {
  const names = coupleName
    .toLowerCase()
    .replace(/[^a-z\s&]/g, '')
    .replace(/\s*&\s*/g, '-et-')
    .replace(/\s+/g, '-')
  const d = new Date(date)
  const month = d.toLocaleString('fr-FR', { month: 'long' })
  const year = d.getFullYear()
  return `${names}-${month}-${year}`
}

function generatePassword() {
  const words = ['amour', 'rose', 'jardin', 'lumiere', 'coeur', 'etoile', 'bonheur', 'soleil']
  const word = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(Math.random() * 900) + 100
  return `${word}${num}`
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { coupleName, eventDate, eventType, pcloudFolderId, customPassword, coupleEmail } = await req.json()

  const password = customPassword || generatePassword()
  const slug = generateSlug(coupleName, eventDate)
  const passwordHash = await hashPassword(password)
  const editToken = crypto.randomUUID()

  // Expiration 12 mois après l'événement
  const expiresAt = new Date(eventDate)
  expiresAt.setDate(expiresAt.getDate() + 30)

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('events')
    .insert({
      couple_name: coupleName,
      event_date: eventDate,
      event_type: eventType || 'mariage',
      pcloud_folder_id: pcloudFolderId,
      slug,
      password_hash: passwordHash,
      password_plain: password,
      edit_token: editToken,
      couple_email: coupleEmail?.trim() || null,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, slug')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce slug existe déjà, modifiez les noms ou la date' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    await sendNewGalleryEmail({ couple_name: coupleName, slug, password_plain: password, edit_token: editToken, couple_email: coupleEmail?.trim() || null })
  } catch (err) {
    console.error('Email error:', err)
  }

  return NextResponse.json({
    id: data.id,
    slug,
    password,
    galleryUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/galerie/${slug}`,
  })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data } = await db
    .from('events')
    .select('id, couple_name, event_date, event_type, slug, is_active, expires_at, created_at, password_plain, user_id, edit_token, couple_email')
    .order('created_at', { ascending: false })

  return NextResponse.json(data)
}
