import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const path = req.nextUrl.pathname;
    const isAuthPage = path.startsWith('/verify') || path.startsWith('/login');

    // Allow unauthenticated access to root (landing page) and login page
    if (path === '/' || path === '/login') {
      return null;
    }

    if (isAuthPage) {
      if (isAuth) {
        const role = (token as any)?.role;
        
        // Redirect authenticated users away from login/verify pages to their dashboard
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
      // Redirect unauthenticated users trying to access protected routes to landing page
      return NextResponse.redirect(new URL('/', req.url));
    }

    const role = (token as any)?.role;
    const approved = (token as any)?.approved;

    // Handle role-based access control
    if (path.startsWith('/admin')) {
      if (role !== 'admin') {
        return NextResponse.redirect(new URL(`/${role || 'employee'}`, req.url));
      }
      return null;
    }

    if (path.startsWith('/hr')) {
      if (role !== 'hr' && role !== 'admin') {
        return NextResponse.redirect(new URL(`/${role || 'employee'}`, req.url));
      }
      return null;
    }

    if (path.startsWith('/employee')) {
      // Only employees, HR, and admins can access employee routes
      if (role !== 'employee' && role !== 'hr' && role !== 'admin') {
        return NextResponse.redirect(new URL(`/${role || '/'}`, req.url));
      }

      // Handle employee-specific approval logic
      if (role === 'employee') {
        // If accessing waiting page
        if (path === '/employee/waiting') {
          // Only allow if explicitly not approved (false)
          // If approved is true, undefined, or null, redirect to dashboard
          if (approved === true || approved === undefined || approved === null) {
            return NextResponse.redirect(new URL('/employee', req.url));
          }
          // If approved is false, allow access to waiting page
          return null;
        }

        // If accessing employee dashboard or other employee routes (not waiting)
        // Only redirect to waiting page if explicitly not approved (false)
        if (approved === false) {
          return NextResponse.redirect(new URL('/employee/waiting', req.url));
        }
      }

      // Allow access for employees (approved), HR, and admins
      return null;
    }
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/hr/:path*', '/employee/:path*', '/verify', '/login', '/'],
};

