import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { auth } from '@/lib/auth-config'

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const user = session.user as any
  const isAdmin = user.isAdmin === true
  const isOperator = user.operatorSlug === slug

  if (!isAdmin && !isOperator) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const db = supabaseAdmin()
  const { data: operator, error } = await db
    .from('operators')
    .select('id, pcloud_folder_id, storage_limit_gb')
    .eq('slug', slug)
    .single()

  if (error || !operator) {
    return NextResponse.json({ error: 'Opérateur introuvable' }, { status: 404 })
  }

  const limitGb = operator.storage_limit_gb || 100

  if (!operator.pcloud_folder_id) {
    return NextResponse.json({ used_gb: 0, limit_gb: limitGb, percent: 0 })
  }

  const token = process.env.PCLOUD_AUTH_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Token pCloud manquant' }, { status: 500 })
  }

  const res = await fetch(
    `${PCLOUD_API}/listfolder?auth=${token}&folderid=${operator.pcloud_folder_id}&recursive=1`
  )
  const data = await res.json()

  if (data.result !== 0) {
    return NextResponse.json({ error: 'Erreur pCloud' }, { status: 502 })
  }

  const totalBytes = sumFileSize(data.metadata?.contents ?? [])
  const usedGb = roundTo2Decimals(totalBytes / 1073741824)
  const percent = roundTo2Decimals((usedGb / limitGb) * 100)

  return NextResponse.json({ used_gb: usedGb, limit_gb: limitGb, percent })
}
