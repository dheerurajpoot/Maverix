'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/contexts/ToastContext';
import PagePreloader from '@/components/PagePreloader';
import PWARegistration from '@/components/PWARegistration';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { usePathname } from 'next/navigation';

function ConditionalPWAComponents() {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup') || pathname?.startsWith('/verify');
  
  // Don't load PWA components on auth pages to avoid interference with login
  if (isAuthPage) {
    return null;
  }
  
  return (
    <>
      <PWARegistration />
      <PWAInstallPrompt />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <PagePreloader />
        <ConditionalPWAComponents />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}

