import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'
import QRCode from 'qrcode'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || req.nextUrl.searchParams.get('t')

  if (!token || !verifyAdminToken(token)) {
    return new NextResponse('Non autorise', { status: 401 })
  }

  const { id } = await params

  const db = supabaseAdmin()
  const { data: event } = await db
    .from('events')
    .select('slug, couple_name')
    .eq('id', id)
    .single()

  if (!event) {
    return new NextResponse('Evenement introuvable', { status: 404 })
  }

  const galleryUrl = `https://galerie-en-ligne.fr/galerie/${event.slug}`

  const pngBuffer = await QRCode.toBuffer(galleryUrl, {
    type: 'png',
    width: 512,
    margin: 2,
    color: { dark: '#3c3c3b', light: '#ffffff' },
  })

  return new NextResponse(pngBuffer.buffer as ArrayBuffer, {
    headers: {
      'content-type': 'image/png',
      'content-disposition': `attachment; filename="qr-${event.slug}.png"`,
      'cache-control': 'no-store',
    },
  })
}
