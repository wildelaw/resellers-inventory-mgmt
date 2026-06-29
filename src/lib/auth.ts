import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './schema';
import { config } from './config';
import type { UserRole } from './constants';

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
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;

        const userRow = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!userRow) return null;
        if (!userRow.isActive) return null;

        const ok = await bcrypt.compare(password, userRow.passwordHash);
        if (!ok) return null;

        // Update last login (non-blocking, ignore failures)
        const now = Date.now();
        db.update(users)
          .set({ lastLogin: now })
          .where(eq(users.id, userRow.id))
          .run();

        return {
          id: String(userRow.id),
          email: userRow.email,
          name: userRow.name,
          role: userRow.role as UserRole,
          canViewAll: userRow.canViewAll,
          passwordChangedAt: userRow.passwordChangedAt,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: UserRole }).role;
        token.canViewAll = (user as { canViewAll: boolean }).canViewAll;
        token.passwordChangedAt = (user as { passwordChangedAt: number }).passwordChangedAt;
        // iat is automatically included by NextAuth/JWT
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session?.user) {
        session.user.id = token.id ?? token.sub ?? '';
        session.user.role = (token.role as UserRole) ?? 'user';
        session.user.canViewAll = token.canViewAll === true;
        session.user.iat = (token.iat as number) ?? 0;
        session.user.passwordChangedAt = (token.passwordChangedAt as number) ?? 0;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      },
    },
  },
});