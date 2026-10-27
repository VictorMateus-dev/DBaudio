export const HISTORY_TIMEZONE = 'America/Fortaleza';
export interface HistoryContext {
  emitter_name: string; apartment_id: string; apartment_number: string; building: string; condominium: string; condominium_id: string; timezone: string;
  devices: { id: string; label: string }[]; sensors: { id: string; device_id: string; label: string }[];
}
export interface HistoryBucket { slot: number; count: number; energy_sum: number; leq_db: number; max_db: number; occupied_slots: number; devices: string[] }
export interface HistoryResponse { context: HistoryContext; days: { day: string; count: number }[]; buckets: HistoryBucket[]; source?: string; is_test_data?: boolean; generated_at?: string }
export interface HistoryFilter { source: string; test: boolean; device: string; sensor: string }
export interface HistoryInterval { slot: number; start: string; end: string; count: number; energy: number; leq: number | null; max: number | null; coverage: number; devices: string[] }
export interface HistoryHour { hour: number; intervals: HistoryInterval[]; count: number; leq: number | null; max: number | null; coverage: number }
export const HISTORY_ORIGINS = [
  { id: 'esp32:false', label: 'ESP32 - medições reais', source: 'esp32', test: false },
  { id: 'esp32:true', label: 'ESP32 - dados de teste', source: 'esp32', test: true },
  { id: 'manual:false', label: 'Manual - não marcado como teste', source: 'manual', test: false },
  { id: 'manual:true', label: 'Manual - dados de teste', source: 'manual', test: true },
  { id: 'simulation:true', label: 'Simulador - dados de teste', source: 'simulation', test: true },
  { id: 'simulation:false', label: 'Simulador - não marcado como teste', source: 'simulation', test: false },
];
export function todayFortaleza(at = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: HISTORY_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  return ['year','month','day'].map(key => parts.find(p => p.type === key)?.value).join('-');
}
export function monthDays(month: string): (string | null)[] {
  const [year,m] = month.split('-').map(Number);
  const offset = new Date(Date.UTC(year,m-1,1)).getUTCDay();
  const total = new Date(Date.UTC(year,m,0)).getUTCDate();
  const cells: (string|null)[] = Array(offset).fill(null);
  for(let d=1;d<=total;d++) cells.push(`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  while(cells.length%7) cells.push(null);
  return cells;
}
export const pad = (n: number) => String(n).padStart(2, '0');
export const displayDay = (day: string) => day.split('-').reverse().join('/');
export const hourLabel = (hour: number) => `${pad(hour)}h às ${pad(hour+1)}h`;
export const formatDb = (value: number | null) => value === null ? 'Sem registros' : value.toFixed(1);
export function summarize(intervals: HistoryInterval[]) {
  const count = intervals.reduce((n,i)=>n+i.count,0), energy = intervals.reduce((n,i)=>n+i.energy,0);
  const values = intervals.flatMap(i=>i.max===null?[]:[i.max]);
  return { count, leq: count ? 10*Math.log10(energy/count) : null, max: values.length ? Math.max(...values) : null, coverage: intervals.reduce((n,i)=>n+i.coverage,0) };
}
export function buildHours(buckets: HistoryBucket[]): HistoryHour[] {
  const map=new Map<number,HistoryBucket>();
  for(const b of buckets) {
    if(!Number.isInteger(b.slot)||b.slot<0||b.slot>143||map.has(b.slot)||!Number.isInteger(Number(b.count))||Number(b.count)<=0||![b.energy_sum,b.leq_db,b.max_db,b.occupied_slots].every(v=>Number.isFinite(Number(v)))||Number(b.energy_sum)<=0) throw new Error('O banco retornou uma agregação inválida. O relatório não foi gerado.');
    map.set(b.slot,b);
  }
  return Array.from({length:24},(_,hour)=>{
    const intervals=Array.from({length:6},(_,i)=>{
      const slot=hour*6+i,b=map.get(slot);
      return {slot,start:`${pad(hour)}:${pad(i*10)}`,end:`${pad(hour)}:${pad(i*10+9)}`,count:Number(b?.count||0),energy:Number(b?.energy_sum||0),leq:b?Number(b.leq_db):null,max:b?Number(b.max_db):null,coverage:Number(b?.occupied_slots||0),devices:b?.devices||[]};
    });
    return {hour,intervals,...summarize(intervals)};
  });
}
export function coverageLabel(interval: HistoryInterval): string {
  if(!interval.count) return 'Sem registros';
  return interval.coverage<60 ? 'Dados incompletos' : 'Faixas de 10 s preenchidas';
}
export function selectedHours(slots: number[]): number[] { return [...new Set(slots.map(s=>Math.floor(s/6)))].sort((a,b)=>a-b); }
