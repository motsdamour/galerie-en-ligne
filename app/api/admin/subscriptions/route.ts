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
  const { data, error } = await db
    .from('subscriptions')
    .select('*, operator:operators(name, slug, email)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { operator_id, amount, start_date, notes } = await req.json()

  if (!operator_id || amount === undefined || !start_date) {
    return NextResponse.json({ error: 'Champs requis : operator_id, amount, start_date' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('subscriptions')
    .insert({
      operator_id,
      amount,
      currency: 'EUR',
      status: 'active',
      start_date,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
