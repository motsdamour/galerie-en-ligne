import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET!

// Hasher un mot de passe
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

// Vérifier un mot de passe
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

// Créer un token JWT de session galerie
export function createGalleryToken(eventId: string, slug: string) {
  return jwt.sign({ eventId, slug }, JWT_SECRET, { expiresIn: '7d' })
}

// Vérifier un token JWT
export function verifyGalleryToken(token: string): { eventId: string; slug: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { eventId: string; slug: string }
  } catch {
    return null
  }
}

// Vérifier si l'utilisateur est authentifié pour une galerie
export async function isAuthorized(slug: string): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(`gallery_${slug}`)?.value
  if (!token) return false

  const payload = verifyGalleryToken(token)
  return payload?.slug === slug
}

// Token admin back-office
export function createAdminToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyAdminToken(token: string): boolean {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { role: string }
    return payload.role === 'admin'
  } catch {
    return false
  }
}
