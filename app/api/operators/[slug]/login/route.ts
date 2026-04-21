import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword } from '@/lib/auth'
import { createOperatorToken } from '@/lib/operator-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: operator } = await db
    .from('operators')
    .select('id, slug, email, password_hash, is_active, name')
    .eq('slug', slug)
    .single()

  if (!operator || !operator.is_active) {
    return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
  }

  if (operator.email !== email) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
  }

  const valid = await verifyPassword(password, operator.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
  }

  const token = createOperatorToken(operator.id, operator.slug)

  const response = NextResponse.json({ success: true, name: operator.name })
  response.cookies.set('operator_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}
