import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, escapeLike } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users, items, sales, mileage } from '@/lib/schema';
import { createUserSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq, and, like, desc, asc, count, sql, ne } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { nowTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const GET = withAuth(async (req: NextRequest, _ctx, _session: Session) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize, offset, limit } = parsePagination(searchParams);
  const { field, order } = parseSortParams(searchParams, ['createdAt', 'email', 'name', 'role'], 'createdAt');

  const role = searchParams.get('role') || undefined;
  const isActive = searchParams.get('isActive');
  const search = searchParams.get('search') || undefined;

  const conditions = [];
  if (role) conditions.push(eq(users.role, role));
  if (isActive === 'true') conditions.push(eq(users.isActive, 1));
  if (isActive === 'false') conditions.push(eq(users.isActive, 0));
  if (search) {
    const escaped = escapeLike(search);
    conditions.push(like(users.email, `%${escaped}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const sortCol = field === 'email' ? users.email : field === 'name' ? users.name : field === 'role' ? users.role : users.createdAt;
  const orderBy = order === 'asc' ? asc(sortCol) : desc(sortCol);

  const [data, [{ total }]] = await Promise.all([
    db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      canViewAll: users.canViewAll,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin,
    }).from(users).where(where ?? sql`1=1`).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ total: count() }).from(users).where(where ?? sql`1=1`),
  ]);

  return NextResponse.json({
    users: data.map((u) => ({ ...u, canViewAll: u.canViewAll === 1, isActive: u.isActive === 1 })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}, { requireAdmin: true });

export const POST = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = createUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const { email, password, name, role, canViewAll } = validation.data;

  // Check for existing user
  const existing = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase().trim()) });
  if (existing) throw ApiErrors.Conflict('User with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const now = nowTimestamp();

  const user = await db.insert(users).values({
    email: email.toLowerCase().trim(),
    passwordHash,
    name,
    role,
    canViewAll: canViewAll ? 1 : 0,
    isActive: 1,
    passwordChangedAt: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: parseInt(session.user.id, 10),
  }).returning();

  return NextResponse.json({
    id: user[0].id,
    email: user[0].email,
    name: user[0].name,
    role: user[0].role,
    canViewAll: user[0].canViewAll === 1,
  }, { status: 201 });
}, { requireAdmin: true });