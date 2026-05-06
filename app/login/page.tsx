'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { setStoredUser } from '@/lib/auth';

const PIN_LENGTH = 4;

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleKey = async (digit: string) => {
    if (loading || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    setError(false);
    if (next.length === PIN_LENGTH) {
      setLoading(true);
      const { data } = await supabase.from('users').select('*').eq('pin_code', next).single();
      if (data) {
        setStoredUser({ id: data.id, name: data.name, avatar: data.avatar ?? '🏆', slogan: data.slogan ?? undefined });
        router.replace('/map');
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => { setPin(''); setError(false); setShake(false); setLoading(false); }, 900);
      }
    }
  };

  const handleDel = () => { if (!loading) { setPin(p => p.slice(0, -1)); setError(false); } };

  const rows = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 pb-10"
      style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
    >
      <div className="text-7xl mb-3 select-none">💑</div>
      <h1 className="text-3xl font-black tracking-tight text-white mb-1">M&amp;M Challenge</h1>
      <p className="text-white/50 text-sm mb-10">Voer je pincode in</p>

      <div className={`flex gap-5 mb-3 transition-transform ${shake ? 'animate-bounce' : ''}`}>
        {Array(PIN_LENGTH).fill(0).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
            i < pin.length
              ? error ? 'bg-red-500 border-red-500' : 'bg-[#FF6B6B] border-[#FF6B6B]'
              : 'border-white/40 bg-transparent'
          }`} />
        ))}
      </div>
      <div className="h-5 mb-6">
        {error && <p className="text-red-400 text-sm text-center">Onjuiste pincode! ❌</p>}
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-5">
            {row.map((d, di) => (
              d === '' ? <div key={di} className="w-[72px] h-[72px]" /> :
              <button
                key={di}
                onClick={() => d === '⌫' ? handleDel() : handleKey(d)}
                className={`w-[72px] h-[72px] rounded-full text-white font-semibold text-2xl transition-all active:scale-95 select-none ${
                  d === '⌫'
                    ? 'bg-[#FF6B6B]/20 border border-[#FF6B6B]/40 text-xl'
                    : 'bg-white/10 border border-white/15 hover:bg-white/20'
                }`}
              >{d}</button>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-10 text-white/30 text-sm">💑 Manon of Melvin?</p>
    </div>
  );
}
