/**
 * Next.js middleware (named src/proxy.ts per BUILD_PROMPT STEP 6).
 *
 * - Allows public paths (setup, login, auth, health, setup API).
 * - Checks setup status; redirects unauthenticated users to /setup if needed.
 * - Otherwise allows through (auth enforcement happens in API routes / Server Components).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSetupStatus } from '@/lib/db-init';

const PUBLIC_PATHS = [
  '/login',
  '/setup',
  '/api/auth',
  '/api/health',
  '/api/setup',
  '/api/photos', // photo route auth is handled in the route itself; avoid blocking with redirects
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets and Next internals: skip.
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  try {
    const status = await getSetupStatus();
    if (status.needsSetup) {
      // Redirect to setup for page requests; API requests get 401.
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Setup required', code: 'SETUP_REQUIRED' }, { status: 503 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/setup';
      url.search = '';
      return NextResponse.redirect(url);
    }
  } catch {
    // If setup status can't be determined (DB unavailable), allow through so the
    // route handler can surface the error rather than looping.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};