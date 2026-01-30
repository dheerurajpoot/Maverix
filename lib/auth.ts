import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// Only include profileImage in JWT if it's a URL or small (cookie size limit ~4KB)
function safeProfileImageForToken(img: unknown): string | null {
  if (typeof img !== 'string' || !img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('data:') && img.length <= 8000) return img; // small data URL only
  return null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email?.trim() || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email.toLowerCase().trim() })
          .select('_id email name role mobileNumber approved password profileImage')
          .lean();

        if (!user?.password) {
          throw new Error('Invalid email or password');
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          throw new Error('Invalid email or password');
        }

        const profileImage = safeProfileImageForToken((user as any).profileImage);

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          mobileNumber: user.mobileNumber,
          approved: user.approved !== false,
          ...(profileImage && { profileImage }),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? '';
        token.name = user.name ?? '';
        token.role = (user as any).role ?? '';
        token.mobileNumber = (user as any).mobileNumber ?? '';
        token.approved = (user as any).approved !== false;
        token.profileImage = (user as any).profileImage ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token?.id) return null as any;
      const s = session ?? { user: {}, expires: '' } as any;
      const u = s.user ?? {};
      (u as any).id = token.id;
      (u as any).email = token.email ?? '';
      (u as any).name = token.name ?? '';
      (u as any).role = (token.role as 'admin' | 'hr' | 'employee') ?? 'employee';
      (u as any).mobileNumber = token.mobileNumber;
      (u as any).approved = token.approved;
      (u as any).profileImage = token.profileImage ?? null;
      s.user = u;
      if (!s.expires) s.expires = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
      return s;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

