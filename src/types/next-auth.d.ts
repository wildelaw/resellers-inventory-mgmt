import 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id?: number;
    role?: 'admin' | 'user';
    canViewAll?: boolean;
  }
  
  interface Session {
    user: {
      id: number;
      email: string;
      name: string;
      role: 'admin' | 'user';
      canViewAll: boolean;
      passwordChangedAt: number;
      iat: number;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: number;
    role?: 'admin' | 'user';
    canViewAll?: boolean;
    passwordChangedAt?: number;
  }
}