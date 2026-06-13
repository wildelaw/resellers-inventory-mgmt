import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { config } from './config';

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

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        await db.update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          canViewAll: user.canViewAll,
          passwordChangedAt: typeof user.passwordChangedAt === 'object' ? Math.floor((user.passwordChangedAt as Date).getTime() / 1000) : (user.passwordChangedAt as number),
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
        token.id = user.id;
        token.role = (user as any).role;
        token.canViewAll = (user as any).canViewAll;
        token.passwordChangedAt = (user as any).passwordChangedAt;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session?.user) {
        (session.user as any).id = token?.id ?? token?.sub ?? '';
        (session.user as any).role = token?.role ?? 'user';
        (session.user as any).canViewAll = token?.canViewAll === true;
        (session.user as any).passwordChangedAt = token?.passwordChangedAt ?? 0;
        (session.user as any).iat = token?.iat ?? 0;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'user';
      canViewAll: boolean;
      passwordChangedAt: number;
      iat: number;
    };
  }
}