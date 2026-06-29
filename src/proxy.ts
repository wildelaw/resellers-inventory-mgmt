import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSetupStatus } from '@/lib/db-init';
import { runMigrations } from '@/lib/migrate';

const PUBLIC_PATHS = new Set(['/setup', '/login']);
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/health',
  '/api/setup',
  '/_next/',
  '/favicon.ico',
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  for (const p of PUBLIC_PREFIXES) {
    if (pathname === p || pathname.startsWith(p)) return true;
  }
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Run migrations once per process (idempotent) for any non-asset path.
  try {
    runMigrations();
  } catch {
    // If migrations fail (e.g. during build), continue — /setup can report the issue.
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  try {
    const status = await getSetupStatus();
    if (status.needsSetup && pathname !== '/setup') {
      const url = req.nextUrl.clone();
      url.pathname = '/setup';
      return NextResponse.redirect(url);
    }
  } catch {
    // If DB isn't ready, allow the request to continue so /setup can bootstrap.
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all paths except Next internals and static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};