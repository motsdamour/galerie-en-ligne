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
  const thumb = url.searchParams.get('thumb') === '1'
  const filename = url.searchParams.get('filename') ?? ''

  // Thumbnail via getthumb
  if (thumb) {
    let pcloudUrl: string
    try {
      const res = await fetch(
        `https://eapi.pcloud.com/getthumb?auth=${token}&fileid=${fileIdNum}&size=400x600&crop=1&type=jpg`
      )
      const data = await res.json() as { result?: number; error?: string; hosts?: string[]; path?: string }
      if (data.error || !data.hosts?.[0] || !data.path) {
        console.error('[proxy] getthumb error:', data.error ?? 'réponse invalide')
        return new Response(`Erreur pCloud thumb: ${data.error ?? 'réponse invalide'}`, { status: 502 })
      }
      pcloudUrl = `https://${data.hosts[0]}${data.path}`
    } catch (err) {
      console.error('[proxy] getthumb fetch error:', err)
      return new Response('Erreur pCloud thumb', { status: 502 })
    }

    const upstream = await fetch(pcloudUrl)
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'cache-control': 'public, max-age=86400',
        'x-content-type-options': 'nosniff',
      },
    })
  }

  // Fichier principal via getfilelink
  let pcloudUrl: string
  try {
    const res = await fetch(
      `https://eapi.pcloud.com/getfilelink?auth=${token}&fileid=${fileIdNum}`
    )
    const data = await res.json() as { result?: number; error?: string; hosts?: string[]; path?: string }

    if (data.error || !data.hosts?.[0] || !data.path) {
      console.error('[proxy] getfilelink error:', data.error ?? 'réponse invalide')
      return new Response(`Erreur pCloud: ${data.error ?? 'réponse invalide'}`, { status: 502 })
    }

    pcloudUrl = `https://${data.hosts[0]}${data.path}`
  } catch (err) {
    console.error('[proxy] getfilelink fetch error:', err)
    return new Response('Erreur pCloud', { status: 502 })
  }

  // Toujours forwarder le header Range (essentiel pour Safari iOS / seeking vidéo)
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

  // Content-Type : forcer video/mp4 pour les fichiers .mp4
  const lowerFilename = filename.toLowerCase()
  const isMP4 = lowerFilename.endsWith('.mp4') || pcloudUrl.toLowerCase().includes('.mp4')
  const upstreamCT = upstream.headers.get('content-type') ?? 'application/octet-stream'
  resHeaders.set('content-type', isMP4 ? 'video/mp4' : upstreamCT)

  const contentLength = upstream.headers.get('content-length')
  if (contentLength) resHeaders.set('content-length', contentLength)

  const contentRange = upstream.headers.get('content-range')
  if (contentRange) resHeaders.set('content-range', contentRange)

  // Toujours indiquer le support des range requests (requis pour Safari iOS)
  resHeaders.set('accept-ranges', 'bytes')

  resHeaders.set('x-content-type-options', 'nosniff')

  if (download && filename) {
    resHeaders.set('content-disposition', `attachment; filename="${filename}"`)
  }

  resHeaders.set('cache-control', 'private, max-age=3600')

  // Retourner 206 si le browser avait envoyé un Range et que pCloud répond 206
  const status = rangeHeader && upstream.status === 206 ? 206 : upstream.status

  return new Response(upstream.body, { status, headers: resHeaders })
}
