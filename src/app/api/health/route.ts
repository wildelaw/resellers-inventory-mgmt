import { NextResponse } from 'next/server';

/** Health check — no auth required. */
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}