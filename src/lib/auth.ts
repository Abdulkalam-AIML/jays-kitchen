import { cookies } from 'next/headers'

let JWT_SECRET: string = process.env.JWT_SECRET || ''
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production!')
  }
  JWT_SECRET = 'fallback-secret-change-in-prod'
}

export interface JWTPayload {
  userId: string
  email: string
  role: 'ADMIN' | 'SUPER_ADMIN'
  name: string
}

function base64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(base64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i)
  }
  return arr
}

const encoder = new TextEncoder()

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signToken(payload: JWTPayload): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
  const tokenPayload = { ...payload, exp }
  
  const encodedHeader = base64url(encoder.encode(JSON.stringify(header)))
  const encodedPayload = base64url(encoder.encode(JSON.stringify(tokenPayload)))
  
  const tokenInput = `${encodedHeader}.${encodedPayload}`
  const key = await getCryptoKey(JWT_SECRET)
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(tokenInput)
  )
  const encodedSignature = base64url(new Uint8Array(signature))
  return `${tokenInput}.${encodedSignature}`
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [encodedHeader, encodedPayload, encodedSignature] = parts
    
    const tokenInput = `${encodedHeader}.${encodedPayload}`
    const key = await getCryptoKey(JWT_SECRET)
    const signature = base64urlDecode(encodedSignature)
    
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature as BufferSource,
      encoder.encode(tokenInput)
    )
    if (!valid) return null
    
    const decoder = new TextDecoder()
    const payload = JSON.parse(decoder.decode(base64urlDecode(encodedPayload)))
    
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null
    }
    
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    }
  } catch (err) {
    console.error('[JWT VERIFY ERROR]', err)
    return null
  }
}

export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null
  return await verifyToken(token)
}

export async function requireAuth(): Promise<JWTPayload> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireAdmin(): Promise<JWTPayload> {
  const user = await requireAuth()
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') throw new Error('Forbidden')
  return user
}

export async function requireSuperAdmin(): Promise<JWTPayload> {
  const user = await requireAuth()
  if (user.role !== 'SUPER_ADMIN') throw new Error('Forbidden: Super Admin access required')
  return user
}
