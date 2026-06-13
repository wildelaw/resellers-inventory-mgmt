import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, buildPagination } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { createUserSchema } from '@/lib/validations';
import bcrypt from 'bcrypt';
import { eq, and, like } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  return withAuth(req, async (session) => {
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { page, pageSize, offset } = parsePagination(req.nextUrl.searchParams);
    const role = req.nextUrl.searchParams.get('role');
    const isActive = req.nextUrl.searchParams.get('isActive');
    const search = req.nextUrl.searchParams.get('search');
    const conditions = [];
    if (role) conditions.push(eq(users.role, role as "admin" | "user"));
    if (isActive !== null) conditions.push(eq(users.isActive, isActive === 'true' ? 1 : 0));
    if (search) conditions.push(like(users.email, `%${search}%`));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const allUsers = await db.query.users.findMany({ where, orderBy: (users, { asc }) => [asc(users.id)] });
    const total = allUsers.length;
    const paged = allUsers.slice(offset, offset + pageSize);
    const sanitized = paged.map(({ passwordHash, ...user }) => ({ ...user, canViewAll: user.canViewAll === 1, isActive: user.isActive === 1 }));
    return NextResponse.json({ users: sanitized, pagination: buildPagination(page, pageSize, total) });
  }, { requireAdmin: true });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const body = await req.json();
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const { email, password, name, role, canViewAll } = validation.data;
    const passwordHash = await bcrypt.hash(password, 10);
    const now = Math.floor(Date.now() / 1000);
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await db.insert(users).values({ email, passwordHash, name, role, canViewAll: canViewAll ? 1 : 0, isActive: 1, passwordChangedAt: 0, createdAt: now, updatedAt: now, createdBy: session.user.id }).returning() as any[];
    const { passwordHash: _, ...newUser } = result[0];
    return NextResponse.json({ user: { ...newUser, canViewAll: newUser.canViewAll === 1, isActive: newUser.isActive === 1 } }, { status: 201 });
  }, { requireAdmin: true });
}
