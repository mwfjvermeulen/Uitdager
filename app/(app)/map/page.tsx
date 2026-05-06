'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getStoredUser } from '@/lib/auth';
import type { Challenge, ChallengeActivity, DailyCompletion } from '@/types';
import CreateChallengeModal from '@/components/CreateChallengeModal';
import DayDetailModal from '@/components/DayDetailModal';

const COLS = ['18%', '50%', '82%'];
const COL_PATTERN = [0, 1, 2, 1];
const getCol = (i: number) => COLS[COL_PATTERN[i % 4]];

function MapNode({
  day, myDone, otherDone, isCurrent, isFuture, isBlinking, myInitial, otherInitial, onClick,
}: {
  day: number; myDone: boolean; otherDone: boolean;
  isCurrent: boolean; isFuture: boolean; isBlinking: boolean;
  myInitial: string; otherInitial: string;
  onClick: () => void;
}) {
  const bothDone = myDone && otherDone;
  const bg = bothDone   ? 'from-yellow-300 to-orange-400'
    : myDone            ? 'from-[#FF6B6B] to-[#ee0979]'
    : otherDone         ? 'from-[#4ECDC4] to-[#11998e]'
    : isCurrent         ? 'from-[#a18cd1] to-[#fbc2eb]'
    :                     'from-white/10 to-white/5';

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
      <div className={[
        'relative w-14 h-14 rounded-full bg-gradient-to-b flex items-center justify-center font-black text-lg shadow-lg transition-all duration-300',
        bg,
        isFuture   ? 'opacity-35' : '',
        isCurrent  ? 'ring-2 ring-[#a18cd1]/60 pulse-glow' : '',
        isBlinking ? 'day-blink' : '',
      ].join(' ')}>
        <span className={isFuture ? 'text-white/60' : 'text-[#1a1a2e]'}>
          {bothDone ? '⭐' : (myDone || otherDone) ? '✔' : day}
        </span>
      </div>
      <div className="flex gap-1 h-4">
        {myDone    && <span className="w-4 h-4 rounded-full bg-[#FF6B6B] flex items-center justify-center text-[9px] font-bold text-white">{myInitial}</span>}
        {otherDone && <span className="w-4 h-4 rounded-full bg-[#4ECDC4] flex items-center justify-center text-[9px] font-bold text-white">{otherInitial}</span>}
      </div>
      <span className={`text-[10px] font-semibold ${isFuture ? 'text-white/20' : 'text-white/50'}`}>Dag {day}</span>
    </button>
  );
}

