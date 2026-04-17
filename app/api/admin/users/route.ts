import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data: users } = await db
    .from('users')
    .select('id, name, firstname, email, phone, is_active, created_at')
    .order('created_at', { ascending: false })

  // Compter les galeries par user
  const { data: events } = await db
    .from('events')
    .select('user_id')

  const countMap: Record<string, number> = {}
  for (const ev of events ?? []) {
    if (ev.user_id) countMap[ev.user_id] = (countMap[ev.user_id] || 0) + 1
  }

  const usersWithCount = (users ?? []).map(u => ({
    ...u,
    gallery_count: countMap[u.id] || 0,
  }))

  return NextResponse.json(usersWithCount)
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { name, firstname, email, phone } = await req.json()

  if (!name?.trim() || !firstname?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nom, prénom et email requis' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('users')
    .insert({ name: name.trim(), firstname: firstname.trim(), email: email.trim(), phone: phone?.trim() || null })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Cet email existe déjà' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
