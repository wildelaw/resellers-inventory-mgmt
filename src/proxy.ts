import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const publicPaths = [
  '/login',
  '/setup',
  '/api/auth',
  '/api/health',
  '/api/setup',
];

// Check if path is public
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check setup status via API (avoids Node.js-only db module in Edge runtime)
  try {
    const setupUrl = new URL('/api/setup', request.url);
    const setupRes = await fetch(setupUrl.toString(), {
      headers: { 'x-proxy-check': '1' },
    });

    if (setupRes.ok) {
      const data = await setupRes.json();
      if (data.needsSetup && pathname !== '/setup') {
        return NextResponse.redirect(new URL('/setup', request.url));
      }
    }
  } catch {
    // On error (DB not ready), redirect to setup
    if (pathname !== '/setup') {
      return NextResponse.redirect(new URL('/setup', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
