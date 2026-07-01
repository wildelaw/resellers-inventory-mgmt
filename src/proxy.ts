import { NextRequest, NextResponse } from 'next/server';
import { getSetupStatus } from '@/lib/db-init';

const PUBLIC_PATHS = [
  '/setup',
  '/login',
  '/api/auth',
  '/api/health',
  '/api/setup',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check setup status
  try {
    const status = await getSetupStatus();
    if (status.needsSetup) {
      // Redirect to setup for page requests, 401 for API requests
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Setup required', code: 'SETUP_REQUIRED' }, { status: 503 });
      }
      return NextResponse.redirect(new URL('/setup', req.url));
    }
  } catch {
    // If we can't check setup status, allow the request through
    // (database may not be initialized yet)
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};