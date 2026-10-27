import { useEffect, useState } from 'react';
import { Apartment } from '../types/database.types';
import { supabase } from './supabaseClient';
import { localStore } from './dataService';
import { telemetrySnapshot, TelemetrySample } from './telemetryHealth';

export function useTelemetryHealth(apartments: Apartment[], sessionKey: string): Apartment[] {
  const ids = apartments.map(a => a.id).sort().join(',');
  const [history, setHistory] = useState<Record<string, TelemetrySample[]>>({});
  const [now, setNow] = useState(Date.now());
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let stopped = false, busy = false;
    setHistory({}); setFailed(false);
    const refresh = async () => {
      if (busy || !ids) return;
      busy = true;
      try {
        const pairs = await Promise.all(ids.split(',').map(async id => {
          if (!supabase) return [id, localStore.readings.filter(r => r.apartment_id === id && r.source === 'esp32').slice(0,10)] as const;
          const { data, error } = await supabase.from('noise_readings').select('recorded_at,decibel')
            .eq('apartment_id', id).eq('source','esp32').lte('recorded_at',new Date().toISOString())
            .order('recorded_at', { ascending: false }).limit(10);
          if (error) throw error;
          return [id, data || []] as const;
        }));
        if (!stopped) { setHistory(Object.fromEntries(pairs)); setFailed(false); setNow(Date.now()); }
      } catch { if (!stopped) setFailed(true); }
      finally { busy = false; }
    };
    void refresh();
    const poll = window.setInterval(refresh, 10000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { stopped = true; clearInterval(poll); clearInterval(clock); };
  }, [ids, sessionKey]);
  return apartments.map(a => {
    if (!history[a.id]) return { ...a, telemetry_error: failed };
    const health = telemetrySnapshot(history[a.id], now);
    return { ...a, status: health.offline ? 'offline' as const : a.status === 'offline' ? 'normal' as const : a.status,
      current_db: health.offline ? undefined : health.decibel, last_reading_at: health.lastReading, telemetry_error: failed };
  });
}
