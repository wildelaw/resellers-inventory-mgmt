import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './schema';
import { config } from './config';
import type { UserRole } from './constants';
import { nowTimestamp } from './utils';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      canViewAll: boolean;
      iat: number;
      passwordChangedAt: number;
    } & DefaultSession['user'];
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    canViewAll?: boolean;
    passwordChangedAt?: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user) return null;
        if (!user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Update last login
        await db.update(users)
          .set({ lastLogin: nowTimestamp() })
          .where(eq(users.id, user.id));

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          canViewAll: user.canViewAll === 1,
          passwordChangedAt: user.passwordChangedAt,
        };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: config.auth.sessionMaxAge },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        const u = user as { id: string; role: UserRole; canViewAll: boolean; passwordChangedAt: number };
        token.id = u.id;
        token.role = u.role;
        token.canViewAll = u.canViewAll;
        token.passwordChangedAt = u.passwordChangedAt;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session?.user) {
        session.user.id = token?.id ?? token?.sub ?? '';
        session.user.role = (token?.role as UserRole) ?? 'user';
        session.user.canViewAll = token?.canViewAll === true;
        session.user.iat = (token?.iat as number) ?? 0;
        session.user.passwordChangedAt = (token?.passwordChangedAt as number) ?? 0;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
});