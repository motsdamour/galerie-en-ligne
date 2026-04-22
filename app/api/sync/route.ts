import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import { sendNewGalleryEmail } from '@/lib/email'
import { sendNotification } from '@/lib/onesignal'

const PCLOUD_API = 'https://eapi.pcloud.com'

function slugify(name: string, year: number): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-') + `-${year}`
}

function passwordFromName(name: string, year: number): string {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
  return words.join('') + year
}

export async function GET(req: NextRequest) {
  const secret = process.env.SYNC_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
  }

  const token = process.env.PCLOUD_AUTH_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'PCLOUD_AUTH_TOKEN manquant' }, { status: 500 })
  }

  const rootFolderId = process.env.PCLOUD_ROOT_FOLDER_ID || '0'

  // 1. List operator folders in root
  const res = await fetch(`${PCLOUD_API}/listfolder?auth=${token}&folderid=${rootFolderId}&recursive=0`)
  const data = await res.json() as { result?: number; error?: string; metadata?: { contents?: any[] } }

  if (data.error) {
    return NextResponse.json({ error: `pCloud: ${data.error}` }, { status: 502 })
  }

  const operatorFolders = (data.metadata?.contents ?? []).filter(
    (c: any) => c.isfolder && c.name !== 'Logos loueurs'
  )

  const db = supabaseAdmin()

  // Load existing events to check duplicates
  const { data: existing } = await db.from('events').select('pcloud_folder_id')
  const existingIds = new Set((existing ?? []).map((e: any) => String(e.pcloud_folder_id)))

  // Load all operators
  const { data: allOperators } = await db.from('operators').select('id, name')

  const created: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  const today = new Date().toISOString().split('T')[0]
  const year = new Date().getFullYear()

  for (const opFolder of operatorFolders) {
    const opFolderName = opFolder.name.trim()

    // 2. Match operator by name (case-insensitive)
    const operator = (allOperators ?? []).find(
      (op: any) => op.name.toLowerCase() === opFolderName.toLowerCase()
    )

    console.log('[SYNC] Dossier opérateur:', opFolderName, 'operator_id:', operator?.id ?? 'non trouvé')

    // 3. List subfolders (events) inside this operator folder
    const subRes = await fetch(`${PCLOUD_API}/listfolder?auth=${token}&folderid=${opFolder.folderid}&recursive=0`)
    const subData = await subRes.json()

    const eventFolders = (subData.metadata?.contents ?? []).filter((c: any) => c.isfolder)

    for (const eventFolder of eventFolders) {
      const folderId = String(eventFolder.folderid)
      const eventName = eventFolder.name.trim()

      console.log('[SYNC] Événement trouvé:', eventName, 'folderid:', folderId)

      if (existingIds.has(folderId)) {
        skipped.push(`${opFolderName}/${eventName}`)
        continue
      }

      const slug = slugify(eventName, year)
      const password = passwordFromName(eventName, year)
      const passwordHash = await hashPassword(password)

      const expiresAt = new Date(today)
      expiresAt.setDate(expiresAt.getDate() + 30)

      const editToken = crypto.randomUUID()

      const insertData: any = {
        couple_name: eventName,
        event_date: today,
        event_type: 'mariage',
        pcloud_folder_id: folderId,
        slug,
        password_hash: passwordHash,
        password_plain: password,
        edit_token: editToken,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      }

      if (operator) {
        insertData.operator_id = operator.id
      }

      const { error } = await db.from('events').insert(insertData)

      if (error) {
        if (error.code === '23505') {
          const slugAlt = `${slug}-${folderId}`
          await db.from('events').insert({ ...insertData, slug: slugAlt })
        } else {
          errors.push(`${eventName}: ${error.message}`)
          continue
        }
      }

      existingIds.add(folderId)
      created.push(`${opFolderName}/${eventName}`)

      try {
        await sendNewGalleryEmail({ couple_name: eventName, slug, password_plain: password, edit_token: editToken, couple_email: null })
      } catch (err) {
        console.error('[SYNC] Email error:', err)
      }

      await sendNotification(
        'Nouvelle galerie creee !',
        `La galerie de ${eventName} est en ligne`,
        `${process.env.NEXT_PUBLIC_SITE_URL}/galerie/${slug}`
      )
    }
  }

  return NextResponse.json({ created, skipped, errors: errors.length > 0 ? errors : undefined })
}
