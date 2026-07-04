import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Paths that are fully public — no auth required
const PUBLIC_PATHS = [
  '/',
  '/submit-bill',
  '/admin/login',
  '/login',                  // keep old path as alias
  '/api/auth/login',
  '/api/public',             // all /api/public/* routes
]

// Admin-only redirect target
const LOGIN_URL = '/admin/login'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Allow static assets and Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/manifest')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL(LOGIN_URL, request.url))
  }

  const user = await verifyToken(token)
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL(LOGIN_URL, request.url))
    response.cookies.delete('auth-token')
    return response
  }

  // Super Admin only paths — block regular Admin
  const SUPER_ADMIN_ONLY_API = ['/api/users']
  if (
    SUPER_ADMIN_ONLY_API.some((p) => pathname.startsWith(p)) &&
    user.role !== 'SUPER_ADMIN'
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      )
    }
  }

  // Forward user info in headers for API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', user.userId)
  requestHeaders.set('x-user-role', user.role)
  requestHeaders.set('x-user-email', user.email)
  requestHeaders.set('x-user-name', user.name)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|logo.png).*)'],
}
