import type { NoisePolicy } from '../types/database.types';

export function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
export function activePolicy(policies: NoisePolicy[], at = new Date()): NoisePolicy | undefined {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const minute = Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
  return policies.find(p => {
    const start = minutes(p.start_time), end = minutes(p.end_time);
    return p.enabled && (start < end ? minute >= start && minute < end : minute >= start || minute < end);
  });
}
export function validatePolicies(policies: NoisePolicy[]): string | null {
  if (!policies.length) return 'Cadastre pelo menos um período.';
  const coverage = new Uint8Array(1440);
  for (const p of policies) {
    if (!p.name.trim()) return 'Informe o nome de cada período.';
    if (![p.start_time, p.end_time].every(t => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(t))) return 'Informe horários válidos.';
    const start = minutes(p.start_time), end = minutes(p.end_time);
    if (start === end) return 'O início e o fim precisam ser diferentes.';
    if (![p.warning_threshold_db, p.critical_threshold_db].every(v => Number.isFinite(v) && v >= 30 && v <= 130)) return 'Os limites devem estar entre 30 e 130 dB.';
    if (p.warning_threshold_db > p.critical_threshold_db) return 'O limite de atenção não pode superar o limite do modal.';
    if (!Number.isInteger(p.min_duration_seconds) || p.min_duration_seconds < 1 || p.min_duration_seconds > 300) return 'A duração deve ser de 1 a 300 segundos.';
    if (!Number.isInteger(p.cooldown_seconds) || p.cooldown_seconds < 10 || p.cooldown_seconds > 3600) return 'O intervalo deve ser de 10 a 3600 segundos.';
    if (p.enabled) for (let i = start; i !== end; i = (i + 1) % 1440) if (++coverage[i] > 1) return 'Os períodos ativos não podem se sobrepor.';
  }
  if (coverage.some(v => v === 0)) return 'Os períodos ativos devem cobrir as 24 horas, sem intervalos vazios.';
  return null;
}
export interface AlarmSample { apartment_id: string; decibel: number; recorded_at: string }
export interface AlarmEpisode { apartmentId: string; since: number; last: number; policyKey: string; dismissed: boolean; db: number }
// A repeated poll of one reading never proves sustained noise.
export function advanceEpisode(previous: AlarmEpisode | undefined, sample: AlarmSample | undefined, policy: NoisePolicy | undefined, now: number): AlarmEpisode | undefined {
  if (!sample || !policy) return undefined;
  const timestamp = Date.parse(sample.recorded_at);
  if (!Number.isFinite(timestamp) || timestamp > now + 1000 || now - timestamp > 30000 || !Number.isFinite(sample.decibel) || sample.decibel < policy.critical_threshold_db) return undefined;
  if (!activePolicy([policy], new Date(timestamp))) return undefined;
  const key = `${policy.id}:${policy.start_time}:${policy.end_time}:${policy.critical_threshold_db}:${policy.min_duration_seconds}`;
  if (!previous || previous.policyKey !== key || timestamp - previous.last > 30000 || timestamp < previous.last) return { apartmentId: sample.apartment_id, since: timestamp, last: timestamp, policyKey: key, dismissed: false, db: sample.decibel };
  return { ...previous, last: timestamp, db: sample.decibel };
}
