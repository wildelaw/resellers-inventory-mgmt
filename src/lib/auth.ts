import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { config } from './config';
import type { UserRole } from './constants';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      canViewAll: boolean;
      passwordChangedAt: number;
      iat: number;
    };
  }
}

declare module 'next-auth' {
  interface User {
    role: UserRole;
    canViewAll: boolean;
    passwordChangedAt: number;
    iat: number;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    canViewAll: boolean;
    passwordChangedAt: number;
    iat?: number;
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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Look up user by email
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.isActive) {
          return null;
        }

        // Compare password with bcrypt
        const passwordHash = user.passwordHash;
        const isValid = await bcrypt.compare(password, passwordHash);
        if (!isValid) {
          return null;
        }

        // Update last login
        await db
          .update(users)
          .set({ lastLogin: Math.floor(Date.now() / 1000) })
          .where(eq(users.id, user.id));

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          canViewAll: Boolean(user.canViewAll),
          passwordChangedAt: user.passwordChangedAt,
          iat: 0, // Will be set by JWT callback
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: config.auth.sessionMaxAge,
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id ?? '';
        token.role = user.role as UserRole;
        token.canViewAll = user.canViewAll as boolean;
        token.passwordChangedAt = user.passwordChangedAt as number;
        // iat is automatically included in JWT by next-auth
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) || 'user';
        session.user.canViewAll = token.canViewAll === true;
        session.user.passwordChangedAt = (token.passwordChangedAt as number) || 0;
        session.user.iat = (token.iat as number) || 0;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});