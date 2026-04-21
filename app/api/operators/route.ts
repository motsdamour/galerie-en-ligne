import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { name, slug, email, password, city, phone } = await req.json()

  if (!name || !slug || !email || !password) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const passwordHash = await hashPassword(password)

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('operators')
    .insert({ name, slug, email, password_hash: passwordHash, city: city || null, phone: phone || null })
    .select('id, name, slug, email, city, phone, is_active, created_at')
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
    .select('id, name, slug, email, city, phone, is_active, created_at')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
