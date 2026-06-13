import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, escapeLike, paginateResults } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { createUserSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq, and, like, desc, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import type { UserRole } from '@/lib/constants';

export const GET = withAuth(async (req, _ctx, _session) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize, offset } = parsePagination(searchParams);

  const search = searchParams.get('search');
  const role = searchParams.get('role') as UserRole | null;

  const conditions = [];
  if (search) {
    conditions.push(like(users.name, `%${escapeLike(search)}%`));
  }
  if (role) {
    conditions.push(eq(users.role, role));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [result, countResult] = await Promise.all([
    db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      canViewAll: users.canViewAll,
      isActive: users.isActive,
      passwordChangedAt: users.passwordChangedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLogin: users.lastLogin,
    }).from(users).where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(pageSize).offset(offset).all(),
    db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause).get(),
  ]);

  const total = countResult?.count ?? 0;

  return NextResponse.json(paginateResults(result, total, page, pageSize));
}, { requireAdmin: true });

export const POST = withAuth(async (req, _ctx, _session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = createUserSchema.parse(body);

  // Check for existing email
  const existing = await db.select().from(users).where(eq(users.email, parsed.email)).get();
  if (existing) {
    throw ApiErrors.Conflict('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);

  const result = await db.insert(users).values({
    name: parsed.name,
    email: parsed.email,
    passwordHash,
    role: parsed.role || 'user',
    canViewAll: parsed.canViewAll ? 1 : 0,
    isActive: 1,
  }).returning().get();

  // Don't return password hash
  const { passwordHash: _, ...userWithoutPassword } = result;

  return NextResponse.json(userWithoutPassword, { status: 201 });
}, { requireAdmin: true });