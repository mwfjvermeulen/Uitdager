'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getStoredUser } from '@/lib/auth';

interface Stat { emoji: string; label: string; value: string; color: string; sub?: string; }

export default function StatsPage() {
  const stored = getStoredUser();
  const [stats, setStats] = useState<Stat[]>([]);
  const [challenge, setChallenge] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data: active } = await supabase.from('challenges').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1);
    if (!active?.[0]) { setChallenge(null); setLoaded(true); return; }
    const ch = active[0];
    setChallenge(ch);
    const [{ data: allUsers }, { data: completions }] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('daily_completions').select('*').eq('challenge_id', ch.id),
    ]);
    if (!allUsers || !completions) { setLoaded(true); return; }
    const manon = allUsers.find((u: any) => u.name === 'Manon');
    const melvin = allUsers.find((u: any) => u.name === 'Melvin');
    const mc = completions.filter((c: any) => c.user_id === manon?.id);
    const mv = completions.filter((c: any) => c.user_id === melvin?.id);
    const currentDay = Math.max(1, Math.min(Math.floor((Date.now() - new Date(ch.start_date).getTime()) / 86400000) + 1, ch.duration_days));
    let mFirst = 0, mvFirst = 0;
    for (let d = 1; d <= currentDay; d++) {
      const a = completions.find((c: any) => c.day_number === d && c.user_id === manon?.id);
      const b = completions.find((c: any) => c.day_number === d && c.user_id === melvin?.id);
      if (a && b) { new Date(a.completed_at) < new Date(b.completed_at) ? mFirst++ : mvFirst++; }
      else if (a) mFirst++; else if (b) mvFirst++;
    }
    const missed = (comps: any[]) => Math.max(0, currentDay - 1 - comps.length);
    const streak = (comps: any[]) => { let s = 0; for (let d = currentDay; d >= 1; d--) { if (comps.some((c: any) => c.day_number === d)) s++; else break; } return s; };
    const both = Array.from({ length: currentDay }, (_, i) => i + 1).filter(d => mc.some((c: any) => c.day_number === d) && mv.some((c: any) => c.day_number === d));
    setStats([
      { emoji: '📅', label: 'Dag', value: `${currentDay} / ${ch.duration_days}`, color: '#4ECDC4', sub: `${ch.duration_days - currentDay} dagen te gaan` },
      { emoji: '🥇', label: 'Meest als eerste klaar', value: mFirst > mvFirst ? 'Manon' : mvFirst > mFirst ? 'Melvin' : 'Gelijk!', color: '#FFE66D', sub: `Manon ${mFirst}x • Melvin ${mvFirst}x` },
      { emoji: '✅', label: 'Voltooide dagen', value: `Manon ${mc.length} • Melvin ${mv.length}`, color: '#6BCB77', sub: mc.length >= mv.length ? 'Manon loopt voor! 💪' : 'Melvin loopt voor! 💪' },
      { emoji: '⭐', label: 'Samen voltooid', value: `${both.length} dagen`, color: '#FF6B6B', sub: `${Math.round((both.length / Math.max(currentDay, 1)) * 100)}% van de tijd samen` },
      { emoji: '😬', label: 'Gemiste dagen', value: `Manon ${missed(mc)}x • Melvin ${missed(mv)}x`, color: '#FF9F43', sub: missed(mc) === 0 && missed(mv) === 0 ? 'Jullie zijn perfect! 🎉' : 'Bijhalen kan nog!' },
      { emoji: '🔥', label: 'Huidige streak', value: `Manon ${streak(mc)}d • Melvin ${streak(mv)}d`, color: '#ee0979', sub: streak(mc) > streak(mv) ? 'Manon is on fire!' : streak(mv) > streak(mc) ? 'Melvin is on fire!' : 'Beiden even sterk!' },
      { emoji: '📊', label: 'Slagingspercentage', value: `${Math.round((mc.length / Math.max(currentDay, 1)) * 100)}% / ${Math.round((mv.length / Math.max(currentDay, 1)) * 100)}%`, color: '#a18cd1', sub: 'Manon / Melvin' },
    ]);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!loaded) return <div className="flex items-center justify-center h-full"><span className="text-white/40 text-lg">Laden...</span></div>;

  if (!challenge) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <span className="text-6xl">📭</span>
      <p className="text-xl font-black text-white">Nog geen statistieken</p>
      <p className="text-white/50 text-sm">Start een challenge om statistieken te zien!</p>
    </div>
  );

  return (
    <div className="px-5 py-4 pb-8">
      <h1 className="text-2xl font-black text-white mb-1">📊 Statistieken</h1>
      <p className="text-white/40 text-sm mb-5">{challenge.title}</p>
      <div className="flex flex-col gap-3">
        {stats.map((s, i) => (
          <div key={i} className="flex items-center gap-4 bg-white/7 rounded-2xl p-4 border border-white/8" style={{ borderLeftColor: s.color, borderLeftWidth: 4 }}>
            <span className="text-3xl flex-shrink-0">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-0.5">{s.label}</p>
              <p className="font-black text-base" style={{ color: s.color }}>{s.value}</p>
              {s.sub && <p className="text-[11px] text-white/40 mt-0.5">{s.sub}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
        <p className="text-white font-black text-lg mb-3">👥 Jullie vs Jullie</p>
        <div className="flex items-center justify-center gap-6 mb-3">
          <div className="flex flex-col items-center gap-2"><span className="text-4xl">💃</span><span className="text-sm font-bold text-white">Manon</span></div>
          <span className="text-white/30 font-black text-xl">VS</span>
          <div className="flex flex-col items-center gap-2"><span className="text-4xl">🕺</span><span className="text-sm font-bold text-white">Melvin</span></div>
        </div>
        <p className="text-white/60 text-sm">
          {stats[1]?.value === 'Manon' ? 'Manon is de kampioen van het snel voltooien! 👸' :
           stats[1]?.value === 'Melvin' ? 'Melvin is de snelste! Goed bezig! 🤴' :
           'Jullie zijn perfect op elkaar afgestemd! ❤️'}
        </p>
      </div>
    </div>
  );
}
