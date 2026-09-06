import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import type { UserRole } from './constants';
import { config } from './config';
import { db } from './db';
import { users } from './schema';

// Cookies are Secure by default in production; COOKIE_SECURE=false opts out
// (needed for HTTP-only development and local production smoke tests).
const useSecureCookies =
  process.env.COOKIE_SECURE === 'true' ||
  (process.env.COOKIE_SECURE === undefined && process.env.NODE_ENV === 'production');

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
          return null;
        }

        // Look up user by email
        const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
        if (!user) return null;

        // Compare password with bcrypt
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Check is_active
        if (!user.isActive) return null;

        // Update lastLogin (best effort — never blocks login)
        try {
          await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));
        } catch (e) {
          console.error('Failed to update lastLogin:', e);
        }

        // No account lockout — brute force protection is handled by Caddy rate limiting.
        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          canViewAll: user.canViewAll,
          passwordChangedAt: user.passwordChangedAt,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: config.auth.sessionMaxAge,
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        // Sign-in: stamp identity claims from the authenticated user
        token.id = user.id;
        token.role = user.role;
        token.canViewAll = user.canViewAll === true;
        token.passwordChangedAt = user.passwordChangedAt ?? 0;
      } else if (token.id) {
        // Subsequent requests: refresh passwordChangedAt so JWTs issued
        // before a password change are detected and rejected downstream.
        try {
          const row = await db.query.users.findFirst({
            where: eq(users.id, Number(token.id)),
            columns: { passwordChangedAt: true },
          });
          if (row) {
            token.passwordChangedAt = row.passwordChangedAt ?? 0;
          }
        } catch (e) {
          console.error('Failed to refresh passwordChangedAt:', e);
        }
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session?.user) {
        const t = token as unknown as {
          id?: string;
          sub?: string;
          role?: UserRole;
          canViewAll?: boolean;
          iat?: number;
          passwordChangedAt?: number;
        };
        session.user.id = t.id ?? t.sub ?? '';
        session.user.role = t.role ?? 'user';
        session.user.canViewAll = t.canViewAll === true;
        session.user.iat = t.iat ?? 0;
        session.user.passwordChangedAt = t.passwordChangedAt ?? 0;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});