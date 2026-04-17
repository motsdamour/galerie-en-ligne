import { NextRequest, NextResponse } from 'next/server'
import { getStreamLink, getDownloadLink } from '@/lib/pcloud'

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

  let pcloudUrl: string
  try {
    pcloudUrl = download
      ? await getDownloadLink(fileIdNum)
      : await getStreamLink(fileIdNum)
  } catch {
    return new NextResponse('Erreur pCloud', { status: 502 })
  }

  return NextResponse.redirect(pcloudUrl, 302)
}
