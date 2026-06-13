import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { updateProfileSchema } from '@/lib/validations';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const { passwordHash, ...userData } = user;
    return NextResponse.json({ user: { ...userData, canViewAll: userData.canViewAll === 1, isActive: userData.isActive === 1 } });
  });
}

export async function PUT(req: NextRequest) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    }

    const data = validation.data;
    const now = Math.floor(Date.now() / 1000);

    if (data.type === 'profile') {
      await db.update(users).set({ name: data.name!, updatedAt: now }).where(eq(users.id, session.user.id));
      return NextResponse.json({ message: 'Profile updated' });
    }

    if (data.type === 'password') {
      const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const isValid = await bcrypt.compare(data.currentPassword!, user.passwordHash);
      if (!isValid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      const newPasswordHash = await bcrypt.hash(data.newPassword!, 10);
      await db.update(users).set({ passwordHash: newPasswordHash, passwordChangedAt: now, updatedAt: now }).where(eq(users.id, session.user.id));
      return NextResponse.json({ message: 'Password updated. Please log in again.' });
    }

    return NextResponse.json({ error: 'Invalid update type' }, { status: 400 });
  });
}
