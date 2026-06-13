import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/setup', '/api/auth', '/api/health', '/api/setup'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Check if setup is needed by calling the setup API
  try {
    const setupUrl = new URL('/api/setup', req.url);
    const response = await fetch(setupUrl);
    const data = await response.json();
    if (data.needsSetup) {
      return NextResponse.redirect(new URL('/setup', req.url));
    }
  } catch {
    // If we can't check setup status, let the request through
    // The page components will handle the redirect
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};