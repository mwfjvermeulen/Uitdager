'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getStoredUser } from '@/lib/auth';
import type { ChallengeActivity, ActivityProgress, DailyCompletion } from '@/types';
import TimerModal from '@/components/TimerModal';

function getQuickAmounts(remaining: number): number[] {
  if (remaining <= 5) return [];
  const step = remaining <= 20 ? 5 : remaining <= 50 ? 10 : remaining <= 100 ? 25 : 50;
  const out: number[] = [];
  let v = step;
  while (v < remaining && out.length < 4) { out.push(v); v += step; }
  return out;
}

export default function ChallengePage() {
  const stored = getStoredUser();
  const [challenge,       setChallenge]       = useState<any>(null);
  const [activities,      setActivities]      = useState<ChallengeActivity[]>([]);
  const [myProgress,      setMyProgress]      = useState<ActivityProgress[]>([]);
  const [myCompletion,    setMyCompletion]    = useState<DailyCompletion | null>(null);
  const [otherCompletion, setOtherCompletion] = useState<DailyCompletion | null>(null);
  const [otherUser,       setOtherUser]       = useState<any>(null);
  const [dayNumber,       setDayNumber]       = useState(1);
  const [timerActivity,   setTimerActivity]   = useState<ChallengeActivity | null>(null);
  const [addingTo,        setAddingTo]        = useState<string | null>(null);
  const [addAmount,       setAddAmount]       = useState('');

  const getTarget = (act: ChallengeActivity): number => {
    const isMale = stored?.name !== 'Manon';
    if (isMale  && act.target_count_man)   return act.target_count_man;
    if (!isMale && act.target_count_woman) return act.target_count_woman;
    return act.target_count ?? 0;
  };

  const load = useCallback(async () => {
    if (!stored) return;
    const { data: others } = await supabase.from('users').select('*').neq('id', stored.id);
    setOtherUser(others?.[0] ?? null);
    const { data: active } = await supabase.from('challenges').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1);
    if (!active?.[0]) { setChallenge(null); return; }
    const ch = active[0];
    setChallenge(ch);
    const day = Math.max(1, Math.min(
      Math.floor((Date.now() - new Date(ch.start_date!).getTime()) / 86400000) + 1,
      ch.duration_days,
    ));
    setDayNumber(day);
    const [{ data: acts }, { data: prog }, { data: myC }, { data: otherC }] = await Promise.all([
      supabase.from('challenge_activities').select('*').eq('challenge_id', ch.id).order('sort_order'),
      supabase.from('activity_progress').select('*').eq('challenge_id', ch.id).eq('user_id', stored.id).eq('day_number', day),
      supabase.from('daily_completions').select('*').eq('challenge_id', ch.id).eq('user_id', stored.id).eq('day_number', day).maybeSingle(),
      others?.[0]
        ? supabase.from('daily_completions').select('*').eq('challenge_id', ch.id).eq('user_id', others[0].id).eq('day_number', day).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setActivities(acts ?? []);
    setMyProgress(prog ?? []);
    setMyCompletion((myC as any) ?? null);
    setOtherCompletion((otherC as any) ?? null);
  }, [stored?.id]);

  useEffect(() => {
    load();
    const sub = supabase.channel('challenge_tab')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_progress' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_completions' }, load)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [load]);

  const refreshProgress = async (): Promise<ActivityProgress[]> => {
    if (!stored || !challenge) return [];
    const day = Math.max(1, Math.min(
      Math.floor((Date.now() - new Date(challenge.start_date!).getTime()) / 86400000) + 1,
      challenge.duration_days,
    ));
    const { data } = await supabase.from('activity_progress').select('*')
      .eq('challenge_id', challenge.id).eq('user_id', stored.id).eq('day_number', day);
    setMyProgress(data ?? []);
    return data ?? [];
  };

  const addPartial = async (actId: string, amount: number) => {
    if (!stored || !challenge || amount <= 0) return;
    const act = activities.find(a => a.id === actId);
    if (!act) return;
    const target   = getTarget(act);
    const existing = myProgress.find(p => p.activity_id === actId);
    const current  = existing?.progress_count ?? 0;
    const newCount = Math.min(current + amount, target);
    const isDone   = newCount >= target;

    if (existing) {
      await supabase.from('activity_progress').update({
        progress_count: newCount, completed: isDone, updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('activity_progress').insert({
        challenge_id: challenge.id, user_id: stored.id,
        activity_id: actId, day_number: dayNumber,
        progress_count: newCount, completed: isDone,
      });
    }

    setAddingTo(null);
    setAddAmount('');
    const fresh = await refreshProgress();

    const allDone = fresh.filter(p => p.completed).length === activities.length;
    if (allDone && !myCompletion) await markDay();
  };

  const resetProgress = async (actId: string) => {
    const existing = myProgress.find(p => p.activity_id === actId);
    if (existing) {
      await supabase.from('activity_progress').update({
        progress_count: 0, completed: false, updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      await refreshProgress();
    }
  };

  const toggle = async (actId: string, done: boolean) => {
    if (!stored || myCompletion) return;
    if (done) {
      const act = activities.find(a => a.id === actId);
      if (!act) return;
      const target  = getTarget(act);
      const current = myProgress.find(p => p.activity_id === actId)?.progress_count ?? 0;
      await addPartial(actId, target - current);
    } else {
      await resetProgress(actId);
    }
  };

  const markDay = async () => {
    if (!challenge || !stored || myCompletion) return;
    await supabase.from('daily_completions').upsert({
      challenge_id: challenge.id, user_id: stored.id, day_number: dayNumber,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'challenge_id,user_id,day_number' });
    await load();
  };

  const confirmMarkDay = () => { if (confirm(`Dag ${dayNumber} markeren als voltooid?`)) markDay(); };

  if (!challenge) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-8">
      <span className="text-6xl">🔥</span>
      <p className="text-xl font-black text-white">Geen actieve challenge</p>
      <p className="text-white/50 text-sm">Ga naar de map om een challenge te starten.</p>
    </div>
  );

  const done = myProgress.filter(p => p.completed).length;
  const pct  = activities.length ? (done / activities.length) * 100 : 0;

  return (
    <div className="px-5 py-4 flex flex-col gap-4 pb-8">
      <div>
        <p className="text-[#FF6B6B] text-xs font-bold uppercase tracking-widest">Dag {dayNumber}</p>
        <h1 className="text-2xl font-black text-white mt-1">{challenge.title}</h1>
      </div>

      {/* Status row */}
      <div className="flex rounded-2xl overflow-hidden border border-white/10">
        <div className="flex-1 flex flex-col items-center py-3 gap-1 bg-white/5">
          <span className="text-2xl">{myCompletion ? '✅' : '⏳'}</span>
          <span className="text-xs text-white/60 font-semibold">{stored?.name}</span>
        </div>
        <div className="w-px bg-white/10" />
        <div className="flex-1 flex flex-col items-center py-3 gap-1 bg-white/5">
          <span className="text-2xl">{otherCompletion ? '✅' : '⏳'}</span>
          <span className="text-xs text-white/60 font-semibold">{otherUser?.name ?? '...'}</span>
        </div>
      </div>

      {!myCompletion && (
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1.5">
            <span>Voortgang</span>
            <span className="text-[#FF6B6B] font-bold">{done}/{activities.length}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF6B6B] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {myCompletion && (
        <div className="bg-[#6BCB77]/15 border border-[#6BCB77]/30 rounded-2xl p-4 text-center">
          <p className="text-[#6BCB77] font-bold">🎉 Jij hebt dag {dayNumber} voltooid!</p>
          {otherCompletion && <p className="text-yellow-300 text-sm mt-1">⭐ Jullie allebei! Geweldig!</p>}
        </div>
      )}

      <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Activiteiten van vandaag</h2>
      <div className="flex flex-col gap-3">
        {activities.map(act => {
          const prog      = myProgress.find(p => p.activity_id === act.id);
          const completed = prog?.completed ?? false;
          const count     = prog?.progress_count ?? 0;
          const isTimed   = !!act.duration_minutes;
          const target    = getTarget(act);
          const remaining = target - count;
          const canAct    = !myCompletion;

          return (
            <div key={act.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
              completed ? 'bg-[#6BCB77]/12 border-[#6BCB77]/30' :
              count > 0 ? 'bg-orange-500/8 border-orange-500/25' :
              'bg-white/7 border-white/8'
            }`}>
              <button
                onClick={() => {
                  if (!canAct) return;
                  if (isTimed) toggle(act.id, !completed);
                  else if (completed) resetProgress(act.id);
                  else addPartial(act.id, remaining);
                }}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  completed ? 'bg-[#6BCB77] border-[#6BCB77]' :
                  count > 0 ? 'border-orange-400 bg-orange-400/15' :
                  'border-white/30'
                } ${canAct ? 'active:scale-90 cursor-pointer' : 'opacity-60 cursor-default'}`}
              >
                {completed && <span className="text-white text-sm font-bold">✔</span>}
                {!completed && count > 0 && <span className="text-orange-400 text-[9px] font-black leading-none">{count}</span>}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${completed ? 'text-white/50 line-through' : 'text-white'}`}>{act.name}</p>
                <p className="text-white/40 text-xs mt-0.5">
                  {isTimed
                    ? `${act.duration_minutes} minuten`
                    : completed
                      ? `✅ ${target} ${act.unit}`
                      : count > 0
                        ? `${count} / ${target} ${act.unit}`
                        : `${target} ${act.unit}`
                  }
                </p>
                {!isTimed && !completed && count > 0 && (
                  <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((count / target) * 100, 100)}%` }} />
                  </div>
                )}
              </div>

              {isTimed && canAct && (
                <button onClick={() => setTimerActivity(act)}
                  className="flex items-center gap-1.5 bg-[#4ECDC4]/15 border border-[#4ECDC4]/30 px-3 py-1.5 rounded-xl text-[#4ECDC4] text-xs font-bold flex-shrink-0 active:scale-95">
                  ⏱ Timer
                </button>
              )}
              {!isTimed && canAct && !completed && (
                <button onClick={() => { setAddingTo(act.id); setAddAmount(''); }}
                  className="flex items-center gap-1.5 bg-[#4ECDC4]/15 border border-[#4ECDC4]/30 px-3 py-1.5 rounded-xl text-[#4ECDC4] text-xs font-bold flex-shrink-0 active:scale-95">
                  + Deel
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!myCompletion && (
        <button onClick={confirmMarkDay}
          className="w-full border border-dashed border-[#6BCB77]/40 text-[#6BCB77] text-sm font-semibold py-4 rounded-2xl active:scale-98 mt-1">
          ✔️ Dag handmatig als voltooid markeren
        </button>
      )}

      {timerActivity && (
        <TimerModal
          activity={timerActivity}
          onClose={() => setTimerActivity(null)}
          onComplete={() => { toggle(timerActivity.id, true); setTimerActivity(null); }}
        />
      )}

      {/* Partial-progress add sheet */}
      {addingTo && (() => {
        const act = activities.find(a => a.id === addingTo);
        if (!act) return null;
        const target    = getTarget(act);
        const prog      = myProgress.find(p => p.activity_id === addingTo);
        const current   = prog?.progress_count ?? 0;
        const remaining = target - current;
        const quickAmounts = getQuickAmounts(remaining);
        return (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setAddingTo(null)}>
            <div
              className="w-full bg-gradient-to-b from-[#1a1a2e] to-[#0f0c29] border-t border-white/15 rounded-t-3xl p-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white font-black text-lg">{act.name}</p>
                  <p className="text-[#4ECDC4] text-sm">{current} / {target} {act.unit} gedaan</p>
                </div>
                <button onClick={() => setAddingTo(null)} className="text-white/40 text-2xl w-8 h-8 flex items-center justify-center">&times;</button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {quickAmounts.map(n => (
                  <button key={n} onClick={() => addPartial(addingTo, n)}
                    className="px-4 py-2.5 bg-[#4ECDC4]/15 border border-[#4ECDC4]/40 rounded-2xl text-[#4ECDC4] font-bold text-sm active:scale-95">
                    +{n}
                  </button>
                ))}
                {remaining > 0 && (
                  <button onClick={() => addPartial(addingTo, remaining)}
                    className="px-4 py-2.5 bg-[#6BCB77]/15 border border-[#6BCB77]/40 rounded-2xl text-[#6BCB77] font-bold text-sm active:scale-95">
                    +{remaining} (rest ✓)
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <input type="number" inputMode="numeric" min="1" max={remaining}
                  value={addAmount} onChange={e => setAddAmount(e.target.value)}
                  placeholder={`Eigen aantal (max ${remaining})`}
                  className="flex-1 bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 outline-none focus:border-[#4ECDC4]/60"
                />
                <button
                  onClick={() => { const n = Math.min(parseInt(addAmount) || 0, remaining); if (n > 0) addPartial(addingTo, n); }}
                  disabled={!addAmount || parseInt(addAmount) <= 0}
                  className="px-5 py-3 bg-[#FF6B6B] text-white font-bold rounded-xl disabled:opacity-40 active:scale-95"
                >
                  ✓ Toevoegen
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
