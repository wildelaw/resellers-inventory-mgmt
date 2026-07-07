import { NextRequest, NextResponse } from 'next/server';
import { getSetupStatus } from '@/lib/db-init';

const PUBLIC_PATHS = ['/login', '/setup', '/api/auth', '/api/health', '/api/setup'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths without setup check.
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Allow static assets.
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  try {
    const { needsSetup } = await getSetupStatus();
    if (needsSetup && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/setup', req.url));
    }
  } catch {
    // If DB check fails (e.g. during build), allow through.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
