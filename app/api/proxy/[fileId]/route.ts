import { NextRequest, NextResponse } from 'next/server'
import { getStreamLink, getDownloadLink } from '@/lib/pcloud'

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
  const filename = req.nextUrl.searchParams.get('filename') ?? fileId

  let pcloudUrl: string
  try {
    pcloudUrl = await resolveLink(fileIdNum, download)
  } catch {
    return new NextResponse('Erreur pCloud', { status: 502 })
  }

  // Transmettre le header Range (seeking vidéo)
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
    // Invalider le cache et réessayer une fois
    linkCache.delete(`${download ? 'dl' : 'stream'}-${fileIdNum}`)
    try {
      const freshUrl = await resolveLink(fileIdNum, download)
      upstream = await fetch(freshUrl, { headers: upstreamHeaders })
    } catch {
      return new NextResponse('Erreur upstream', { status: 502 })
    }
  }

  const resHeaders = new Headers()
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  resHeaders.set('content-type', contentType)

  const contentLength = upstream.headers.get('content-length')
  if (contentLength) resHeaders.set('content-length', contentLength)

  const contentRange = upstream.headers.get('content-range')
  if (contentRange) resHeaders.set('content-range', contentRange)

  const acceptRanges = upstream.headers.get('accept-ranges')
  if (acceptRanges) resHeaders.set('accept-ranges', acceptRanges)

  if (download) {
    resHeaders.set('content-disposition', `attachment; filename="${filename}"`)
  }

  resHeaders.set('cache-control', 'private, max-age=3600')

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}
