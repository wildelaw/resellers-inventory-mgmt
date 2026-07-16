import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";
import { config } from "./config";
import type { UserRole } from "./constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      canViewAll: boolean;
      iat: number;
      passwordChangedAt: number;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    canViewAll: boolean;
    passwordChangedAt: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: config.auth.sessionMaxAge,
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase().trim()),
        });

        if (!user) return null;
        if (!user.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await db
          .update(users)
          .set({ lastLogin: Math.floor(Date.now() / 1000) })
          .where(eq(users.id, user.id));

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
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: UserRole }).role;
        token.canViewAll = (user as { canViewAll: boolean }).canViewAll;
        token.passwordChangedAt = (user as { passwordChangedAt: number })
          .passwordChangedAt;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.id = (token.id as string) || (token.sub as string) || "";
        session.user.role = (token.role as UserRole) || "user";
        session.user.canViewAll = token.canViewAll === true;
        session.user.iat = (token.iat as number) || 0;
        session.user.passwordChangedAt =
          (token.passwordChangedAt as number) || 0;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
