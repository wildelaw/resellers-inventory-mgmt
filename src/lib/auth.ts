import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { config } from './config';
import type { UserRole } from './constants';

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

        try {
          // Look up user by email
          const user = await db.query.users.findFirst({
            where: eq(users.email, credentials.email as string),
          });

          if (!user) {
            return null;
          }

          // Check if user is active
          if (!user.isActive) {
            return null;
          }

          // Compare password with bcrypt
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValid) {
            return null;
          }

          // Update last login
          await db
            .update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id));

          // Return user object for JWT
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            canViewAll: user.canViewAll,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
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
        token.id = user.id;
        token.role = user.role;
        token.canViewAll = user.canViewAll;
        // iat (issued at) is automatically included in JWT
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.id = token?.id ?? token?.sub ?? '';
        session.user.role = (token?.role as UserRole) ?? 'user';
        session.user.canViewAll = token?.canViewAll === true;
        session.user.iat = (token?.iat as number) ?? 0;

        // Fetch passwordChangedAt from database
        try {
          const user = await db.query.users.findFirst({
            where: eq(users.id, parseInt(session.user.id)),
            columns: { passwordChangedAt: true },
          });
          session.user.passwordChangedAt = user?.passwordChangedAt 
            ? Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)
            : 0;
        } catch (error) {
          console.error('Error fetching passwordChangedAt:', error);
          session.user.passwordChangedAt = 0;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});

// Augment NextAuth types
declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    canViewAll: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      canViewAll: boolean;
      iat: number;
      passwordChangedAt: number;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    canViewAll?: boolean;
    iat?: number;
  }
}
