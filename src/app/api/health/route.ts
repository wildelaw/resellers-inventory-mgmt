import { NextResponse } from 'next/server';

/**
 * Health check endpoint
 * No authentication required
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
