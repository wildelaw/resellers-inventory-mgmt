import { NextResponse, type NextRequest } from 'next/server';
import { getSetupStatus } from '@/lib/db-init';

// Next.js 16 renamed middleware to proxy — the export must be named `proxy`.
// In Next 16 the proxy always runs on the Node.js runtime, so no segment
// config export is needed (and it is rejected if present).

const PUBLIC_PATHS = [
  '/setup',
  '/login',
  '/api/auth/',
  '/api/health',
  '/api/setup',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Public paths pass through (/setup is handled by the setup check below)
  if (isPublicPath(pathname) && pathname !== '/setup') {
    return NextResponse.next();
  }

  // 2. Setup gating: redirect to /setup until the first admin exists
  try {
    const status = await getSetupStatus();

    if (status.needsSetup) {
      if (pathname !== '/setup') {
        const url = req.nextUrl.clone();
        url.pathname = '/setup';
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Setup already complete — the setup page is no longer needed
    if (pathname === '/setup') {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error('Proxy setup check failed:', error);
    // Fail open on infrastructure errors so the app stays reachable
    return NextResponse.next();
  }

  // 3. Otherwise allow through (per-page auth is enforced by Server Components)
  return NextResponse.next();
}