export default function MapPage() {
  const stored = getStoredUser();
  const [challenge,   setChallenge]   = useState<Challenge | null>(null);
  const [pending,     setPending]     = useState<Challenge | null>(null);
  const [completions, setCompletions] = useState<DailyCompletion[]>([]);
  const [activities,  setActivities]  = useState<ChallengeActivity[]>([]);
  const [otherUser,   setOtherUser]   = useState<{ id: string; name: string } | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [blinkDay,    setBlinkDay]    = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!stored) return;
    const { data: others } = await supabase.from('users').select('*').neq('id', stored.id);
    setOtherUser(others?.[0] ?? null);
    const { data: active } = await supabase
      .from('challenges').select('*').eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1);
    if (active?.[0]) {
      setChallenge(active[0]);
      setPending(null);
      const [{ data: c }, { data: acts }] = await Promise.all([
        supabase.from('daily_completions').select('*').eq('challenge_id', active[0].id),
        supabase.from('challenge_activities').select('*').eq('challenge_id', active[0].id).order('sort_order'),
      ]);
      setCompletions(c ?? []);
      setActivities(acts ?? []);
    } else {
      setChallenge(null);
      const { data: prop } = await supabase
        .from('challenges').select('*').eq('status', 'proposed')
        .order('created_at', { ascending: false }).limit(1);
      setPending(prop?.[0] ?? null);
    }
  }, [stored?.id]);

  useEffect(() => {
    load();
    const sub = supabase.channel('map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_completions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, load)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [load]);

  useEffect(() => {
    if (challenge?.id) {
      setTimeout(() => {
        const day = getCurrentDay();
        document.getElementById(`node-${day}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [challenge?.id, completions.length]);

  // Current day = max(calendar day, highest completed day + 1)
  // This ensures that if you've completed day 2, day 3 is accessible even if
  // the calendar hasn't reached day 3 yet.
  const getCurrentDay = () => {
    if (!challenge?.start_date) return 1;
    const calendarDay = Math.max(1, Math.min(
      Math.floor((Date.now() - new Date(challenge.start_date).getTime()) / 86400000) + 1,
      challenge.duration_days,
    ));
    const myDone = completions.filter(c => c.user_id === (stored?.id ?? ''));
    const highestDone = myDone.length > 0 ? Math.max(...myDone.map(c => c.day_number)) : 0;
    return Math.min(Math.max(calendarDay, highestDone + 1), challenge.duration_days);
  };

  const approve = async () => {
    if (!pending || !stored) return;
    const isManon   = stored.name === 'Manon';
    const bothAfter = isManon ? pending.melvin_approved : pending.manon_approved;
    await supabase.from('challenges').update({
      ...(isManon ? { manon_approved: true } : { melvin_approved: true }),
      ...(bothAfter ? { status: 'active', start_date: new Date().toISOString().split('T')[0] } : {}),
    }).eq('id', pending.id);
    load();
  };

  const reject = async () => {
    if (!pending) return;
    if (!confirm('Challenge afwijzen?')) return;
    await supabase.from('challenges').update({ status: 'cancelled' }).eq('id', pending.id);
    load();
  };

  const handleDayCompleted = (completedDay: number) => {
    load();
    const next = completedDay + 1;
    if (challenge && next <= challenge.duration_days) {
      setBlinkDay(next);
      setTimeout(() => setBlinkDay(null), 4500);
    }
  };

  if (!challenge && !pending) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center gap-6">
      <span className="text-8xl">🏆</span>
      <h2 className="text-2xl font-black text-white">Geen actieve challenge</h2>
      <p className="text-white/50 text-sm">Stel een nieuwe maandelijkse challenge voor!</p>
      <button onClick={() => setShowCreate(true)}
        className="bg-[#FF6B6B] text-white font-bold px-8 py-4 rounded-2xl text-lg active:scale-95 transition-transform">
        + Challenge aanmaken
      </button>
      <CreateChallengeModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </div>
  );

  if (pending && !challenge) {
    const myApproved = stored?.name === 'Manon' ? pending.manon_approved : pending.melvin_approved;
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 gap-5">
        <span className="text-6xl">⏳</span>
        <h2 className="text-xl font-black text-white text-center">Challenge wacht op goedkeuring</h2>
        <div className="w-full bg-white/8 rounded-2xl p-5 border border-white/10 flex flex-col gap-3">
          <h3 className="text-lg font-bold text-white">{pending.title}</h3>
          {pending.description && <p className="text-white/60 text-sm">{pending.description}</p>}
          <p className="text-[#4ECDC4] font-semibold">📅 {pending.duration_days} dagen</p>
          <div className="flex gap-6 justify-center pt-2">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">{pending.manon_approved ? '✅' : '⏳'}</span>
              <span className="text-xs text-white/60">Manon</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">{pending.melvin_approved ? '✅' : '⏳'}</span>
              <span className="text-xs text-white/60">Melvin</span>
            </div>
          </div>
        </div>
        {!myApproved ? (
          <div className="flex gap-3 w-full">
            <button onClick={approve} className="flex-1 bg-[#6BCB77] text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform">✅ Akkoord</button>
            <button onClick={reject}  className="flex-1 border border-[#FF6B6B] text-[#FF6B6B] font-bold py-4 rounded-2xl active:scale-95 transition-transform">❌ Afwijzen</button>
          </div>
        ) : (
          <p className="text-white/40 italic text-sm">Wachten op {stored?.name === 'Manon' ? 'Melvin' : 'Manon'}…</p>
        )}
        <button onClick={() => setShowCreate(true)} className="text-white/30 text-sm underline">Nieuw voorstel doen</button>
        <CreateChallengeModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
      </div>
    );
  }

  if (!challenge) return null;

  const days         = Array.from({ length: challenge.duration_days }, (_, i) => i + 1);
  const currentDay   = getCurrentDay();
  const myId         = stored?.id ?? '';
  const myInitial    = stored?.name?.[0] ?? 'M';
  const otherInitial = otherUser?.name?.[0] ?? 'M';

  return (
    <>
      <div className="px-5 pt-3 pb-1">
        <h2 className="text-lg font-black text-white">{challenge.title}</h2>
        <p className="text-white/40 text-xs">Dag {currentDay} van {challenge.duration_days} · Tik op een dag om te openen</p>
      </div>

      <div className="flex justify-center gap-5 px-4 py-2 mb-1">
        {[[stored?.name ?? '', '#FF6B6B'], [otherUser?.name ?? '', '#4ECDC4'], ['Samen ⭐', '#FFE66D']].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-white/50 font-semibold">{label}</span>
          </div>
        ))}
      </div>

      <div className="relative px-2" style={{ height: `${days.length * 110 + 60}px` }}>
        {days.map((day, i) => {
          if (i === 0) return null;
          const x1   = parseFloat(getCol(i - 1));
          const x2   = parseFloat(getCol(i));
          const y1   = (days.length - i)     * 110 + 28;
          const y2   = (days.length - i + 1) * 110 + 28;
          const done =
            completions.some(c => c.day_number === day - 1 && c.user_id === myId) &&
            completions.some(c => c.day_number === day - 1 && c.user_id === otherUser?.id);
          return (
            <svg key={`line-${i}`} className="absolute inset-0 w-full h-full" style={{ zIndex: 0, pointerEvents: 'none' }}>
              <line x1={`${x1}%`} y1={y1} x2={`${x2}%`} y2={y2}
                stroke={done ? '#FFE66D40' : 'rgba(255,255,255,0.1)'}
                strokeWidth="6" strokeDasharray={done ? 'none' : '8 6'} strokeLinecap="round" />
            </svg>
          );
        })}

        {days.map((day, i) => {
          const myDone    = completions.some(c => c.day_number === day && c.user_id === myId);
          const otherDone = completions.some(c => c.day_number === day && c.user_id === otherUser?.id);
          const top       = (days.length - i - 1) * 110 + 10;
          return (
            <div key={day} id={`node-${day}`} className="absolute"
              style={{ left: getCol(i), top, transform: 'translateX(-50%)', zIndex: 1 }}>
              <MapNode
                day={day} myDone={myDone} otherDone={otherDone}
                isCurrent={day === currentDay}
                isFuture={day > currentDay}
                isBlinking={day === blinkDay}
                myInitial={myInitial} otherInitial={otherInitial}
                onClick={() => setSelectedDay(day)}
              />
            </div>
          );
        })}
      </div>

      {selectedDay !== null && (
        <DayDetailModal
          challengeId={challenge.id}
          dayNumber={selectedDay}
          totalDays={challenge.duration_days}
          isCurrentDay={selectedDay === currentDay}
          isFutureDay={selectedDay > currentDay}
          activities={activities}
          onClose={() => setSelectedDay(null)}
          onDayCompleted={() => { handleDayCompleted(selectedDay); setSelectedDay(null); }}
        />
      )}
    </>
  );
}
