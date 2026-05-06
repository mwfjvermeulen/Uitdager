'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getStoredUser } from '@/lib/auth';
import { notifyOtherUser } from '@/lib/notifications';

interface Message { id: string; user_id: string; content: string; created_at: string; }
interface UserInfo { id: string; name: string; avatar?: string; }

export default function ChatPage() {
  const stored = getStoredUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users,    setUsers]    = useState<UserInfo[]>([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const msgRef = useRef<HTMLDivElement>(null);

  const scrollBottom = () => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  };

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('messages').select('*')
      .order('created_at', { ascending: true }).limit(200);
    setMessages(data ?? []);
  }, []);

  useEffect(() => {
    supabase.from('users').select('id, name, avatar').then(({ data }) => setUsers(data ?? []));
    load();
    const sub = supabase.channel('chat_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => setMessages(prev => [...prev, payload.new as Message]))
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [load]);

  useEffect(() => { scrollBottom(); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || !stored || sending) return;
    setInput('');
    setSending(true);
    try {
      await supabase.from('messages').insert({ user_id: stored.id, content: text });
      notifyOtherUser(stored.id, `${stored.name} 💬`, text).catch(() => {});
    } finally { setSending(false); }
  };

  const fmt = (s: string) => {
    const d = new Date(s);
    const today = d.toDateString() === new Date().toDateString();
    return today
      ? d.toLocaleTimeString('nl', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('nl', { day: 'numeric', month: 'short' }) + ' '
        + d.toLocaleTimeString('nl', { hour: '2-digit', minute: '2-digit' });
  };

  const userOf = (id: string) => users.find(u => u.id === id);

  return (
    <div
      className="fixed inset-0 z-10 flex flex-col"
      style={{
        paddingTop:    'calc(max(env(safe-area-inset-top), 40px) + 54px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)',
        background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      }}
    >
      {/* Messages */}
      <div ref={msgRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-24">
            <span className="text-5xl">💬</span>
            <p className="text-white font-bold">Hoi {stored?.name}!</p>
            <p className="text-white/40 text-sm">Stuur het eerste berichtje.</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const me      = msg.user_id === stored?.id;
          const info    = userOf(msg.user_id);
          const isFirst = i === 0 || messages[i - 1].user_id !== msg.user_id;
          const isLast  = i === messages.length - 1 || messages[i + 1].user_id !== msg.user_id;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${me ? 'flex-row-reverse' : 'flex-row'} ${isFirst ? 'mt-3' : 'mt-0.5'}`}>
              {/* Avatar */}
              <div className="w-8 h-8 flex-shrink-0">
                {!me && isLast && (
                  <div className="w-8 h-8 rounded-full bg-[#4ECDC4]/20 border border-[#4ECDC4]/40 flex items-center justify-center text-base">
                    {info?.avatar ?? '🏆'}
                  </div>
                )}
              </div>
              {/* Bubble */}
              <div className={`flex flex-col max-w-[78%] ${me ? 'items-end' : 'items-start'}`}>
                {!me && isFirst && (
                  <span className="text-[11px] text-white/40 font-semibold px-2 mb-0.5">{info?.name}</span>
                )}
                <div className={`px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap ${
                  me
                    ? 'bg-[#FF6B6B] text-white rounded-2xl rounded-br-sm'
                    : 'bg-white/12 text-white rounded-2xl rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                {isLast && (
                  <span className="text-[10px] text-white/25 px-2 mt-0.5">{fmt(msg.created_at)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-t border-white/10"
        style={{ background: 'rgba(15, 12, 41, 0.98)' }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Stuur een berichtje..."
          className="flex-1 bg-white/10 border border-white/15 rounded-full px-5 py-3 text-white text-sm placeholder-white/30 outline-none focus:border-[#FF6B6B]/60 transition-colors"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="w-11 h-11 rounded-full bg-[#FF6B6B] flex items-center justify-center flex-shrink-0 active:scale-90 transition-all disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
