'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, setStoredUser } from '@/lib/auth';
import type { StoredUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import ProfileModal from '@/components/ProfileModal';

const NAV = [
  { href: '/map',       label: 'Map',   icon: '🗺️' },
  { href: '/challenge', label: 'Dag',   icon: '🔥' },
  { href: '/stats',     label: 'Stats', icon: '📊' },
  { href: '/chat',      label: 'Chat',  icon: '💬' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [unread, setUnread] = useState(0);

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
          const updated: StoredUser = { ...stored, avatar: data.avatar ?? '🏆', slogan: data.slogan ?? undefined };
          setUser(updated);
          setStoredUser(updated);
        }
      });
  }, [router]);

  // Track unread chat messages
  useEffect(() => {
    if (!user) return;

    const countUnread = async () => {
      const lastRead = localStorage.getItem(`chat_last_read_${user.id}`) ?? '1970-01-01T00:00:00Z';
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('user_id', user.id)
        .gt('created_at', lastRead);
      setUnread(count ?? 0);
    };

    countUnread();

    const sub = supabase.channel('unread_badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          const msg = payload.new as { user_id: string; created_at: string };
          if (msg.user_id === user.id) return;
          const lastRead = localStorage.getItem(`chat_last_read_${user.id}`) ?? '1970-01-01T00:00:00Z';
          if (new Date(msg.created_at) > new Date(lastRead)) {
            setUnread(prev => prev + 1);
          }
        })
      .subscribe();

    // Listen for chat-read event dispatched by chat page
    const onChatRead = () => setUnread(0);
    window.addEventListener('chat-read', onChatRead);

    return () => { sub.unsubscribe(); window.removeEventListener('chat-read', onChatRead); };
  }, [user]);

  // Clear badge when navigating to /chat
  useEffect(() => {
    if (pathname === '/chat' && user) {
      localStorage.setItem(`chat_last_read_${user.id}`, new Date().toISOString());
      setUnread(0);
    }
  }, [pathname, user]);

  if (!user) return null;

  return (
    <div style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', minHeight: '100dvh' }}>

      {/* Fixed top bar */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 border-b border-white/10"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 40px)',
          paddingBottom: '10px',
          background: 'rgba(15, 12, 41, 0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <span className="text-lg font-black text-white tracking-wide">M&amp;M Challenge 💑</span>
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
      </header>

      {/* Scrollable content */}
      <main
        className="overflow-y-auto overscroll-contain"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top), 40px) + 54px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)',
          minHeight: '100dvh',
        }}
      >
        {children}
      </main>

      {/* Fixed bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10"
        style={{
          background: 'rgba(15, 12, 41, 0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          const showBadge = href === '/chat' && unread > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                active ? 'text-[#FF6B6B]' : 'text-white/35'
              }`}
            >
              <span className="relative text-xl">
                {icon}
                {showBadge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-[#FF6B6B] rounded-full text-[9px] font-black text-white flex items-center justify-center px-1">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
            </Link>
          );
        })}
      </nav>

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
