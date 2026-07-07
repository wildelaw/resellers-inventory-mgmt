import { NextRequest, NextResponse } from 'next/server';
import { and, eq, like, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, paginationEnvelope } from '@/lib/api-utils';
import { createUserSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';
import bcrypt from 'bcrypt';

export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, _session) => {
    const sp = req.nextUrl.searchParams;
    const { page, pageSize, offset } = parsePagination(sp);
    const { sortBy, sortOrder } = parseSortParams(sp, ['createdAt', 'email', 'name', 'role'], 'createdAt');

    const conditions = [];
    const role = sp.get('role');
    if (role) conditions.push(eq(users.role, role as 'admin' | 'user'));
    const isActive = sp.get('isActive');
    if (isActive !== null) conditions.push(eq(users.isActive, isActive === 'true'));
    const search = sp.get('search');
    if (search) conditions.push(like(users.email, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const orderCol = sortBy === 'email' ? users.email : sortBy === 'name' ? users.name : sortBy === 'role' ? users.role : users.createdAt;
    const orderFn = sortOrder === 'asc' ? sql`${orderCol} ASC` : sql`${orderCol} DESC`;

    const [rows, countResult] = await Promise.all([
      db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        canViewAll: users.canViewAll,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
      }).from(users).where(where ?? sql`1=1`).orderBy(orderFn).limit(pageSize).offset(offset).all(),
      db.select({ c: sql<number>`count(*)` }).from(users).where(where ?? sql`1=1`).get(),
    ]);

    const total = countResult?.c ?? 0;
    return NextResponse.json({
      users: rows,
      pagination: paginationEnvelope(page, pageSize, total),
    });
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}

export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const { email, password, name, role, canViewAll } = parsed.data;
    const existing = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
    if (existing) throw ApiErrors.Conflict('Email already in use');

    const hash = await bcrypt.hash(password, 10);
    const now = Math.floor(Date.now() / 1000);
    const created = db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash: hash,
      name,
      role,
      canViewAll,
      isActive: true,
      passwordChangedAt: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: Number(session.user.id),
    }).returning();

    return NextResponse.json({
      id: created[0].id,
      email: created[0].email,
      name: created[0].name,
      role: created[0].role,
      canViewAll: created[0].canViewAll,
    }, { status: 201 });
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}
