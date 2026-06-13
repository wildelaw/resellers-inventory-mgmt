import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { restoreBackup } from '@/lib/backup';

export const POST = withAuth(async (req, _ctx, _session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const result = await restoreBackup(body);

  return NextResponse.json(result);
}, { requireAdmin: true });