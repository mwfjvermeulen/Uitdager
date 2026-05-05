'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, setStoredUser } from '@/lib/auth';
import type { StoredUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import ProfileModal from '@/components/ProfileModal';

const NAV = [
  { href: '/map', label: 'Map', icon: '🗺️' },
  { href: '/challenge', label: 'Challenge', icon: '🔥' },
  { href: '/stats', label: 'Stats', icon: '📊' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.replace('/login'); return; }
    setUser(stored);
    supabase
      .from('users')
      .select('avatar, slogan')
      .eq('id', stored.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const updated: StoredUser = {
            ...stored,
            avatar: data.avatar ?? '🏆',
            slogan: data.slogan ?? undefined,
          };
          setUser(updated);
          setStoredUser(updated);
        }
      });
  }, [router]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen" style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 border-b border-white/5 flex-shrink-0">
        <span className="text-lg font-black text-white tracking-wide">Uitdager 🏆</span>
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full pl-2 pr-3 py-1.5 active:scale-95 transition-all"
        >
          <span className="text-2xl leading-none">{user.avatar ?? '🏆'}</span>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-white text-sm font-bold leading-tight">{user.name}</span>
            {user.slogan && (
              <span className="text-white/40 text-[10px] leading-tight max-w-[110px] truncate">{user.slogan}</span>
            )}
          </div>
          <span className="text-white/30 text-xs ml-0.5">⚙️</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>

      {/* Bottom nav */}
      <div
        className="flex-shrink-0 flex border-t border-white/8"
        style={{ background: '#0f0c29', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
                active ? 'text-[#FF6B6B]' : 'text-white/35'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdated={updated => { setUser(updated); setStoredUser(updated); }}
        />
      )}
    </div>
  );
}
