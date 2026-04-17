export const runtime = 'edge'

export async function GET(
  request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params
  const token = process.env.PCLOUD_AUTH_TOKEN
  const url = new URL(request.url)

  const linkRes = await fetch(
    `https://eapi.pcloud.com/getfilelink?auth=${token}&fileid=${fileId}`
  )
  const linkData = await linkRes.json()
  if (linkData.result !== 0) return new Response('pCloud error', { status: 502 })

  const fileUrl = `https://${linkData.hosts[0]}${linkData.path}`

  // Pré-requête HEAD pour obtenir content-length
  const headRes = await fetch(fileUrl, { method: 'HEAD' })
  const totalSize = headRes.headers.get('content-length')

  const rangeHeader = request.headers.get('range')
  const fetchHeaders: HeadersInit = {}
  if (rangeHeader) fetchHeaders['range'] = rangeHeader

  const fileRes = await fetch(fileUrl, { headers: fetchHeaders })

  const responseHeaders = new Headers()
  responseHeaders.set('accept-ranges', 'bytes')
  responseHeaders.set('content-type', 'video/mp4')
  responseHeaders.set('cache-control', 'no-store')

  // Forcer content-length depuis HEAD si pas dans la réponse
  const contentLength = fileRes.headers.get('content-length') || totalSize
  if (contentLength) responseHeaders.set('content-length', contentLength)

  const contentRange = fileRes.headers.get('content-range')
  if (contentRange) responseHeaders.set('content-range', contentRange)

  if (url.searchParams.get('download')) {
    const filename = url.searchParams.get('filename') || 'video.mp4'
    responseHeaders.set('content-disposition', `attachment; filename="${filename}"`)
  }

  return new Response(fileRes.body, {
    status: rangeHeader ? 206 : 200,
    headers: responseHeaders,
  })
}
