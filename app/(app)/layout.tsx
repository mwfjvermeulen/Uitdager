'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, clearStoredUser } from '@/lib/auth';

const NAV = [
  { href: '/map', label: 'Map', icon: '🗺️' },
  { href: '/challenge', label: 'Challenge', icon: '🔥' },
  { href: '/stats', label: 'Stats', icon: '📊' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) router.replace('/login');
    else setUser(stored);
  }, [router]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen" style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 border-b border-white/5 flex-shrink-0">
        <span className="text-lg font-black text-white tracking-wide">Uitdager 🏆</span>
        <button
          onClick={() => { clearStoredUser(); router.replace('/login'); }}
          className="w-9 h-9 rounded-full bg-[#FF6B6B] text-white font-bold text-sm flex items-center justify-center"
        >
          {user.name[0]}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>

      {/* Bottom nav */}
      <div className="flex-shrink-0 flex border-t border-white/8 pb-safe" style={{ background: '#0f0c29', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              active ? 'text-[#FF6B6B]' : 'text-white/35'
            }`}>
              <span className="text-xl">{icon}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
