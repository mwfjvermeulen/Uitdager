'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getStoredUser } from '@/lib/auth';

interface Act { name: string; isTimed: boolean; count: string; unit: string; minutes: string; }
const emptyAct = (): Act => ({ name: '', isTimed: false, count: '', unit: 'reps', minutes: '' });

export default function CreateChallengeModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const stored = getStoredUser();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [days, setDays] = useState('30');
  const [acts, setActs] = useState<Act[]>([emptyAct()]);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const updateAct = (i: number, f: Partial<Act>) => setActs(prev => prev.map((a, idx) => idx === i ? { ...a, ...f } : a));

  const submit = async () => {
    if (!title.trim()) return alert('Vul een titel in');
    if (acts.some(a => !a.name.trim())) return alert('Geef elke activiteit een naam');
    const d = parseInt(days);
    if (isNaN(d) || d < 1 || d > 31) return alert('Duur moet tussen 1 en 31 zijn');
    if (!stored) return;
    setLoading(true);
    try {
      const isManon = stored.name === 'Manon';
      const { data: ch, error } = await supabase.from('challenges').insert({
        title: title.trim(), description: desc.trim() || null, duration_days: d,
        status: 'proposed', proposed_by: stored.id,
        manon_approved: isManon, melvin_approved: !isManon,
      }).select().single();
      if (error || !ch) throw error;
      await supabase.from('challenge_activities').insert(
        acts.map((a, i) => ({
          challenge_id: ch.id, name: a.name.trim(), sort_order: i,
          target_count: a.isTimed ? null : (parseInt(a.count) || null),
          unit: a.isTimed ? 'minuten' : (a.unit || 'reps'),
          duration_minutes: a.isTimed ? (parseInt(a.minutes) || null) : null,
        }))
      );
      setTitle(''); setDesc(''); setDays('30'); setActs([emptyAct()]);
      onCreated(); onClose();
    } catch { alert('Er is iets misgegaan. Probeer opnieuw.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-t-3xl p-6 pb-12 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-black text-white">Nieuwe Challenge 💪</h2>
          <button onClick={onClose} className="text-white/50 text-2xl leading-none">&times;</button>
        </div>

        <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Titel</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="bv. Fitness Challenge"
          className="w-full bg-white/8 border border-white/10 rounded-xl p-3 text-white text-sm mb-4 outline-none focus:border-[#FF6B6B]" />

        <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Beschrijving (optioneel)</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Waarom doen jullie dit?"
          className="w-full bg-white/8 border border-white/10 rounded-xl p-3 text-white text-sm mb-4 outline-none resize-none focus:border-[#FF6B6B]" />

        <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Aantal dagen</label>
        <div className="flex gap-2 flex-wrap mb-5">
          {['7','14','21','30','31'].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                days === d ? 'bg-[#FF6B6B] text-white' : 'bg-white/10 text-white/60'
              }`}>{d}</button>
          ))}
          <input value={days} onChange={e => setDays(e.target.value)} type="number" min="1" max="31"
            className="w-14 bg-white/8 border border-white/10 rounded-xl p-2 text-white text-sm text-center outline-none" />
        </div>

        <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Activiteiten</label>
        <div className="flex flex-col gap-3 mb-3">
          {acts.map((act, i) => (
            <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/8 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/30 font-bold">#{i + 1}</span>
                {acts.length > 1 && <button onClick={() => setActs(p => p.filter((_, idx) => idx !== i))} className="text-[#FF6B6B] text-xs">Verwijder</button>}
              </div>
              <input value={act.name} onChange={e => updateAct(i, { name: e.target.value })} placeholder="bv. Push-ups"
                className="w-full bg-white/8 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <div className="flex gap-2">
                {[false, true].map(timed => (
                  <button key={String(timed)} onClick={() => updateAct(i, { isTimed: timed })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      act.isTimed === timed ? 'bg-[#4ECDC4]/20 border border-[#4ECDC4] text-[#4ECDC4]' : 'bg-white/5 border border-white/10 text-white/50'
                    }`}>{timed ? '⏱ Minuten' : 'Herhalingen'}</button>
                ))}
              </div>
              {act.isTimed ? (
                <input value={act.minutes} onChange={e => updateAct(i, { minutes: e.target.value })} type="number" placeholder="Aantal minuten"
                  className="w-full bg-white/8 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              ) : (
                <div className="flex gap-2">
                  <input value={act.count} onChange={e => updateAct(i, { count: e.target.value })} type="number" placeholder="Aantal"
                    className="flex-1 bg-white/8 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
                  <input value={act.unit} onChange={e => updateAct(i, { unit: e.target.value })} placeholder="eenheid"
                    className="flex-1 bg-white/8 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={() => setActs(p => [...p, emptyAct()])}
          className="w-full border border-dashed border-[#4ECDC4]/50 text-[#4ECDC4] font-bold py-3 rounded-2xl text-sm mb-5 active:scale-95">
          + Activiteit toevoegen
        </button>

        <button onClick={submit} disabled={loading}
          className="w-full bg-[#FF6B6B] text-white font-black py-5 rounded-2xl text-lg active:scale-95 transition-all disabled:opacity-60">
          {loading ? 'Even geduld...' : 'Challenge voorstellen 🚀'}
        </button>
      </div>
    </div>
  );
}
