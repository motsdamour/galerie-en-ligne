import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOperatorSession } from '@/lib/operator-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getOperatorSession()

  if (!session || session.operatorSlug !== slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data: events } = await db
    .from('events')
    .select('id, couple_name, event_date, event_type, slug, is_active, expires_at, created_at, password_plain, edit_token, couple_email')
    .eq('operator_id', session.operatorId)
    .order('created_at', { ascending: false })

  // Stats
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
