import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { slug } = await params
  const db = supabaseAdmin()

  // Find operator
  const { data: operator } = await db
    .from('operators')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!operator) {
    return NextResponse.json({ error: 'Loueur introuvable' }, { status: 404 })
  }

  // Dissociate galleries (set operator_id to null)
  await db
    .from('events')
    .update({ operator_id: null })
    .eq('operator_id', operator.id)

  // Delete operator
  const { error } = await db
    .from('operators')
    .delete()
    .eq('id', operator.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
