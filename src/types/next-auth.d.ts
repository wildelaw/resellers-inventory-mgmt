import type { UserRole } from '@/lib/constants';
import type { DefaultSession } from 'next-auth';

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
    passwordChangedAt?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    canViewAll: boolean;
    passwordChangedAt: number;
  }
}