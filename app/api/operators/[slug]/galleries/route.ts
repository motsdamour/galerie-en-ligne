import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOperatorSession } from '@/lib/operator-auth'
import { auth } from '@/lib/auth-config'

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
