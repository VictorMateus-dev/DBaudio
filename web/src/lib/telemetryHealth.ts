export interface TelemetrySample { recorded_at: string; decibel: number }
export const OFFLINE_AFTER_MS = 10 * 10000;
export function telemetrySnapshot(samples: TelemetrySample[], now: number) {
  const valid = samples.filter(s => Number.isFinite(Number(s.decibel)) && Number.isFinite(Date.parse(s.recorded_at)) && Date.parse(s.recorded_at) <= now + 1000)
    .sort((a,b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at)).slice(0, 10);
  const latest = valid[0];
  return { offline: !latest || now - Date.parse(latest.recorded_at) >= OFFLINE_AFTER_MS,
    lastReading: latest?.recorded_at, decibel: latest ? Number(latest.decibel) : undefined };
}
