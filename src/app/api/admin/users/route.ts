import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { and, asc, eq, or, sql } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody, parsePagination, escapeLike } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { createUserSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import type { UserRole } from '@/lib/constants';

const USER_COLUMNS = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  canViewAll: users.canViewAll,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastLogin: users.lastLogin,
};

// GET /api/admin/users — list users (admin only)
export const GET = withAuth(async (req, ctx, session) => {
  const searchParams = req.nextUrl.searchParams;
  const { page, pageSize, offset } = parsePagination(searchParams);

  const conditions = [];
  const role = searchParams.get('role') as UserRole | null;
  if (role) conditions.push(eq(users.role, role));

  const isActive = searchParams.get('isActive');
  if (isActive === 'true') conditions.push(eq(users.isActive, true));
  if (isActive === 'false') conditions.push(eq(users.isActive, false));

  const search = searchParams.get('search');
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    conditions.push(or(
      sql`${users.email} LIKE ${pattern} ESCAPE '\\'`,
      sql`${users.name} LIKE ${pattern} ESCAPE '\\'`
    ));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select(USER_COLUMNS).from(users).where(where)
      .orderBy(asc(users.id)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users).where(where),
  ]);

  const total = Number(count);
  return NextResponse.json({
    items: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}, { requireAdmin: true });

// POST /api/admin/users — create user (admin only)
export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await readJsonBody(req);
  const validation = createUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const { email, password, name, role, canViewAll } = validation.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (existing) throw ApiErrors.Conflict('A user with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const inserted = await db.insert(users).values({
    email: email.toLowerCase(),
    passwordHash,
    name,
    role,
    canViewAll,
    isActive: true,
    passwordChangedAt: 0,
    createdBy: Number(session.user.id),
    createdAt: now,
    updatedAt: now,
  }).returning(USER_COLUMNS);

  return NextResponse.json(inserted[0], { status: 201 });
}, { requireAdmin: true });