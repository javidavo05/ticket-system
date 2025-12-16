import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

const CSRF_TOKEN_NAME = 'csrf-token'
const CSRF_TOKEN_EXPIRY = 3600 // 1 hour

export async function generateCSRFToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()
  
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY,
    path: '/',
  })

  return token
}

export async function validateCSRFToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const storedToken = cookieStore.get(CSRF_TOKEN_NAME)?.value

  if (!storedToken || storedToken !== token) {
    return false
  }

  return true
}

export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_TOKEN_NAME)?.value || null
}

