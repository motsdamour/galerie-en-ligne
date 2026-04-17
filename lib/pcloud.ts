const PCLOUD_API = 'https://eapi.pcloud.com'
const TOKEN = process.env.PCLOUD_AUTH_TOKEN

export type PCloudFile = {
  fileid: number
  name: string
  size: number
  created: string
  contenttype: string
  thumb?: boolean
}

export type PCloudFolder = {
  name: string
  folderid: number
  videos: PCloudFile[]
}

function flattenVideos(contents: any[]): PCloudFile[] {
  const result: PCloudFile[] = []
  for (const item of contents) {
    if (item.isfolder) {
      result.push(...flattenVideos(item.contents ?? []))
    } else if (
      item.contenttype?.startsWith('video/') ||
      /\.(mp4|mov|avi|webm|mkv)$/i.test(item.name)
    ) {
      result.push(item)
    }
  }
  return result
}

// Liste les fichiers vidéo d'un dossier pCloud (récursif)
export async function listVideos(folderId: string): Promise<PCloudFile[]> {
  const res = await fetch(
    `${PCLOUD_API}/listfolder?auth=${TOKEN}&folderid=${folderId}&recursive=1`,
    { next: { revalidate: 60 } }
  )
  const data = await res.json()

  if (data.error) throw new Error(`pCloud error: ${data.error}`)

  return flattenVideos(data.metadata?.contents ?? [])
}

// Liste les vidéos organisées par sous-dossier
export async function listVideosByFolder(rootFolderId: string): Promise<PCloudFolder[]> {
  const res = await fetch(
    `${PCLOUD_API}/listfolder?auth=${TOKEN}&folderid=${rootFolderId}&recursive=0`,
    { next: { revalidate: 60 } }
  )
  const data = await res.json()

  if (data.error) throw new Error(`pCloud error: ${data.error}`)

  const contents = data.metadata?.contents ?? []
  const subfolders = contents.filter((c: any) => c.isfolder)

  if (subfolders.length === 0) {
    const videos = flattenVideos(contents)
    return videos.length > 0
      ? [{ name: 'Vidéos', folderid: Number(rootFolderId), videos }]
      : []
  }

  const results = await Promise.all(
    subfolders.map(async (folder: any) => {
      const videos = await listVideos(String(folder.folderid))
      return { name: folder.name, folderid: folder.folderid, videos }
    })
  )

  return results.filter(f => f.videos.length > 0)
}

// Génère un lien de téléchargement temporaire (24h)
export async function getDownloadLink(fileId: number): Promise<string> {
  const res = await fetch(
    `${PCLOUD_API}/getfilelink?auth=${TOKEN}&fileid=${fileId}`
  )
  const data = await res.json()

  if (data.error) throw new Error(`pCloud error: ${data.error}`)

  const host = data.hosts[0]
  const path = data.path
  return `https://${host}${path}`
}

// Génère un lien de streaming (pour le lecteur vidéo)
export async function getStreamLink(fileId: number): Promise<string> {
  const res = await fetch(
    `${PCLOUD_API}/getvideolink?auth=${TOKEN}&fileid=${fileId}`
  )
  const data = await res.json()

  if (data.error) {
    return getDownloadLink(fileId)
  }

  const host = data.hosts[0]
  const path = data.variants?.[0]?.path ?? data.path
  return `https://${host}${path}`
}
