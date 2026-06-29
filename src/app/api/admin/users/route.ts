import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, items, sales, mileage } from '@/lib/schema';
import { eq, and, like, or } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, parsePagination, paginationResponse, escapeLike } from '@/lib/api-utils';
import { createUserSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import bcrypt from 'bcrypt';

export const dynamic = 'force-dynamic';

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: String(u.id),
    email: u.email,
    name: u.name,
    role: u.role,
    canViewAll: u.canViewAll,
    isActive: u.isActive,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin,
  };
}

// GET /api/admin/users — admin only
export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, _session) => {
    const sp = req.nextUrl.searchParams;
    const pagination = parsePagination(sp);
    const role = sp.get('role');
    const isActive = sp.get('isActive');
    const search = sp.get('search');

    const conditions = [];
    if (role === 'admin' || role === 'user') conditions.push(eq(users.role, role));
    if (isActive === 'true') conditions.push(eq(users.isActive, true));
    if (isActive === 'false') conditions.push(eq(users.isActive, false));
    if (search) {
      const term = `%${escapeLike(search)}%`;
      conditions.push(or(like(users.email, term), like(users.name, term))!);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const allRows = where
      ? db.select().from(users).where(where).all()
      : db.select().from(users).all();
    const total = allRows.length;
    const rows = allRows.slice(pagination.offset, pagination.offset + pagination.limit);

    return NextResponse.json({
      items: rows.map(publicUser),
      pagination: paginationResponse(pagination.page, pagination.pageSize, total),
    });
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}

// POST /api/admin/users — admin only
export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const data = parsed.data;

    // Check for duplicate email
    const existing = db.select().from(users).where(eq(users.email, data.email)).get();
    if (existing) return ApiErrors.Conflict('Email already in use').toResponse();

    const passwordHash = await bcrypt.hash(data.password, 10);
    const now = Date.now();
    const created = db
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
        canViewAll: data.canViewAll,
        isActive: true,
        passwordChangedAt: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: Number(session.user.id),
      })
      .returning()
      .get();

    return NextResponse.json(publicUser(created), { status: 201 });
  }, { requireAdmin: true })(req, { params: Promise.resolve({}) });
}