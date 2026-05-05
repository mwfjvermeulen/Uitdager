'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getStoredUser } from '@/lib/auth';
import type { Challenge, ChallengeActivity, ActivityProgress, DailyCompletion } from '@/types';
import TimerModal from '@/components/TimerModal';

export default function ChallengePage() {
  const stored = getStoredUser();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [activities, setActivities] = useState<ChallengeActivity[]>([]);
  const [myProgress, setMyProgress] = useState<ActivityProgress[]>([]);
  const [myCompletion, setMyCompletion] = useState<DailyCompletion | null>(null);
  const [otherCompletion, setOtherCompletion] = useState<DailyCompletion | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [timerActivity, setTimerActivity] = useState<ChallengeActivity | null>(null);

  const load = useCallback(async () => {
    if (!stored) return;
    const { data: others } = await supabase.from('users').select('*').neq('id', stored.id);
    setOtherUser(others?.[0] ?? null);
    const { data: active } = await supabase.from('challenges').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1);
    if (!active?.[0]) { setChallenge(null); return; }
    const ch = active[0];
    setChallenge(ch);
    const day = Math.max(1, Math.min(Math.floor((Date.now() - new Date(ch.start_date!).getTime()) / 86400000) + 1, ch.duration_days));
    setDayNumber(day);
    const [{ data: acts }, { data: prog }, { data: myC }, { data: otherC }] = await Promise.all([
      supabase.from('challenge_activities').select('*').eq('challenge_id', ch.id).order('sort_order'),
      supabase.from('activity_progress').select('*').eq('challenge_id', ch.id).eq('user_id', stored.id).eq('day_number', day),
      supabase.from('daily_completions').select('*').eq('challenge_id', ch.id).eq('user_id', stored.id).eq('day_number', day).maybeSingle(),
      others?.[0] ? supabase.from('daily_completions').select('*').eq('challenge_id', ch.id).eq('user_id', others[0].id).eq('day_number', day).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setActivities(acts ?? []);
    setMyProgress(prog ?? []);
    setMyCompletion(myC ?? null);
    setOtherCompletion(otherC ?? null);
  }, [stored?.id]);

  useEffect(() => {
    load();
    const sub = supabase.channel('challenge_tab').on('postgres_changes', { event: '*', schema: 'public', table: 'activity_progress' }, load).on('postgres_changes', { event: '*', schema: 'public', table: 'daily_completions' }, load).subscribe();
    return () => { sub.unsubscribe(); };
  }, [load]);

  const toggle = async (actId: string, done: boolean) => {
    if (!challenge || !stored) return;
    const existing = myProgress.find(p => p.activity_id === actId);
    if (existing) {
      await supabase.from('activity_progress').update({ completed: done, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('activity_progress').insert({ challenge_id: challenge.id, user_id: stored.id, activity_id: actId, day_number: dayNumber, completed: done, progress_count: done ? 1 : 0 });
    }
    await load();
    // Auto-complete day if all done
    const { data: prog } = await supabase.from('activity_progress').select('*').eq('challenge_id', challenge.id).eq('user_id', stored.id).eq('day_number', dayNumber);
    const { data: acts } = await supabase.from('challenge_activities').select('*').eq('challenge_id', challenge.id);
    if (prog && acts && prog.filter(p => p.completed).length === acts.length && !myCompletion) {
      await markDay();
    }
  };

  const markDay = async () => {
    if (!challenge || !stored || myCompletion) return;
    await supabase.from('daily_completions').upsert({ challenge_id: challenge.id, user_id: stored.id, day_number: dayNumber, completed_at: new Date().toISOString() }, { onConflict: 'challenge_id,user_id,day_number' });
    await load();
  };

  const confirmMarkDay = () => {
    if (confirm(`Dag ${dayNumber} markeren als voltooid?`)) markDay();
  };

  if (!challenge) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <span className="text-6xl">🔥</span>
      <p className="text-xl font-black text-white">Geen actieve challenge</p>
      <p className="text-white/50 text-sm">Ga naar de map om een challenge te starten.</p>
    </div>
  );

  const done = myProgress.filter(p => p.completed).length;
  const pct = activities.length ? (done / activities.length) * 100 : 0;

  return (
    <div className="px-5 py-4 flex flex-col gap-4 pb-6">
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

      {/* Progress bar */}
      {!myCompletion && (
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1.5">
            <span>Voortgang</span><span className="text-[#FF6B6B] font-bold">{done}/{activities.length}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF6B6B] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Completed banner */}
      {myCompletion && (
        <div className="bg-[#6BCB77]/15 border border-[#6BCB77]/30 rounded-2xl p-4 text-center">
          <p className="text-[#6BCB77] font-bold">🎉 Jij hebt dag {dayNumber} voltooid!</p>
          {otherCompletion && <p className="text-yellow-300 text-sm mt-1">⭐ Jullie allebei! Geweldig!</p>}
        </div>
      )}

      {/* Activities */}
      <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Activiteiten van vandaag</h2>
      <div className="flex flex-col gap-3">
        {activities.map(act => {
          const prog = myProgress.find(p => p.activity_id === act.id);
          const completed = prog?.completed ?? false;
          const isTimed = !!act.duration_minutes;
          return (
            <div key={act.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
              completed ? 'bg-[#6BCB77]/12 border-[#6BCB77]/30' : 'bg-white/7 border-white/8'
            }`}>
              <button onClick={() => toggle(act.id, !completed)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                  completed ? 'bg-[#6BCB77] border-[#6BCB77]' : 'border-white/30'
                }`}>
                {completed && <span className="text-white text-sm font-bold">✔</span>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${ completed ? 'text-white/50 line-through' : 'text-white' }`}>{act.name}</p>
                <p className="text-white/40 text-xs mt-0.5">{isTimed ? `${act.duration_minutes} minuten` : `${act.target_count}x ${act.unit}`}</p>
              </div>
              {isTimed && (
                <button onClick={() => setTimerActivity(act)}
                  className="flex items-center gap-1.5 bg-[#4ECDC4]/15 border border-[#4ECDC4]/30 px-3 py-1.5 rounded-xl text-[#4ECDC4] text-xs font-bold flex-shrink-0 active:scale-95">
                  ⏱ Timer
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual complete */}
      {!myCompletion && (
        <button onClick={confirmMarkDay} className="w-full border border-dashed border-[#6BCB77]/40 text-[#6BCB77] text-sm font-semibold py-4 rounded-2xl active:scale-98 mt-1">
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
    </div>
  );
}
