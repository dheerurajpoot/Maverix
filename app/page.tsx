import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import LandingPage from '@/components/LandingPage';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is logged in, redirect to their dashboard
  if (session) {
    const role = (session.user as any).role;
    if (role === 'admin') {
      redirect('/admin');
    } else if (role === 'hr') {
      redirect('/hr');
    } else if (role === 'employee') {
      redirect('/employee');
    }
  }

  // Show landing page for non-authenticated users
  return <LandingPage />;
}

