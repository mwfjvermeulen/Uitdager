'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { setStoredUser, clearStoredUser } from '@/lib/auth';
import type { StoredUser } from '@/lib/auth';

const AVATARS = ['🏆','💪','🔥','⭐','🦁','🐯','🦊','🐺','🐶','🐱','🦄','🐸','🦋','🌟','💎','🎯','🚀','⚡','🌈','🎭','🏅','🥊','🎪','🌙'];

export default function ProfileModal({ user, onClose, onUpdated }: {
  user: StoredUser;
  onClose: () => void;
  onUpdated: (u: StoredUser) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'profile' | 'pin'>('profile');
  const [avatar, setAvatar] = useState(user.avatar ?? '🏆');
  const [name, setName] = useState(user.name);
  const [slogan, setSlogan] = useState(user.slogan ?? '');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return alert('Naam mag niet leeg zijn');
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        avatar,
        slogan: slogan.trim() || null,
        name: name.trim(),
      };
      if (tab === 'pin' && newPin) {
        if (!/^\d{4}$/.test(newPin)) {
          setPinError('Pincode moet 4 cijfers zijn');
          setSaving(false);
          return;
        }
        const { data } = await supabase.from('users').select('pin_code').eq('id', user.id).single();
        if (data?.pin_code !== currentPin) {
          setPinError('Huidige pincode klopt niet');
          setSaving(false);
          return;
        }
        updates.pin_code = newPin;
      }
      await supabase.from('users').update(updates).eq('id', user.id);
      const updated: StoredUser = { id: user.id, name: name.trim(), avatar, slogan: slogan.trim() || undefined };
      setStoredUser(updated);
      onUpdated(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const logout = () => { clearStoredUser(); router.replace('/login'); };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-t-3xl p-6 pb-12 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black text-white">Mijn Profiel</h2>
          <button onClick={onClose} className="text-white/40 text-3xl leading-none w-9 h-9 flex items-center justify-center">&times;</button>
        </div>

        {/* Avatar display */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-[#FF6B6B]/60 flex items-center justify-center text-5xl mb-2 shadow-lg">
            {avatar}
          </div>
          <p className="text-xs text-white/40 mb-3">Kies jouw avatar</p>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map(em => (
              <button
                key={em}
                onClick={() => setAvatar(em)}
                className={`h-11 w-11 rounded-xl text-2xl flex items-center justify-center transition-all ${
                  avatar === em
                    ? 'bg-[#FF6B6B]/30 ring-2 ring-[#FF6B6B] scale-110'
                    : 'bg-white/8 active:scale-90'
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['profile', 'pin'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t ? 'bg-[#FF6B6B] text-white' : 'bg-white/10 text-white/50'
              }`}
            >
              {t === 'profile' ? '👤 Profiel' : '🔑 Pincode'}
            </button>
          ))}
        </div>

        {tab === 'profile' ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Naam</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white rounded-xl px-4 py-3 text-gray-900 font-semibold text-sm outline-none focus:ring-2 focus:ring-[#FF6B6B]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Slogan</label>
              <input
                value={slogan}
                onChange={e => setSlogan(e.target.value)}
                placeholder="bv. No pain, no gain!"
                className="w-full bg-white rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#FF6B6B]"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Huidige pincode</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-white rounded-xl px-4 py-3 text-gray-900 text-center text-xl tracking-widest outline-none focus:ring-2 focus:ring-[#FF6B6B]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Nieuwe pincode</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={e => { setNewPin(e.target.value); setPinError(''); }}
                placeholder="••••"
                className="w-full bg-white rounded-xl px-4 py-3 text-gray-900 text-center text-xl tracking-widest outline-none focus:ring-2 focus:ring-[#FF6B6B]"
              />
            </div>
            {pinError && <p className="text-red-400 text-sm text-center">{pinError}</p>}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-[#FF6B6B] text-white font-black py-4 rounded-2xl text-base mt-5 active:scale-95 transition-all disabled:opacity-60"
        >
          {saving ? 'Opslaan...' : '✔ Opslaan'}
        </button>

        <button
          onClick={logout}
          className="w-full mt-3 border border-red-500/40 text-red-400 font-semibold py-3 rounded-2xl text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>👋</span> Uitloggen
        </button>
      </div>
    </div>
  );
}
