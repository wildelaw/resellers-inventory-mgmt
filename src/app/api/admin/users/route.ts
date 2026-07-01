import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer, parsePagination, buildPaginationResponse, escapeLike } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { createUserSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq, like, or, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const { searchParams } = new URL(req.url);
    const { page, pageSize, offset } = parsePagination(searchParams);

    // Build where conditions
    const conditions = [];

    // Role filter
    const role = searchParams.get('role');
    if (role) {
      conditions.push(eq(users.role, role as any));
    }

    // Active filter
    const isActive = searchParams.get('isActive');
    if (isActive !== null) {
      conditions.push(eq(users.isActive, isActive === 'true'));
    }

    // Search filter
    const search = searchParams.get('search');
    if (search) {
      const escaped = escapeLike(search);
      conditions.push(
        or(
          like(users.name, `%${escaped}%`),
          like(users.email, `%${escaped}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    // Get users (exclude password hash)
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        canViewAll: users.canViewAll,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        createdBy: users.createdBy,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      users: usersList,
      pagination: buildPaginationResponse(page, pageSize, count),
    });
  }, { requireAdmin: true })(req);
}

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const { email, password, name, role, canViewAll } = validation.data;

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw ApiErrors.Conflict('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      name,
      role,
      canViewAll: canViewAll ?? false,
      isActive: true,
      passwordChangedAt: new Date(0),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: parseInt(session.user.id),
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      canViewAll: users.canViewAll,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

    return NextResponse.json(newUser, { status: 201 });
  }, { requireAdmin: true })(req);
}
