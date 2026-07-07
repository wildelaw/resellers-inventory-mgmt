import { NextRequest, NextResponse } from 'next/server';
import { getSetupStatus } from '@/lib/db-init';

const publicPaths = [
  '/setup',
  '/login',
  '/api/auth',
  '/api/health',
  '/api/setup',
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check setup status
  try {
    const status = await getSetupStatus();
    if (status.needsSetup) {
      // Redirect to setup for page requests
      if (!pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/setup', req.url));
      }
      // Return 401 for API requests
      return NextResponse.json(
        { error: 'Setup required', code: 'SETUP_REQUIRED' },
        { status: 401 }
      );
    }
  } catch {
    // If we can't check setup status, allow the request through
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health|api/auth|api/setup).*)',
  ],
};