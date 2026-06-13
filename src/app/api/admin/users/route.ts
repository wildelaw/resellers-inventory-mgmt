import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { createUserSchema } from '@/lib/validations';
import { eq, or, like, and, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const GET = withAuth(async (req, ctx, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const url = new URL(req.url);
  const { page, pageSize, offset } = parsePagination(url.searchParams);

  const conditions = [];
  const role = url.searchParams.get('role');
  if (role) conditions.push(eq(users.role, role as any));
  const isActive = url.searchParams.get('isActive');
  if (isActive !== null) conditions.push(eq(users.isActive, isActive === 'true'));
  const search = url.searchParams.get('search');
  if (search) {
    const term = `%${search}%`;
    conditions.push(or(like(users.name, term), like(users.email, term))!);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [userList, countResult] = await Promise.all([
    db.query.users.findMany({
      where,
      columns: { passwordHash: false },
      limit: pageSize,
      offset,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    }),
    db.select({ count: sql`count(*)` }).from(users).where(where),
  ]);

  const total = Number(countResult[0].count);
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    users: userList,
    pagination: { page, pageSize, total, totalPages },
  });
});

export const POST = withAuth(async (req, ctx, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = createUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const { email, password, name, role, canViewAll } = validation.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await db.insert(users).values({
    email,
    passwordHash,
    name,
    role,
    canViewAll: canViewAll ?? false,
    isActive: true,
    passwordChangedAt: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: parseInt(session.user.id),
  }).returning() as any[];

  const { passwordHash: _, ...userWithoutHash } = newUser[0] as any;
  return NextResponse.json(userWithoutHash, { status: 201 });
});