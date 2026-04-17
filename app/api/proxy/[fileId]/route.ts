import { NextRequest, NextResponse } from 'next/server'
import ffmpegPath from 'ffmpeg-static'
import { spawn } from 'child_process'

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

  if (url.searchParams.get('download')) {
    const fileRes = await fetch(fileUrl)
    const filename = url.searchParams.get('filename') || 'video.mp4'
    return new NextResponse(fileRes.body, {
      headers: {
        'content-type': 'video/mp4',
        'content-disposition': `attachment; filename="${filename}"`,
      }
    })
  }

  // Remuxer OPUS → AAC avec FFmpeg à la volée
  const ffmpeg = spawn(ffmpegPath!, [
    '-i', fileUrl,
    '-c:v', 'copy',      // copie vidéo sans réencoder
    '-c:a', 'aac',       // convertir audio en AAC
    '-movflags', 'frag_keyframe+empty_moov+faststart',
    '-f', 'mp4',
    'pipe:1'             // output vers stdout
  ])

  const stream = new ReadableStream({
    start(controller) {
      ffmpeg.stdout.on('data', (chunk: Buffer) => controller.enqueue(chunk))
      ffmpeg.stdout.on('end', () => controller.close())
      ffmpeg.stderr.on('data', () => {}) // ignorer stderr
      ffmpeg.on('error', (err) => controller.error(err))
    }
  })

  return new NextResponse(stream, {
    headers: {
      'content-type': 'video/mp4',
      'accept-ranges': 'bytes',
      'cache-control': 'no-store',
      'transfer-encoding': 'chunked',
    }
  })
}
