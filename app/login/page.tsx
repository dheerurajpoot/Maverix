'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setError('Login is taking longer than expected. Please try again.');
      setLoading(false);
    }, 30000); // 30 second timeout

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      clearTimeout(timeoutId);

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Check if login was successful
      if (!result?.ok) {
        setError('Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Wait a bit for the session to be established
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get user role and approval status from session with retry logic
      let session = null;
      let retries = 5;
      
      while (retries > 0 && !session) {
        try {
          const res = await fetch('/api/auth/session', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
            cache: 'no-store',
            credentials: 'include',
          });

          if (res.ok) {
            const data = await res.json();
            if (data && data.user) {
              session = data;
              break;
            }
          }
          
          retries--;
          if (retries > 0) {
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 500 * (5 - retries)));
          }
        } catch (fetchError: any) {
          retries--;
          console.error('Session fetch error:', fetchError);
          if (retries === 0) {
            // Final fallback: redirect and let middleware handle it
            const from = searchParams.get('from') || '/';
            window.location.href = from;
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      clearTimeout(timeoutId);

      if (!session || !session.user) {
        // If we still don't have a session after retries, redirect
        const from = searchParams.get('from') || '/';
        window.location.href = from;
        return;
      }

      const role = session?.user?.role;
      const approved = session?.user?.approved;

      if (!role) {
        // If role is not available, redirect to home
        window.location.href = '/';
        return;
      }

      // Redirect employees to waiting page only if explicitly not approved (false)
      // If approved is undefined/null, treat as approved (for existing employees)
      if (role === 'employee' && approved === false) {
        window.location.href = '/employee/waiting';
        return;
      }

      // Use window.location.href for reliable navigation in production
      const from = searchParams.get('from') || `/${role}`;
      window.location.href = from;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-auth-pages flex items-center justify-center p-4 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/50 backdrop-blur-xl rounded-lg shadow-xl p-6 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <p className="text-sm text-gray-600 font-secondary">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 text-gray-700 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition font-secondary"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-11 py-2.5 text-gray-700 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition font-secondary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed font-secondary"
          >
            {loading ? (
              'Signing in...'
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-primary hover:text-primary-dark font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-auth-pages flex items-center justify-center p-4 relative">
        <div className="bg-white/50 backdrop-blur-xl rounded-lg shadow-xl p-6 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

