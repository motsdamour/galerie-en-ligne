import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET!

export type OperatorPayload = {
  operatorId: string
  operatorSlug: string
  role: 'operator'
}

export function createOperatorToken(operatorId: string, operatorSlug: string) {
  return jwt.sign({ operatorId, operatorSlug, role: 'operator' }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyOperatorToken(token: string): OperatorPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as OperatorPayload
    if (payload.role !== 'operator') return null
    return payload
  } catch {
    return null
  }
}

export async function getOperatorSession(): Promise<OperatorPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('operator_session')?.value
  if (!token) return null
  return verifyOperatorToken(token)
}
