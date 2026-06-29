import { NextResponse } from 'next/server';
import { and, eq, like, or, desc, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, fromBool, toBool, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer, parsePagination, parseSortParams, paginationMeta, likeContains } from '@/lib/api-utils';
import { currentUserId } from '@/lib/auth-utils';
import { createUserSchema } from '@/lib/validations';
import { hashPassword } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';

const SORT_FIELDS = ['createdAt', 'email', 'name', 'role'];

export const GET = withAuth(async (req, _ctx, _session) => {
  const sp = req.nextUrl.searchParams;
  const { limit, offset, page, pageSize } = parsePagination(sp);
  const { sortBy, sortOrder } = parseSortParams(sp, SORT_FIELDS, 'createdAt');

  const role = sp.get('role') ?? undefined;
  const isActive = sp.get('isActive');
  const search = sp.get('search') ?? undefined;

  const conditions = [];
  if (role === 'admin' || role === 'user') conditions.push(eq(users.role, role));
  if (isActive === 'true') conditions.push(eq(users.isActive, 1));
  if (isActive === 'false') conditions.push(eq(users.isActive, 0));
  if (search) {
    const term = likeContains(search);
    conditions.push(or(like(users.email, term), like(users.name, term)) ?? eq(users.id, 0));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const sortCol = sortBy === 'email' ? users.email : sortBy === 'name' ? users.name : sortBy === 'role' ? users.role : users.createdAt;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  const total = db.select({ c: sql<number>`count(*)` }).from(users).where(where).get()?.c ?? 0;
  const rows = db.select({
    id: users.id, email: users.email, name: users.name, role: users.role,
    canViewAll: users.canViewAll, isActive: users.isActive, createdAt: users.createdAt,
    lastLogin: users.lastLogin,
  }).from(users).where(where).orderBy(orderFn(sortCol)).limit(limit).offset(offset).all();

  return NextResponse.json({
    users: rows.map((r) => ({
      ...r,
      canViewAll: toBool(r.canViewAll),
      isActive: toBool(r.isActive),
    })),
    pagination: paginationMeta(page, pageSize, total),
  });
}, { requireAdmin: true });

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const { email, password, name, role, canViewAll } = parsed.data;

  const existing = db.select().from(users).where(eq(users.email, email)).all();
  if (existing.length > 0) throw ApiErrors.Conflict('Email already registered');

  const passwordHash = await hashPassword(password);
  const ts = nowTs();
  const [user] = db.insert(users).values({
    email, passwordHash, name, role,
    canViewAll: fromBool(canViewAll), isActive: 1,
    passwordChangedAt: 0,
    createdAt: ts, updatedAt: ts,
    createdBy: currentUserId(session),
  }).returning().all();

  return NextResponse.json({
    id: user.id, email: user.email, name: user.name, role: user.role, canViewAll: toBool(user.canViewAll),
  }, { status: 201 });
}, { requireAdmin: true });