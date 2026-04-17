export const runtime = 'edge'

export async function GET(
  request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params
  const token = process.env.PCLOUD_AUTH_TOKEN
  const url = new URL(request.url)

  let fileUrl: string

  if (url.searchParams.get('hls')) {
    const hlsRes = await fetch(
      `https://eapi.pcloud.com/getvideolink?auth=${token}&fileid=${fileId}&abitrate=320&vbitrate=4000&resolution=1080x1920`
    )
    const hlsData = await hlsRes.json()
    if (hlsData.result === 0) {
      fileUrl = `https://${hlsData.hosts[0]}${hlsData.path}`
    } else {
      // fallback vers getfilelink si getvideolink échoue
      const linkRes = await fetch(
        `https://eapi.pcloud.com/getfilelink?auth=${token}&fileid=${fileId}`
      )
      const linkData = await linkRes.json()
      if (linkData.result !== 0) return new Response('pCloud error', { status: 502 })
      fileUrl = `https://${linkData.hosts[0]}${linkData.path}`
    }
  } else {
    const linkRes = await fetch(
      `https://eapi.pcloud.com/getfilelink?auth=${token}&fileid=${fileId}`
    )
    const linkData = await linkRes.json()
    if (linkData.result !== 0) return new Response('pCloud error', { status: 502 })
    fileUrl = `https://${linkData.hosts[0]}${linkData.path}`
  }
  const rangeHeader = request.headers.get('range')
  const fetchHeaders: HeadersInit = {}
  if (rangeHeader) fetchHeaders['range'] = rangeHeader

  const fileRes = await fetch(fileUrl, { headers: fetchHeaders })

  const responseHeaders = new Headers()
  responseHeaders.set('accept-ranges', 'bytes')
  responseHeaders.set('content-type', 'video/mp4')
  responseHeaders.set('cache-control', 'no-store, no-cache')
  responseHeaders.set('x-content-type-options', 'nosniff')

  const contentLength = fileRes.headers.get('content-length')
  if (contentLength) responseHeaders.set('content-length', contentLength)

  const contentRange = fileRes.headers.get('content-range')
  if (contentRange) responseHeaders.set('content-range', contentRange)

  if (url.searchParams.get('download')) {
    const filename = url.searchParams.get('filename') || 'video.mp4'
    responseHeaders.set('content-disposition', `attachment; filename="${filename}"`)
  }

  return new Response(fileRes.body, {
    status: fileRes.status,
    headers: responseHeaders,
  })
}
