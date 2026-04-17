import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'
import { sendNewGalleryEmail } from '@/lib/email'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  const db = supabaseAdmin()
  const { data: event } = await db
    .from('events')
    .select('couple_name, slug, password_plain, edit_token, couple_email')
    .eq('id', id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Evenement introuvable' }, { status: 404 })
  }

  // Si un email est fourni dans le body, l'utiliser et le sauvegarder
  const coupleEmail = body.couple_email?.trim() || event.couple_email
  if (!coupleEmail) {
    return NextResponse.json({ error: 'Aucun email maries' }, { status: 400 })
  }

  // Sauvegarder l'email si nouveau
  if (body.couple_email && body.couple_email !== event.couple_email) {
    await db.from('events').update({ couple_email: coupleEmail }).eq('id', id)
  }

  try {
    await sendNewGalleryEmail({
      couple_name: event.couple_name,
      slug: event.slug,
      password_plain: event.password_plain || '',
      edit_token: event.edit_token || '',
      couple_email: coupleEmail,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Send email error:', err)
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }
}
