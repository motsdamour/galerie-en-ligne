export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  const url = new URL(request.url)
  const pcloudUrl = url.searchParams.get('url')

  if (!pcloudUrl) return new Response('Missing url', { status: 400 })

  const res = await fetch(decodeURIComponent(pcloudUrl))
  const contentType = res.headers.get('content-type') || 'application/octet-stream'

  // Si c'est un .m3u8, réécrire les URLs des chunks pour passer par notre proxy
  if (contentType.includes('mpegurl') || pcloudUrl.includes('.m3u8')) {
    const text = await res.text()
    const baseUrl = pcloudUrl.substring(0, pcloudUrl.lastIndexOf('/') + 1)
    const rewritten = text.split('\n').map(line => {
      if (line.startsWith('#') || line.trim() === '') return line
      const chunkUrl = line.startsWith('http') ? line : baseUrl + line
      return `/api/hls/chunk?url=${encodeURIComponent(chunkUrl)}`
    }).join('\n')

    return new Response(rewritten, {
      headers: {
        'content-type': 'application/x-mpegURL',
        'access-control-allow-origin': '*',
        'cache-control': 'no-store'
      }
    })
  }

  // Pour les chunks .ts
  return new Response(res.body, {
    status: res.status,
    headers: {
      'content-type': 'video/mp2t',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=3600'
    }
  })
}
