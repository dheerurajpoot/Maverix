import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'hr' | 'employee';
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'hr' | 'employee';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'hr' | 'employee';
  }
}

