import { NextRequest, NextResponse } from 'next/server'
import { createAdminToken } from '@/lib/auth'
import { auth } from '@/lib/auth-config'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  // Allow Google-authenticated admin to get a JWT token
  if (password === '__google_auth__') {
    const session = await auth()
    if ((session?.user as any)?.isAdmin) {
      const token = createAdminToken()
      return NextResponse.json({ success: true, token })
    }
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Legacy password auth (kept for API tools like sync)
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  const token = createAdminToken()
  return NextResponse.json({ success: true, token })
}
