'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const user = getStoredUser();
    if (user) router.replace('/map');
    else router.replace('/login');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      <div className="text-4xl animate-bounce">🏆</div>
    </div>
  );
}
