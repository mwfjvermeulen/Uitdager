'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getStoredUser } from '@/lib/auth';
import type { ChallengeActivity, ActivityProgress } from '@/types';

export default function DayDetailModal({
  challengeId,
  dayNumber,
  totalDays,
  isCurrentDay,
  isFutureDay,
  activities,
  onClose,
  onDayCompleted,
}: {
  challengeId: string;
  dayNumber: number;
  totalDays: number;
  isCurrentDay: boolean;
  isFutureDay: boolean;
  activities: ChallengeActivity[];
  onClose: () => void;
  onDayCompleted: () => void;
}) {
  const stored = getStoredUser();
  const [progress, setProgress] = useState<ActivityProgress[]>([]);
  const [myDone, setMyDone] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const load = useCallback(async () => {
    if (!stored) return;
    const [{ data: prog }, { data: comp }] = await Promise.all([
      supabase.from('activity_progress').select('*')
        .eq('challenge_id', challengeId).eq('user_id', stored.id).eq('day_number', dayNumber),
      supabase.from('daily_completions').select('id')
        .eq('challenge_id', challengeId).eq('user_id', stored.id).eq('day_number', dayNumber).maybeSingle(),
    ]);
    setProgress(prog ?? []);
    setMyDone(!!comp);
  }, [challengeId, dayNumber, stored?.id]);

  useEffect(() => { load(); }, [load]);

  const completeDay = async () => {
    if (!stored) return;
    await supabase.from('daily_completions').upsert({
      challenge_id: challengeId,
      user_id: stored.id,
      day_number: dayNumber,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'challenge_id,user_id,day_number' });
    setMyDone(true);
    setCelebrating(true);
    setTimeout(() => {
      setCelebrating(false);
      onClose();
      onDayCompleted();
    }, 2300);
  };

  const toggle = async (actId: string, done: boolean) => {
    if (!stored || !isCurrentDay || myDone) return;
    const existing = progress.find(p => p.activity_id === actId);
    if (existing) {
      await supabase.from('activity_progress')
        .update({ completed: done, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('activity_progress').insert({
        challenge_id: challengeId, user_id: stored.id,
        activity_id: actId, day_number: dayNumber,
        completed: done, progress_count: done ? 1 : 0,
      });
    }
    const { data: fresh } = await supabase.from('activity_progress').select('*')
      .eq('challenge_id', challengeId).eq('user_id', stored.id).eq('day_number', dayNumber);
    const freshProg = fresh ?? [];
    setProgress(freshProg);
    if (freshProg.filter(p => p.completed).length === activities.length) {
      await completeDay();
    }
  };

  const completedCount = progress.filter(p => p.completed).length;
  const pct = activities.length ? (completedCount / activities.length) * 100 : 0;
  const canToggle = isCurrentDay && !myDone && !isFutureDay;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={celebrating ? undefined : onClose}
    >
      <div className="absolute inset-0 bg-black/75" />
      <div
        className="relative w-full max-w-sm bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-t-3xl max-h-[82vh] overflow-y-auto scale-in"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        onClick={e => e.stopPropagation()}
      >
        {celebrating ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <p className="text-3xl font-black text-white mb-2">Dag {dayNumber} voltooid!</p>
            <p className="text-white/50 text-base">Geweldig bezig! 💪</p>
            {dayNumber < totalDays && (
              <p className="text-[#FFE66D] text-sm mt-3">✨ Dag {dayNumber + 1} wordt ontgrendeld</p>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-[#FF6B6B] text-xs font-bold uppercase tracking-widest mb-1">
                  Dag {dayNumber} / {totalDays}
                </p>
                {myDone     && <span className="text-[#6BCB77] text-xs font-bold">✅ Voltooid</span>}
                {isFutureDay && <span className="text-yellow-300/60 text-xs">🔒 Nog niet beschikbaar</span>}
                {isCurrentDay && !myDone && <span className="text-[#4ECDC4] text-xs font-semibold">⚡ Vandaag</span>}
              </div>
              <button
                onClick={onClose}
                className="text-white/40 text-3xl leading-none w-9 h-9 flex items-center justify-center"
              >&times;</button>
            </div>

            {!myDone && !isFutureDay && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-white/50 mb-2">
                  <span>Voortgang</span>
                  <span className="text-[#FF6B6B] font-bold">{completedCount} / {activities.length}</span>
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF6B6B] to-[#ee0979] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {activities.map(act => {
                const prog = progress.find(p => p.activity_id === act.id);
                const completed = prog?.completed ?? false;
                return (
                  <div
                    key={act.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                      completed ? 'bg-[#6BCB77]/12 border-[#6BCB77]/30' : 'bg-white/5 border-white/8'
                    }`}
                  >
                    <button
                      onClick={() => canToggle && toggle(act.id, !completed)}
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        completed ? 'bg-[#6BCB77] border-[#6BCB77]' : 'border-white/30'
                      } ${
                        canToggle ? 'active:scale-90 cursor-pointer' : 'opacity-50 cursor-default'
                      }`}
                    >
                      {completed && <span className="text-white text-base font-black">✔</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${
                        completed ? 'text-white/40 line-through' : 'text-white'
                      }`}>{act.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {act.duration_minutes
                          ? `${act.duration_minutes} minuten`
                          : `${act.target_count}x ${act.unit}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {myDone && (
              <div className="mt-4 bg-[#6BCB77]/10 border border-[#6BCB77]/20 rounded-2xl p-4 text-center">
                <p className="text-[#6BCB77] font-bold">🎉 Dag {dayNumber} al voltooid!</p>
              </div>
            )}
            {isFutureDay && (
              <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-white/40 text-sm">Voltooi eerst dag {dayNumber - 1}.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
