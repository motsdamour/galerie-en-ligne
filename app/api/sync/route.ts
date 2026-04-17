import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import { sendNewGalleryEmail } from '@/lib/email'

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

  // List root pCloud folders
  const res = await fetch(`${PCLOUD_API}/listfolder?auth=${token}&folderid=0&recursive=0`)
  const data = await res.json() as { result?: number; error?: string; metadata?: { contents?: any[] } }

  if (data.error) {
    return NextResponse.json({ error: `pCloud: ${data.error}` }, { status: 502 })
  }

  const folders = (data.metadata?.contents ?? []).filter((c: any) => c.isfolder)

  const db = supabaseAdmin()
  const { data: existing } = await db
    .from('events')
    .select('pcloud_folder_id')

  const existingIds = new Set((existing ?? []).map((e: any) => String(e.pcloud_folder_id)))

  const created: string[] = []
  const skipped: string[] = []

  const today = new Date().toISOString().split('T')[0]
  const year = new Date().getFullYear()

  for (const folder of folders) {
    const folderId = String(folder.folderid)

    if (existingIds.has(folderId)) {
      skipped.push(folder.name)
      continue
    }

    const coupleName = folder.name.trim()
    const slug = slugify(coupleName, year)
    const password = passwordFromName(coupleName, year)
    const passwordHash = await hashPassword(password)

    const expiresAt = new Date(today)
    expiresAt.setMonth(expiresAt.getMonth() + 12)

    const { error } = await db.from('events').insert({
      couple_name: coupleName,
      event_date: today,
      event_type: 'mariage',
      pcloud_folder_id: folderId,
      slug,
      password_hash: passwordHash,
      password_plain: password,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    })

    if (error) {
      // Slug conflict — append folder id
      if (error.code === '23505') {
        const slugAlt = `${slug}-${folderId}`
        await db.from('events').insert({
          couple_name: coupleName,
          event_date: today,
          event_type: 'mariage',
          pcloud_folder_id: folderId,
          slug: slugAlt,
          password_hash: passwordHash,
          password_plain: password,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
      }
    }

    created.push(coupleName)

    try {
      await sendNewGalleryEmail({ couple_name: coupleName, slug, password_plain: password })
    } catch (err) {
      console.error('Email error:', err)
    }
  }

  return NextResponse.json({ created, skipped })
}
