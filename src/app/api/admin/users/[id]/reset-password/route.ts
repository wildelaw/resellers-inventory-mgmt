import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { resetPasswordSchema } from '@/lib/validations';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    const body = await req.json();
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const now = Math.floor(Date.now() / 1000);
    const newPasswordHash = await bcrypt.hash(validation.data.newPassword, 10);
    await db.update(users).set({ passwordHash: newPasswordHash, passwordChangedAt: now, updatedAt: now }).where(eq(users.id, userId));
    return NextResponse.json({ message: 'Password reset successfully. All sessions for this user have been invalidated.' });
  }, { requireAdmin: true });
}
