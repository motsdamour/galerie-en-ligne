import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, createGalleryToken } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { password } = await req.json()

  const db = supabaseAdmin()
  const { data: event, error } = await db
    .from('events')
    .select('id, password_hash, is_active, expires_at')
    .eq('slug', slug)
    .single()

  if (error || !event) {
    const res = NextResponse.json({ error: 'Galerie introuvable' }, { status: 404 })
    res.cookies.delete(`gallery_${slug}`)
    return res
  }

  if (!event.is_active) {
    const res = NextResponse.json({ error: 'Cette galerie est désactivée' }, { status: 403 })
    res.cookies.delete(`gallery_${slug}`)
    return res
  }

  if (event.expires_at && new Date(event.expires_at) < new Date()) {
    const res = NextResponse.json({ error: 'Cette galerie a expiré' }, { status: 403 })
    res.cookies.delete(`gallery_${slug}`)
    return res
  }

  const valid = await verifyPassword(password, event.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  const token = createGalleryToken(event.id, slug)

  const response = NextResponse.json({ success: true })
  response.cookies.set(`gallery_${slug}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: '/',
  })

  return response
}
