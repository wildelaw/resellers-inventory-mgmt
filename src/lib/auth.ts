import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { config } from './config';
import type { UserRole } from './constants';

// Extend next-auth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      email: string;
      name: string;
      role: UserRole;
      canViewAll: boolean;
      passwordChangedAt: number;
      iat: number;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: number;
    role?: UserRole;
    canViewAll?: boolean;
    passwordChangedAt?: number;
    iat?: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // @ts-expect-error - NextAuth v5 beta type mismatch
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const userResult = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!userResult) {
          return null;
        }

        if (!userResult.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(password, userResult.passwordHash);
        if (!isValid) {
          return null;
        }

        // Update last login
        await db.update(users)
          .set({ lastLogin: Math.floor(Date.now() / 1000) })
          .where(eq(users.id, userResult.id));

        return {
          id: String(userResult.id),
          email: userResult.email,
          name: userResult.name,
          role: userResult.role as UserRole,
          canViewAll: userResult.canViewAll === 1,
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
        token.id = Number(user.id);
        token.role = user.role as UserRole;
        token.canViewAll = user.canViewAll as boolean;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session?.user) {
        (session.user as any).id = token.id ?? Number(token.sub) ?? 0;
        (session.user as any).role = (token.role as UserRole) ?? 'user';
        (session.user as any).canViewAll = token.canViewAll === true;
        (session.user as any).passwordChangedAt = (token.passwordChangedAt as number) ?? 0;
        (session.user as any).iat = (token.iat as number) ?? 0;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});