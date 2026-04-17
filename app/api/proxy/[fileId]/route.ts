import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params
  const token = process.env.PCLOUD_AUTH_TOKEN
  const url = new URL(request.url)

  const linkRes = await fetch(
    `https://eapi.pcloud.com/getfilelink?auth=${token}&fileid=${fileId}`
  )
  const linkData = await linkRes.json()
  if (linkData.result !== 0) return new NextResponse('pCloud error', { status: 502 })

  const fileUrl = `https://${linkData.hosts[0]}${linkData.path}`

  // Faire HEAD pour obtenir content-length
  const headRes = await fetch(fileUrl, { method: 'HEAD' })
  const totalSize = headRes.headers.get('content-length')

  const rangeHeader = request.headers.get('range')
  const fetchHeaders: HeadersInit = {}
  if (rangeHeader) fetchHeaders['range'] = rangeHeader

  const fileRes = await fetch(fileUrl, { headers: fetchHeaders })

  const headers: Record<string, string> = {
    'accept-ranges': 'bytes',
    'content-type': 'video/mp4',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  }

  // Forcer content-length depuis HEAD
  const contentLength = fileRes.headers.get('content-length') || totalSize
  if (contentLength) headers['content-length'] = contentLength

  const contentRange = fileRes.headers.get('content-range')
  if (contentRange) headers['content-range'] = contentRange

  if (url.searchParams.get('download')) {
    const filename = url.searchParams.get('filename') || 'file'
    headers['content-disposition'] = `attachment; filename="${filename}"`
  }

  // Node.js stream avec content-length forcé
  const chunks: Buffer[] = []
  const reader = fileRes.body!.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(Buffer.from(value))
  }
  const buffer = Buffer.concat(chunks)
  headers['content-length'] = buffer.length.toString()

  return new NextResponse(buffer, {
    status: rangeHeader ? 206 : 200,
    headers,
  })
}
