import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { fileId, edit_token } = await req.json()

  if (!fileId || !edit_token) {
    return NextResponse.json({ error: 'fileId et edit_token requis' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: event } = await db
    .from('events')
    .select('id, edit_token, hidden_files')
    .eq('slug', slug)
    .single()

  if (!event || event.edit_token !== edit_token) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const hiddenFiles = (event.hidden_files ?? []).filter((id: string) => id !== String(fileId))

  const { error } = await db
    .from('events')
    .update({ hidden_files: hiddenFiles })
    .eq('id', event.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
