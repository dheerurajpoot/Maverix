import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'hr' | 'employee';
      profileImage?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'hr' | 'employee';
    profileImage?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'hr' | 'employee';
    profileImage?: string | null;
  }
}

