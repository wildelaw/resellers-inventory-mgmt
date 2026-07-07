import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './schema';
import { config } from './config';
import type { UserRole } from './constants';

// Type augmentation for Session.user
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

  interface User {
    id: string;
    role: UserRole;
    canViewAll: boolean;
    passwordChangedAt: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: config.auth.sessionMaxAge,
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user) {
          return null;
        }

        if (!user.isActive) {
          return null;
        }

        const passwordValid = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash
        );

        if (!passwordValid) {
          return null;
        }

        // Update last login
        const now = Math.floor(Date.now() / 1000);
        await db.update(users)
          .set({ lastLogin: now })
          .where(eq(users.id, user.id));

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          canViewAll: user.canViewAll,
          passwordChangedAt: user.passwordChangedAt,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.canViewAll = user.canViewAll;
        token.passwordChangedAt = user.passwordChangedAt;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session?.user) {
        session.user.id = (token?.id as string) ?? token?.sub ?? '';
        session.user.role = (token?.role as UserRole) ?? 'user';
        session.user.canViewAll = Boolean(token?.canViewAll);
        session.user.iat = (token?.iat as number) ?? 0;
        session.user.passwordChangedAt = (token?.passwordChangedAt as number) ?? 0;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});