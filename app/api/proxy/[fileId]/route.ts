export const runtime = 'edge'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  const fileIdNum = parseInt(fileId, 10)
  if (isNaN(fileIdNum)) {
    return new Response('fileId invalide', { status: 400 })
  }

  const token = process.env.PCLOUD_AUTH_TOKEN
  if (!token) {
    return new Response('Token manquant', { status: 500 })
  }

  const url = new URL(req.url)
  const download = url.searchParams.get('download') === '1'
  const filename = url.searchParams.get('filename') ?? ''

  // Obtenir le lien pCloud côté serveur (IP du edge node)
  let pcloudUrl: string
  try {
    const res = await fetch(
      `https://eapi.pcloud.com/getfilelink?auth=${token}&fileid=${fileIdNum}`
    )
    const data = await res.json() as { result?: number; error?: string; hosts?: string[]; path?: string }

    if (data.error || !data.hosts?.[0] || !data.path) {
      console.error('[proxy] pCloud error:', data.error ?? 'réponse invalide')
      return new Response(`Erreur pCloud: ${data.error ?? 'réponse invalide'}`, { status: 502 })
    }

    pcloudUrl = `https://${data.hosts[0]}${data.path}`
  } catch (err) {
    console.error('[proxy] fetch pCloud error:', err)
    return new Response('Erreur pCloud', { status: 502 })
  }

  // Transmettre le header Range si présent (seeking vidéo)
  const rangeHeader = req.headers.get('range')
  const upstreamHeaders: HeadersInit = {}
  if (rangeHeader) upstreamHeaders['Range'] = rangeHeader

  let upstream: Response
  try {
    upstream = await fetch(pcloudUrl, { headers: upstreamHeaders })
  } catch (err) {
    console.error('[proxy] fetch upstream error:', err)
    return new Response('Erreur upstream', { status: 502 })
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

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}
