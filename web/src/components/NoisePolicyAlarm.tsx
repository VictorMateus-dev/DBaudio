import React, { useEffect, useRef, useState } from 'react';
import type { Apartment, NoisePolicy } from '../types/database.types';
import { DataService } from '../lib/dataService';
import { activePolicy, advanceEpisode, AlarmEpisode } from '../lib/noisePolicy';

export function NoisePolicyAlarm({ apartments, policies }: { apartments: Apartment[]; policies: NoisePolicy[] }) {
  const episodes = useRef(new Map<string, AlarmEpisode>());
  const [alarm, setAlarm] = useState<AlarmEpisode | null>(null);
  const ids = apartments.map(a => a.id).sort().join(',');
  useEffect(() => {
    let stopped = false;
    const processed = new Map<string, number>();
    episodes.current.clear(); setAlarm(null);
    const poll = async () => {
      try {
        const samples = await DataService.getAlarmSamples(ids ? ids.split(',') : []);
        if (stopped) return;
        const now = Date.now(), policy = activePolicy(policies);
        for (const id of ids.split(',').filter(Boolean)) {
          const unitSamples = samples.filter(s => s.apartment_id === id).sort((a,b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
          for (const sample of unitSamples) {
            const timestamp = Date.parse(sample.recorded_at);
            if (timestamp <= (processed.get(id) ?? -Infinity)) continue;
            processed.set(id, timestamp);
            const episode = advanceEpisode(episodes.current.get(id), sample, policy, now);
            if (episode) episodes.current.set(id, episode); else episodes.current.delete(id);
          }
          const latest = unitSamples[unitSamples.length - 1];
          if (!advanceEpisode(episodes.current.get(id), latest, policy, now)) episodes.current.delete(id);
        }
        const ready = [...episodes.current.values()].filter(e => !e.dismissed && policy && e.last - e.since >= policy.min_duration_seconds * 1000);
        setAlarm(current => ready.find(e => e.apartmentId === current?.apartmentId) || ready[0] || null);
      } catch { if (!stopped) setAlarm(current => current && Date.now() - current.last <= 30000 ? current : null); }
    };
    let running = false;
    const tick = async () => { if (running) return; running = true; try { await poll(); } finally { running = false; } };
    void tick(); const timer = setInterval(tick, 2000);
    return () => { stopped = true; clearInterval(timer); };
  }, [ids, JSON.stringify(policies)]);
  if (!alarm) return null;
  const policy = activePolicy(policies);
  return <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="noise-alarm-title">
    <div className="bg-white rounded-2xl border-2 border-rose-500 p-6 max-w-sm w-full space-y-4 text-center shadow-xl">
      <h2 id="noise-alarm-title" className="font-bold text-xl text-rose-700">Alerta de ruído</h2>
      <p className="text-slate-700">Apartamento {apartments.find(a => a.id === alarm.apartmentId)?.number}</p>
      <p className="text-4xl font-bold text-rose-700">{alarm.db.toFixed(1)} dB</p>
      <p className="text-sm text-slate-600">Limite do período: {policy?.critical_threshold_db} dB · {policy?.name}</p>
      <p className="text-xs text-slate-500">Ruído elevado confirmado em leituras sucessivas. Reduza o volume para preservar a convivência.</p>
      <button autoFocus className="w-full rounded-xl bg-rose-600 text-white py-3 font-semibold" onClick={() => {
        const episode = episodes.current.get(alarm.apartmentId);
        if (episode) episode.dismissed = true;
        setAlarm(null);
      }}>Dispensar este episódio</button>
    </div>
  </div>;
}
