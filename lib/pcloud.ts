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

// Liste les fichiers vidéo d'un dossier pCloud
export async function listVideos(folderId: string): Promise<PCloudFile[]> {
  const res = await fetch(
    `${PCLOUD_API}/listfolder?auth=${TOKEN}&folderid=${folderId}&recursive=1`,
    { next: { revalidate: 60 } } // cache 60s
  )
  const data = await res.json()

  if (data.error) throw new Error(`pCloud error: ${data.error}`)

  const contents: PCloudFile[] = data.metadata?.contents ?? []

  // Filtrer uniquement les vidéos
  return contents.filter(f =>
    f.contenttype?.startsWith('video/') ||
    /\.(mp4|mov|avi|webm|mkv)$/i.test(f.name)
  )
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
    // Fallback sur lien de téléchargement direct
    return getDownloadLink(fileId)
  }

  const host = data.hosts[0]
  const path = data.variants?.[0]?.path ?? data.path
  return `https://${host}${path}`
}
