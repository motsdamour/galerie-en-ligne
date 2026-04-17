import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, verifyAdminToken } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.password !== undefined) {
    if (!body.password || body.password.length < 4) {
      return NextResponse.json({ error: 'Mot de passe trop court (min 4 caractères)' }, { status: 400 })
    }
    updates.password_hash = await hashPassword(body.password)
    updates.password_plain = body.password
  }

  if (body.password_plain !== undefined && body.password === undefined) {
    updates.password_plain = body.password_plain
  }

  if (body.couple_name !== undefined) {
    if (!body.couple_name.trim()) {
      return NextResponse.json({ error: 'Nom invalide' }, { status: 400 })
    }
    updates.couple_name = body.couple_name.trim()
  }

  if (body.user_id !== undefined) {
    updates.user_id = body.user_id || null
  }

  if (body.couple_email !== undefined) {
    updates.couple_email = body.couple_email?.trim() || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { error } = await db
    .from('events')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  const db = supabaseAdmin()
  const { error } = await db
    .from('events')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
