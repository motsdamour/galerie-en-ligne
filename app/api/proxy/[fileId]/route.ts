export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params
  const token = process.env.PCLOUD_AUTH_TOKEN
  const url = new URL(request.url)
  const isDownload = url.searchParams.get('download')
  const filename = url.searchParams.get('filename') || 'file'

  const linkRes = await fetch(
    `https://eapi.pcloud.com/getfilelink?auth=${token}&fileid=${fileId}`
  )
  const linkData = await linkRes.json()
  if (linkData.result !== 0) return new Response('pCloud error', { status: 502 })

  const fileUrl = `https://${linkData.hosts[0]}${linkData.path}`

  // Pour le téléchargement : forcer content-disposition
  if (isDownload) {
    const fileRes = await fetch(fileUrl)
    const headers = new Headers()
    headers.set('content-disposition', `attachment; filename="${filename}"`)
    headers.set('content-type', fileRes.headers.get('content-type') || 'application/octet-stream')
    const contentLength = fileRes.headers.get('content-length')
    if (contentLength) headers.set('content-length', contentLength)
    return new Response(fileRes.body, { status: 200, headers })
  }

  // Pour le streaming vidéo/photo : redirect direct vers pCloud
  // pCloud liens sont valides ~1h, Safari iOS les lit parfaitement en redirect
  return Response.redirect(fileUrl, 302)
}
