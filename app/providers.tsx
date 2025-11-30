'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/contexts/ToastContext';
import PagePreloader from '@/components/PagePreloader';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch when window regains focus
    >
      <ToastProvider>
        <PagePreloader />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}

