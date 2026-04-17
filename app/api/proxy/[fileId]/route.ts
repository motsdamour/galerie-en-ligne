import { NextRequest, NextResponse } from 'next/server'
import { getStreamLink, getDownloadLink } from '@/lib/pcloud'

const VIDEO_EXTS = /\.(mp4|mov|avi|webm|mkv)$/i

// Cache in-memory des liens pCloud (valables ~1h côté pCloud)
const linkCache = new Map<string, { url: string; expires: number }>()

async function resolveLink(fileId: number, download: boolean): Promise<string> {
  const key = `${download ? 'dl' : 'stream'}-${fileId}`
  const cached = linkCache.get(key)
  if (cached && cached.expires > Date.now()) return cached.url

  const url = download ? await getDownloadLink(fileId) : await getStreamLink(fileId)
  linkCache.set(key, { url, expires: Date.now() + 50 * 60 * 1000 }) // 50 min
  return url
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  const fileIdNum = parseInt(fileId, 10)
  if (isNaN(fileIdNum)) {
    return new NextResponse('fileId invalide', { status: 400 })
  }

  const download = req.nextUrl.searchParams.get('download') === '1'
  const filename = req.nextUrl.searchParams.get('filename') ?? ''
  const isVideo = VIDEO_EXTS.test(filename)

  let pcloudUrl: string
  try {
    pcloudUrl = await resolveLink(fileIdNum, download)
  } catch (err) {
    console.error('[proxy] resolveLink error:', err)
    return new NextResponse('Erreur pCloud', { status: 502 })
  }

  // Vidéos : redirect 302 vers pCloud — évite la limite 4.5MB de Vercel
  if (isVideo) {
    return NextResponse.redirect(pcloudUrl, 302)
  }

  // Images et autres petits fichiers : stream direct avec bons headers
  const rangeHeader = req.headers.get('range')
  const upstreamHeaders: HeadersInit = {}
  if (rangeHeader) upstreamHeaders['Range'] = rangeHeader

  let upstream: Response
  try {
    upstream = await fetch(pcloudUrl, { headers: upstreamHeaders })
  } catch {
    return new NextResponse('Erreur upstream', { status: 502 })
  }

  if (!upstream.ok && upstream.status !== 206) {
    // Lien expiré : invalider le cache et réessayer
    linkCache.delete(`${download ? 'dl' : 'stream'}-${fileIdNum}`)
    try {
      const freshUrl = await resolveLink(fileIdNum, download)
      upstream = await fetch(freshUrl, { headers: upstreamHeaders })
    } catch {
      return new NextResponse('Erreur upstream', { status: 502 })
    }
  }

  const resHeaders = new Headers()
  resHeaders.set('content-type', upstream.headers.get('content-type') ?? 'application/octet-stream')

  const contentLength = upstream.headers.get('content-length')
  if (contentLength) resHeaders.set('content-length', contentLength)

  const contentRange = upstream.headers.get('content-range')
  if (contentRange) resHeaders.set('content-range', contentRange)

  const acceptRanges = upstream.headers.get('accept-ranges')
  if (acceptRanges) resHeaders.set('accept-ranges', acceptRanges)

  if (download && filename) {
    resHeaders.set('content-disposition', `attachment; filename="${filename}"`)
  }

  resHeaders.set('cache-control', 'private, max-age=3600')

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}
