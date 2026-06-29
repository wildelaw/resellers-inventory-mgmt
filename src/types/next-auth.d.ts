import { type DefaultSession, type DefaultUser } from 'next-auth';
import { type DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string;
      email: string;
      role: 'admin' | 'user';
      canViewAll: boolean;
      iat: number;
      passwordChangedAt: number;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    canViewAll: boolean;
    passwordChangedAt: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: 'admin' | 'user';
    canViewAll: boolean;
    passwordChangedAt?: number;
  }
}

declare module 'next-auth/providers/credentials' {
  // No additional fields needed beyond what Credentials provider offers
}