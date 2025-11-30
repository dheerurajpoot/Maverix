import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup') || req.nextUrl.pathname.startsWith('/verify');

    if (isAuthPage) {
      if (isAuth) {
        const role = (token as any)?.role;
        
        // Redirect authenticated users based on their role
        if (role === 'admin') {
          return NextResponse.redirect(new URL('/admin', req.url));
        } else if (role === 'hr') {
          return NextResponse.redirect(new URL('/hr', req.url));
        } else if (role === 'employee') {
          return NextResponse.redirect(new URL('/employee', req.url));
        }
      }
      return null;
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(from)}`, req.url));
    }

    const role = (token as any)?.role;
    const approved = (token as any)?.approved;
    const path = req.nextUrl.pathname;

    // Allow access to waiting page for unapproved employees only
    if (path === '/employee/waiting' && role === 'employee') {
      // If employee is approved (true or undefined/null treated as true), redirect them to dashboard
      if (approved !== false) {
        return NextResponse.redirect(new URL('/employee', req.url));
      }
      return null;
    }

    // Redirect unapproved employees trying to access employee dashboard
    // Only redirect if approved is explicitly false
    if (path.startsWith('/employee') && role === 'employee' && approved === false && path !== '/employee/waiting') {
      return NextResponse.redirect(new URL('/employee/waiting', req.url));
    }

    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, req.url));
    }

    if (path.startsWith('/hr') && role !== 'hr' && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, req.url));
    }

    if (path.startsWith('/employee') && role !== 'employee' && role !== 'hr' && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, req.url));
    }
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/hr/:path*', '/employee/:path*', '/login', '/signup', '/verify', '/'],
};

