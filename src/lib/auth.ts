import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import { users } from './schema';
import { config } from './config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: config.auth.sessionMaxAge },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const found = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });
        if (!found) return null;
        if (!found.isActive) return null;

        const ok = await bcrypt.compare(password, found.passwordHash);
        if (!ok) return null;

        // Update last login timestamp (fire-and-forget).
        db.update(users)
          .set({ lastLogin: sql`(unixepoch())` })
          .where(eq(users.id, found.id))
          .run();

        return {
          id: String(found.id),
          email: found.email,
          name: found.name,
          role: found.role,
          canViewAll: found.canViewAll,
          passwordChangedAt: found.passwordChangedAt,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: 'admin' | 'user' }).role;
        token.canViewAll = (user as { canViewAll: boolean }).canViewAll;
        token.passwordChangedAt = (user as { passwordChangedAt: number }).passwordChangedAt;
        // iat is automatically included by NextAuth in the JWT.
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session?.user) {
        (session.user as { id: string }).id = token.id ?? token.sub ?? '';
        (session.user as { role: 'admin' | 'user' }).role = (token.role as 'admin' | 'user') ?? 'user';
        (session.user as { canViewAll: boolean }).canViewAll = token.canViewAll === true;
        (session.user as { iat: number }).iat = (token.iat as number) ?? 0;
        (session.user as { passwordChangedAt: number }).passwordChangedAt =
          (token.passwordChangedAt as number) ?? 0;
      }
      return session;
    },
  },
});
