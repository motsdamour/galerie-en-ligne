export const runtime = 'edge'

export async function GET(request: Request, { params }: { params: { fileId: string } }) {
  const token = process.env.PCLOUD_AUTH_TOKEN
  const fileId = params.fileId

  // 1. Obtenir le lien de téléchargement depuis pCloud EU
  const linkRes = await fetch(
    `https://eapi.pcloud.com/getfilelink?auth=${token}&fileid=${fileId}`
  )
  const linkData = await linkRes.json()
  if (linkData.result !== 0) {
    return new Response('pCloud error', { status: 502 })
  }
  const fileUrl = `https://${linkData.hosts[0]}${linkData.path}`

  // 2. Forward la requête vers pCloud avec le header Range si présent
  const rangeHeader = request.headers.get('range')
  const fetchHeaders: HeadersInit = {}
  if (rangeHeader) fetchHeaders['range'] = rangeHeader

  const fileRes = await fetch(fileUrl, { headers: fetchHeaders })

  // 3. Construire les headers de réponse
  const responseHeaders = new Headers()
  responseHeaders.set('accept-ranges', 'bytes')
  responseHeaders.set('cache-control', 'public, max-age=3600')

  const contentType = fileRes.headers.get('content-type')
  if (contentType) responseHeaders.set('content-type', contentType)
  else if (fileId.toString().includes('mp4')) responseHeaders.set('content-type', 'video/mp4')

  const contentLength = fileRes.headers.get('content-length')
  if (contentLength) responseHeaders.set('content-length', contentLength)

  const contentRange = fileRes.headers.get('content-range')
  if (contentRange) responseHeaders.set('content-range', contentRange)

  const isDownload = new URL(request.url).searchParams.get('download')
  if (isDownload) {
    const filename = new URL(request.url).searchParams.get('filename') || 'file'
    responseHeaders.set('content-disposition', `attachment; filename="${filename}"`)
  }

  return new Response(fileRes.body, {
    status: fileRes.status,
    headers: responseHeaders,
  })
}
