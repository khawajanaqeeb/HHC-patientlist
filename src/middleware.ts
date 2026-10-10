import { NextRequest, NextResponse } from 'next/server';
import { getSession, COOKIE_NAME } from '@/lib/auth';

// POST endpoints that only read data and are safe for read-only users
const READ_ONLY_POST_PATHS = ['/api/photos/signed-urls'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass auth for public API endpoints and static assets
  if (
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/logout') ||
    pathname.startsWith('/api/auth/check') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Protect all data API routes
  if (pathname.startsWith('/api/')) {
    const cookie = request.cookies.get(COOKIE_NAME);
    const session = await getSession(cookie?.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const isRead = request.method === 'GET' || request.method === 'HEAD' || READ_ONLY_POST_PATHS.includes(pathname);
    if (!isRead && session.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Read-only account: you do not have permission to add, edit or delete data. Please log in as Super Admin.' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
