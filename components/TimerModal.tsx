'use client';
import { useEffect, useRef, useState } from 'react';

const fmtSecs = (s: number) => {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
};

export default function TimerModal({
  activity, remainingSeconds, totalSeconds, doneSoFar, onClose, onSaveDone,
}: {
  activity: { name: string; duration_minutes?: number };
  remainingSeconds: number;
  totalSeconds: number;
  doneSoFar: number;
  onClose: () => void;
  onSaveDone: (secondsDone: number) => void;
}) {
  const startSecs = Math.max(remainingSeconds, 0);
  const [left,    setLeft]    = useState(startSecs);
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(remainingSeconds <= 0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const elapsed = startSecs - left;

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setLeft(p => {
          if (p <= 1) { clearInterval(ref.current!); setRunning(false); setDone(true); return 0; }
          return p - 1;
        });
      }, 1000);
    } else {
      clearInterval(ref.current!);
    }
    return () => clearInterval(ref.current!);
  }, [running]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => onSaveDone(remainingSeconds), 1800);
    return () => clearTimeout(t);
  }, [done]);

  const fmt   = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const pct   = startSecs > 0 ? (left / startSecs) * 100 : 0;
  const color = pct > 50 ? '#6BCB77' : pct > 20 ? '#FFE66D' : '#FF6B6B';
  const r     = 54;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;

  const handleStop = () => {
    if (elapsed < 60) { onClose(); return; }
    onSaveDone(elapsed);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-t-3xl p-8 pb-12"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-white text-center">{activity.name}</h2>
        {doneSoFar > 0 ? (
          <div className="text-center mt-1 mb-5">
            <p className="text-white/40 text-sm">{fmtSecs(doneSoFar)} / {fmtSecs(totalSeconds)} gedaan</p>
            <p className="text-[#4ECDC4] text-xs mt-0.5">Nog {fmtSecs(remainingSeconds)} te gaan</p>
          </div>
        ) : (
          <p className="text-white/40 text-sm text-center mt-1 mb-5">{fmtSecs(totalSeconds)} timer</p>
        )}

        <div className="flex justify-center mb-7">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" width="144" height="144">
              <circle cx="72" cy="72" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s, stroke 0.5s' }} />
            </svg>
            <div className="text-center z-10">
              {done
                ? <>
                    <span className="text-4xl">🎉</span>
                    <p className="text-[#6BCB77] font-bold text-sm mt-1">Klaar!</p>
                  </>
                : <>
                    <span className="text-3xl font-black text-white">{fmt(left)}</span>
                    {elapsed >= 60 && (
                      <p className="text-white/30 text-[10px] mt-0.5">{fmtSecs(elapsed)} nu</p>
                    )}
                  </>
              }
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {!done ? (
            <>
              <button
                onClick={() => setRunning(r => !r)}
                className={`w-full py-4 rounded-2xl font-bold text-lg active:scale-95 transition-transform ${
                  running ? 'bg-[#FFE66D] text-[#1a1a2e]' : 'bg-[#FF6B6B] text-white'
                }`}
              >
                {running ? '⏸ Pauzeer' : left === startSecs ? '▶️ Start' : '▶️ Hervat'}
              </button>
              {elapsed >= 60 && (
                <button
                  onClick={handleStop}
                  className="w-full py-3 rounded-2xl font-bold text-sm bg-[#4ECDC4]/20 border border-[#4ECDC4]/40 text-[#4ECDC4] active:scale-95"
                >
                  ⏹ Stop — {fmtSecs(elapsed)} opslaan
                </button>
              )}
              <button onClick={onClose} className="w-full py-2 text-white/30 text-xs">
                ✕ Annuleer (niets opslaan)
              </button>
            </>
          ) : (
            <button
              onClick={() => onSaveDone(remainingSeconds)}
              className="w-full py-4 rounded-2xl font-bold text-white text-lg bg-[#6BCB77] active:scale-95 transition-transform"
            >
              ✔ Volledig voltooid — opslaan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
