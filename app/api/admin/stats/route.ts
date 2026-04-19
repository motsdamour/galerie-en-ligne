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

  const [eventsRes, sessionsRes] = await Promise.all([
    db.from('events').select('id, is_active, expires_at'),
    db.from('gallery_sessions').select('id', { count: 'exact', head: true }),
  ])

  const events = eventsRes.data || []
  const now = new Date().toISOString()

  const totalGalleries = events.length
  const liveGalleries = events.filter(
    e => e.is_active && (!e.expires_at || e.expires_at > now)
  ).length
  const totalSessions = sessionsRes.count || 0

  return NextResponse.json({
    totalGalleries,
    liveGalleries,
    totalSessions,
  })
}
