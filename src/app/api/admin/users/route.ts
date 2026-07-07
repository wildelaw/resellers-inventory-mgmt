import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users, items, sales, mileage } from '@/lib/schema';
import { eq, or, like, sql, count, and } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, parsePagination, paginatedResponse, escapeLike } from '@/lib/api-utils';
import { createUserSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { nowTimestamp } from '@/lib/utils';

// GET - List users
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    try {
      const { searchParams } = new URL(req.url);
      const { page, pageSize, offset, limit } = parsePagination(searchParams);

      const role = searchParams.get('role') || undefined;
      const isActive = searchParams.get('isActive');
      const search = searchParams.get('search') || undefined;

      const conditions = [];

      if (role) {
        conditions.push(eq(users.role, role as any));
      }
      if (isActive === 'true') {
        conditions.push(eq(users.isActive, true));
      } else if (isActive === 'false') {
        conditions.push(eq(users.isActive, false));
      }
      if (search) {
        const escaped = escapeLike(search);
        conditions.push(
          or(
            like(users.email, `%${escaped}%`),
            like(users.name, `%${escaped}%`)
          )!
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(where);
      const total = countResult[0]?.count ?? 0;

      const result = await db.query.users.findMany({
        where,
        orderBy: (users, { desc }) => [desc(users.createdAt)],
        limit,
        offset,
      });

      // Remove password hashes
      const sanitized = result.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        canViewAll: u.canViewAll,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLogin: u.lastLogin,
      }));

      return NextResponse.json(paginatedResponse(sanitized, total, page, pageSize));
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}

// POST - Create user
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = createUserSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const { email, password, name, role, canViewAll } = validation.data;

      // Check if email already exists
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });
      if (existing) {
        throw ApiErrors.Conflict('Email already exists');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const now = nowTimestamp();

      const newUser = await db.insert(users).values({
        email: email.toLowerCase(),
        passwordHash,
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
        id: newUser[0].id,
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role,
        canViewAll: newUser[0].canViewAll,
      }, { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}