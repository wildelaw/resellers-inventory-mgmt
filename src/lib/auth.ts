/**
 * NextAuth v5 configuration — Credentials provider, JWT strategy.
 *
 * Key v2 points:
 *  - JWT carries id, role, canViewAll, passwordChangedAt, iat.
 *  - `passwordChangedAt` is propagated token -> session so `withAuth` can reject
 *    sessions issued before the last password change (AUTH-02/SEC-03).
 *  - Session cookie is explicitly SameSite=Strict (SEC-01).
 *  - No account lockout; brute force handled by Caddy rate limiting.
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './schema';
import { config } from './config';
import { toBool, nowTs, fromBool } from './schema';
import type { UserRole } from './constants';
import type { DefaultSession } from 'next-auth';

// ---------------------------------------------------------------------------
// Type augmentation — extend Session.user and the JWT with our fields.
// JWT is declared in @auth/core/jwt (next-auth re-exports it), so we augment
// that module so the typed fields are visible in the jwt/session callbacks.
// ---------------------------------------------------------------------------
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      canViewAll: boolean;
      passwordChangedAt: number;
      isActive: boolean;
      iat: number;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: UserRole;
    canViewAll: boolean;
    passwordChangedAt: number;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    canViewAll?: boolean;
    passwordChangedAt?: number;
    isActive?: boolean;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: config.auth.sessionMaxAge },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? '').trim().toLowerCase();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;

        const user = db.query.users.findFirst({ where: eq(users.email, email) }).sync();
        if (!user) return null; // rate limiting at Caddy level prevents brute force
        if (!toBool(user.isActive)) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Record last login (fire-and-forget; do not block auth).
        db.update(users)
          .set({ lastLogin: nowTs() })
          .where(eq(users.id, user.id))
          .run();

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          canViewAll: toBool(user.canViewAll),
          passwordChangedAt: user.passwordChangedAt,
        };
      },
    }),
  ],
  callbacks: {
    // The jwt callback runs at login (with `user`) AND on every subsequent
    // request (with only the existing `token`). To make session invalidation
    // actually work (AUTH-02/SEC-03), we refresh passwordChangedAt / role /
    // canViewAll / isActive from the DB on each request so `withAuth` compares
    // the JWT's `iat` against the *current* passwordChangedAt, not a stale
    // login-time value. Without this refresh, changing a password (or an admin
    // resetting it) would NOT invalidate existing JWTs — the v1-style
    // revocation table was removed in v2, so a cheap indexed user lookup is the
    // remaining way to honor passwordChangedAt.
    jwt: ({ token, user }) => {
      if (user) {
        const u = user as { id: string; role: UserRole; canViewAll: boolean; passwordChangedAt: number };
        token.id = u.id;
        token.role = u.role;
        token.canViewAll = u.canViewAll;
        token.passwordChangedAt = u.passwordChangedAt;
        return token;
      }
      // Subsequent request: refresh live fields from the DB.
      const id = token.id ?? token.sub;
      if (id) {
        const row = db.query.users.findFirst({ where: eq(users.id, parseInt(id, 10)) }).sync();
        if (row) {
          token.role = row.role as UserRole;
          token.canViewAll = toBool(row.canViewAll);
          token.passwordChangedAt = row.passwordChangedAt;
          token.isActive = toBool(row.isActive);
        } else {
          // User deleted: force invalidation (iat < far-future).
          token.passwordChangedAt = Number.MAX_SAFE_INTEGER;
          token.isActive = false;
        }
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session?.user) {
        session.user.id = token.id ?? token.sub ?? '';
        session.user.role = (token.role as UserRole) ?? 'user';
        session.user.canViewAll = token.canViewAll === true;
        session.user.passwordChangedAt = token.passwordChangedAt ?? 0;
        session.user.isActive = token.isActive === true;
        // iat is automatically present on the JWT (DefaultJWT); mirror it onto the session.
        session.user.iat = token.iat ?? 0;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: { signIn: '/login' },
});

/** Hash a password with the configured bcrypt cost. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.auth.bcryptCost);
}

export { fromBool };