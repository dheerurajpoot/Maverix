import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const ROLE_DASHBOARD: Record<string, string> = {
  admin: '/admin',
  hr: '/hr',
  employee: '/employee',
};

const PUBLIC_PATHS = ['/', '/login'];

function isPublic(path: string) {
  return PUBLIC_PATHS.includes(path);
}

function isAuthPage(path: string) {
  return path === '/verify' || path === '/login';
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const path = req.nextUrl.pathname;

    // Public routes: allow without auth
    if (isPublic(path)) return NextResponse.next();

    // Login/verify: redirect authenticated users to dashboard
    if (isAuthPage(path)) {
      if (isAuth) {
        const role = (token as any)?.role;
        const dashboard = ROLE_DASHBOARD[role] ?? '/';
        return NextResponse.redirect(new URL(dashboard, req.url));
      }
      return NextResponse.next();
    }

    // Protected: require auth
    if (!isAuth) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const role = (token as any)?.role ?? 'employee';
    const approved = (token as any)?.approved;

    // Admin: only admin
    if (path.startsWith('/admin')) {
      if (role !== 'admin') {
        return NextResponse.redirect(new URL(ROLE_DASHBOARD[role] ?? '/employee', req.url));
      }
      return NextResponse.next();
    }

    // HR: admin or hr
    if (path.startsWith('/hr')) {
      if (role !== 'hr' && role !== 'admin') {
        return NextResponse.redirect(new URL(ROLE_DASHBOARD[role] ?? '/employee', req.url));
      }
      return NextResponse.next();
    }

    // Employee section
    if (path.startsWith('/employee')) {
      if (role !== 'employee' && role !== 'hr' && role !== 'admin') {
        return NextResponse.redirect(new URL(role ? `/${role}` : '/', req.url));
      }
      if (role === 'employee') {
        if (path === '/employee/waiting') {
          if (approved !== false) return NextResponse.redirect(new URL('/employee', req.url));
        } else if (approved === false) {
          return NextResponse.redirect(new URL('/employee/waiting', req.url));
        }
      }
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    callbacks: { authorized: () => true },
  }
);

// Run only on app routes; exclude static files, _next, api to reduce edge invocations
export const config = {
  matcher: [
    '/',
    '/login',
    '/verify',
    '/admin/:path*',
    '/hr/:path*',
    '/employee/:path*',
  ],
};
