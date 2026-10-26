export function recentNoisePoints(rows: { recorded_at: string; decibel: number }[], end: number) {
  const start = end - 7200000;
  const first = Math.floor(start / 60000);
  const buckets = new Map<number, number>();
  let count = 0;
  for (const row of rows) {
    const time = Date.parse(row.recorded_at), db = Number(row.decibel);
    if (!Number.isFinite(time) || !Number.isFinite(db) || time < start || time > end) continue;
    const minute = Math.floor(time / 60000);
    buckets.set(minute, Math.max(buckets.get(minute) ?? -Infinity, db));
    count++;
  }
  return { count, points: Array.from({ length: Math.floor(end / 60000) - first + 1 }, (_, i) => ({
    time: new Date((first + i) * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    decibel: buckets.get(first + i) ?? null,
  })) };
}
