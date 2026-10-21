import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'reseller_panel_fallback_secret_key_12345';
const COOKIE_NAME = 'reseller_session_token';

// Routes that require auth
const ADMIN_API_ROUTES = ['/api/admin'];
const RESELLER_API_ROUTES = ['/api/reseller'];
const ADMIN_PAGE_ROUTES = ['/admin'];
const RESELLER_PAGE_ROUTES = ['/reseller'];

function verifyToken(token: string): { userId: string; username: string; role: 'admin' | 'reseller' } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: 'admin' | 'reseller' };
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Skip auth check for login page, root, and public assets
  if (pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const session = token ? verifyToken(token) : null;

  // Determine if this is an admin or reseller route
  const isAdminApi = ADMIN_API_ROUTES.some(r => pathname.startsWith(r));
  const isResellerApi = RESELLER_API_ROUTES.some(r => pathname.startsWith(r));
  const isAdminPage = ADMIN_PAGE_ROUTES.some(r => pathname.startsWith(r));
  const isResellerPage = RESELLER_PAGE_ROUTES.some(r => pathname.startsWith(r));
  const isApiRoute = pathname.startsWith('/api/');

  // --- Page route protection ---
  if (isAdminPage || isResellerPage) {
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (isAdminPage && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/reseller/dashboard', request.url));
    }
    if (isResellerPage && session.role !== 'reseller') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // --- API route protection ---
  if (isAdminApi || isResellerApi) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isAdminApi && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (isResellerApi && session.role !== 'reseller' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Attach session data to headers so API routes can read it without re-verifying
    const response = NextResponse.next();
    response.headers.set('x-user-id', session.userId);
    response.headers.set('x-user-role', session.role);
    response.headers.set('x-user-name', session.username);
    return response;
  }

  // For other /api/* routes (auth routes like /api/auth/login, /api/auth/me), allow through
  if (isApiRoute) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/reseller/:path*',
    '/api/admin/:path*',
    '/api/reseller/:path*',
  ],
};
