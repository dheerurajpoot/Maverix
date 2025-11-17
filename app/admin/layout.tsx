import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const role = (session.user as any)?.role;

  if (role !== 'admin') {
    // Redirect to the correct dashboard based on role
    if (role === 'hr') {
      redirect('/hr');
    } else if (role === 'employee') {
      redirect('/employee');
    } else {
      redirect('/login');
    }
  }

  return <>{children}</>;
}

