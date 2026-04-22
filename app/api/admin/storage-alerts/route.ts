import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

const PCLOUD_API = 'https://eapi.pcloud.com'

function sumFileSize(contents: any[]): number {
  let total = 0
  for (const item of contents) {
    if (item.isfolder) {
      total += sumFileSize(item.contents ?? [])
    } else {
      total += item.size || 0
    }
  }
  return total
}

function roundTo2Decimals(n: number): number {
  return Math.round(n * 100) / 100
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const pcloudToken = process.env.PCLOUD_AUTH_TOKEN
  if (!pcloudToken) {
    return NextResponse.json({ error: 'Token pCloud manquant' }, { status: 500 })
  }

  const db = supabaseAdmin()
  const { data: operators, error } = await db
    .from('operators')
    .select('id, name, email, slug, pcloud_folder_id, storage_limit_gb')
    .not('pcloud_folder_id', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const alerts: {
    name: string
    email: string
    slug: string
    used_gb: number
    limit_gb: number
    percent: number
  }[] = []

  for (const operator of operators ?? []) {
    const limitGb = operator.storage_limit_gb || 100

    try {
      const res = await fetch(
        `${PCLOUD_API}/listfolder?auth=${pcloudToken}&folderid=${operator.pcloud_folder_id}&recursive=1`
      )
      const data = await res.json()

      if (data.result !== 0) continue

      const totalBytes = sumFileSize(data.metadata?.contents ?? [])
      const usedGb = roundTo2Decimals(totalBytes / 1073741824)
      const percent = roundTo2Decimals((usedGb / limitGb) * 100)

      if (percent > 80) {
        alerts.push({
          name: operator.name,
          email: operator.email,
          slug: operator.slug,
          used_gb: usedGb,
          limit_gb: limitGb,
          percent,
        })
      }
    } catch (err) {
      console.error(`[STORAGE-ALERTS] Error for operator ${operator.slug}:`, err)
    }
  }

  return NextResponse.json({ alerts })
}
