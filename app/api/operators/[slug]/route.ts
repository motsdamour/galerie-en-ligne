import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

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

  // Find operator
  const { data: operator } = await db
    .from('operators')
    .select('id')
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

  // Delete operator
  const { error } = await db
    .from('operators')
    .delete()
    .eq('id', operator.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
