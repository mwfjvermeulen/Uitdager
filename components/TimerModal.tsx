'use client';
import { useEffect, useRef, useState } from 'react';

export default function TimerModal({ activity, onClose, onComplete }: {
  activity: { name: string; duration_minutes: number };
  onClose: () => void;
  onComplete: () => void;
}) {
  const total = activity.duration_minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setLeft(p => {
          if (p <= 1) { clearInterval(ref.current!); setRunning(false); setDone(true); return 0; }
          return p - 1;
        });
      }, 1000);
    } else clearInterval(ref.current!);
    return () => clearInterval(ref.current!);
  }, [running]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const pct = (left / total) * 100;
  const color = pct > 50 ? '#6BCB77' : pct > 20 ? '#FFE66D' : '#FF6B6B';
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-sm bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-t-3xl p-8 pb-12" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-white text-center">{activity.name}</h2>
        <p className="text-white/40 text-sm text-center mt-1 mb-7">{activity.duration_minutes} minuten timer</p>

        {/* Circular timer */}
        <div className="flex justify-center mb-7">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" width="144" height="144">
              <circle cx="72" cy="72" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s, stroke 0.5s' }} />
            </svg>
            <div className="text-center z-10">
              {done ? <span className="text-4xl">🎉</span> : <span className="text-3xl font-black text-white">{fmt(left)}</span>}
              {done && <p className="text-[#6BCB77] font-bold text-sm mt-1">Klaar!</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {!done ? (
            <button onClick={() => setRunning(r => !r)}
              className={`w-full py-4 rounded-2xl font-bold text-white text-lg active:scale-95 transition-transform ${
                running ? 'bg-[#FFE66D] text-[#1a1a2e]' : 'bg-[#FF6B6B]'
              }`}>
              {running ? '⏸ Pauzeer' : left === total ? '▶️ Start' : '▶️ Hervat'}
            </button>
          ) : (
            <button onClick={() => { onComplete(); onClose(); }}
              className="w-full py-4 rounded-2xl font-bold text-white text-lg bg-[#6BCB77] active:scale-95 transition-transform">
              ✔ Markeer als voltooid
            </button>
          )}
          <button onClick={onClose} className="w-full py-3 text-white/40 text-sm">Sluiten</button>
        </div>
      </div>
    </div>
  );
}
