import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { localStore } from '../lib/dataService';
import { recentNoisePoints } from '../lib/recentNoisePoints';
import { NoiseChart } from './NoiseChart';

export function RecentNoiseChart({ apartmentId }: { apartmentId: string }) {
  const [origin, setOrigin] = useState('esp32:false');
  const [data, setData] = useState<{ time: string; decibel: number | null }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let busy = false;
    setData([]); setCount(0); setLoading(true); setError('');
    const refresh = async () => {
      if (busy) return;
      busy = true;
      const end = Date.now(), start = end - 2 * 60 * 60 * 1000;
      const [source, test] = origin.split(':');
      try {
        let rows: { recorded_at: string; decibel: number }[] = [];
        if (supabase) {
          for (let offset = 0; ; offset += 1000) {
            const result = await supabase.from('noise_readings').select('id,recorded_at,decibel')
              .eq('apartment_id', apartmentId).eq('source', source).eq('is_test_data', test === 'true')
              .gte('recorded_at', new Date(start).toISOString()).lte('recorded_at', new Date(end).toISOString())
              .order('recorded_at').order('id').range(offset, offset + 999);
            if (result.error) throw result.error;
            rows.push(...(result.data || []));
            if (cancelled) return;
            if (!result.data || result.data.length < 1000) break;
          }
        } else {
          rows = localStore.readings.filter(r => r.apartment_id === apartmentId && r.source === source
            && Boolean(r.is_test_data) === (test === 'true')
            && Date.parse(r.recorded_at) >= start && Date.parse(r.recorded_at) <= end);
        }
        const result = recentNoisePoints(rows, end);
        if (!cancelled) { setData(result.points); setCount(result.count); setError(''); }
      } catch {
        if (!cancelled) { setError('Não foi possível carregar as leituras. Tentaremos novamente automaticamente.'); setData([]); setCount(0); }
      } finally { busy = false; if (!cancelled) setLoading(false); }
    };
    void refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [apartmentId, origin]);
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-bold">Últimas 2 horas</h2><p className="text-xs text-slate-500">Maior leitura por minuto • atualização a cada 10 segundos • {count} leituras</p></div>
      <select aria-label="Origem das leituras do gráfico" value={origin} onChange={e => setOrigin(e.target.value)} className="border rounded-lg p-2 text-sm bg-white">
        <option value="esp32:false">ESP32 — dados reais</option><option value="esp32:true">ESP32 — marcados como teste</option>
        <option value="simulation:true">Simulação — teste</option>
      </select>
    </div>
    <div role="status" className="text-sm text-slate-500">{error || (loading ? 'Carregando leituras…' : count === 0 ? 'Sem leituras desta origem nas últimas duas horas.' : 'Horários locais. Intervalos sem leitura aparecem como lacunas.')}</div>
    <NoiseChart data={data} />
  </section>;
}
