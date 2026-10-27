import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HistoryService } from '../lib/historyService';
import { buildHours, coverageLabel, displayDay, formatDb, HISTORY_ORIGINS, HistoryResponse, monthDays, pad, todayFortaleza } from '../lib/noiseHistory';

export function NoiseAuditDialog({ apartmentId, onClose }: { apartmentId: string; onClose: () => void }) {
  const today = todayFortaleza();
  const [month, setMonth] = useState(today.slice(0,7));
  const [origin, setOrigin] = useState('esp32:true');
  const [device, setDevice] = useState('');
  const [sensor, setSensor] = useState('');
  const [calendar, setCalendar] = useState<HistoryResponse | null>(null);
  const [day, setDay] = useState('');
  const [readings, setReadings] = useState<HistoryResponse | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [monthLoading, setMonthLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pdf, setPdf] = useState<{ url: string; filename: string } | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const selectedOrigin = HISTORY_ORIGINS.find(o => o.id === origin)!;
  const filter = useMemo(() => ({ source: selectedOrigin.source, test: selectedOrigin.test, device, sensor }), [origin, device, sensor]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; panel.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf.url); }, [pdf]);
  useEffect(() => {
    let cancelled = false;
    generation.current++; setPdf(null); setDay(''); setReadings(null); setHour(null); setError(''); setCalendar(null); setMonthLoading(true);
    HistoryService.read(apartmentId, `${month}-01`, 'month', filter)
      .then(result => { if (!cancelled) setCalendar(result); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setMonthLoading(false); });
    return () => { cancelled = true; };
  }, [apartmentId, month, filter]);
  useEffect(() => {
    if (!day) return;
    let cancelled = false;
    generation.current++; setPdf(null); setReadings(null); setHour(null); setError(''); setDayLoading(true);
    HistoryService.read(apartmentId, day, 'day', filter)
      .then(result => { if (!cancelled) setReadings(result); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setDayLoading(false); });
    return () => { cancelled = true; };
  }, [apartmentId, day, filter]);
  const hours = readings ? buildHours(readings.buckets) : [];
  const selected = hour === null ? undefined : hours[hour];
  const generate = async () => {
    if (hour === null || !day || generating) return;
    const token = ++generation.current;
    setGenerating(true); setError(''); setPdf(null);
    try {
      const fresh = await HistoryService.read(apartmentId, day, 'day', filter);
      const { createAuditPdf } = await import('../lib/auditPdf');
      if (token !== generation.current) return;
      const reportId = crypto.randomUUID();
      const doc = createAuditPdf(fresh, day, hour, filter, reportId);
      const blob = doc.output('blob');
      setReadings(fresh);
      setPdf({ url: URL.createObjectURL(blob), filename: `dBSound-${fresh.context.apartment_number}-${day}-${pad(hour)}h.pdf` });
    } catch (e) { if (token === generation.current) setError(e instanceof Error ? e.message : 'Não foi possível gerar o PDF.'); }
    finally { setGenerating(false); }
  };
  const changeHour = (value: number) => { generation.current++; setHour(value); setPdf(null); };
  const daysWithData = new Map(calendar?.days.map(d => [d.day, d.count]));
  const trapKeys = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),input:not(:disabled),a[href],iframe') || []);
    const first = elements[0], last = elements[elements.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <div className="fixed inset-0 z-50 bg-slate-950/50 p-3 sm:p-6 overflow-y-auto" onKeyDown={trapKeys}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="audit-title" className="max-w-5xl mx-auto bg-white rounded-2xl p-5 sm:p-7 space-y-5 shadow-xl">
      <div className="flex justify-between gap-3"><div><h2 id="audit-title" className="text-xl font-bold">Auditoria e emissão de documento</h2><p className="text-sm text-slate-500">Escolha o dia e a hora. Horários de Fortaleza (UTC−3).</p></div><button onClick={onClose} className="border rounded-lg px-3 py-2 h-fit">Fechar</button></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-sm">Mês<input type="month" aria-label="Mês do histórico" value={month} max={today.slice(0,7)} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value) && e.target.value <= today.slice(0,7)) setMonth(e.target.value); }} className="block w-full border rounded-lg p-2" /></label>
        <label className="text-sm">Origem<select value={origin} onChange={e => setOrigin(e.target.value)} className="block w-full border rounded-lg p-2">{HISTORY_ORIGINS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        <label className="text-sm">Dispositivo<select value={device} onChange={e => { setDevice(e.target.value); setSensor(''); }} className="block w-full border rounded-lg p-2"><option value="">Todos da unidade</option>{calendar?.context.devices.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
        <label className="text-sm">Sensor<select value={sensor} onChange={e => setSensor(e.target.value)} className="block w-full border rounded-lg p-2"><option value="">Todos do filtro</option>{calendar?.context.sensors.filter(s => !device || s.device_id === device).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      </div>
      {filter.test && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Dados marcados como teste. Essa identificação também aparecerá no documento.</p>}
      {error && <p role="alert" className="text-rose-700 border border-rose-200 p-3 rounded-lg">{error}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <section aria-label="Calendário de leituras" className="space-y-3"><h3 className="font-semibold">1. Selecione o dia</h3><p className="text-xs text-slate-500">Dias azuis têm registros. Dias sem dados podem ser consultados para emitir um relatório de ausência.</p>
          {monthLoading ? <p role="status">Consultando o mês…</p> : <><div className="grid grid-cols-7 text-center text-xs text-slate-500">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => <span key={d}>{d}</span>)}</div><div className="grid grid-cols-7 gap-1">{monthDays(month).map((date, i) => date ? <button key={date} disabled={!calendar || date > today || generating} aria-pressed={day === date} aria-label={`${displayDay(date)}, ${daysWithData.get(date) || 0} leituras`} onClick={() => setDay(date)} className={`rounded-lg border py-3 text-sm disabled:opacity-30 ${day === date ? 'bg-blue-600 text-white' : daysWithData.has(date) ? 'bg-blue-50 text-blue-800 border-blue-200' : 'text-slate-400'}`}>{Number(date.slice(-2))}</button> : <span key={i} />)}</div></>}
        </section>
        <section className="space-y-3"><h3 className="font-semibold">2. Selecione a hora {day && `- ${displayDay(day)}`}</h3>{dayLoading ? <p role="status">Consultando as horas…</p> : !readings ? <p className="text-sm text-slate-500">Selecione um dia no calendário.</p> : <div className="grid grid-cols-4 gap-2">{hours.map(h => <button key={h.hour} disabled={generating} aria-pressed={hour === h.hour} onClick={() => changeHour(h.hour)} className={`rounded-lg border p-2 text-sm ${hour === h.hour ? 'bg-blue-600 text-white' : h.count ? 'bg-blue-50 border-blue-200' : 'text-slate-400'}`}><span className="block font-bold">{pad(h.hour)}h</span><span className="text-[10px]">{h.count} leituras</span></button>)}</div>}</section>
      </div>
      {selected && <section className="space-y-3"><h3 className="font-bold">3. Conferência - {pad(selected.hour)}:00 às {pad(selected.hour)}:59</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-100 text-left">{['Intervalo','Média energética (dB)','Maior (dB)','Leituras','Cobertura'].map(t => <th key={t} className="p-2">{t}</th>)}</tr></thead><tbody>{selected.intervals.map(i => <tr key={i.slot} className="border-b"><td className="p-2">{i.start} - {i.end}</td><td className="p-2">{formatDb(i.leq)}</td><td className="p-2">{formatDb(i.max)}</td><td className="p-2">{i.count}</td><td className="p-2">{coverageLabel(i)}</td></tr>)}</tbody></table></div>
        <p className="text-xs text-slate-500">Média energética das amostras com pesos iguais. Não equivale a Leq contínuo certificado. O relatório mantém os filtros de origem, dispositivo e sensor.</p>
        <button disabled={generating || dayLoading || monthLoading} onClick={generate} className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-40">{generating ? 'Gerando documento…' : 'Gerar prévia do PDF'}</button>
      </section>}
      {pdf && <section className="space-y-3"><div className="flex flex-wrap gap-3"><a download={pdf.filename} href={pdf.url} className="rounded-lg bg-blue-600 text-white px-4 py-2">Baixar PDF</a><button onClick={() => { try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); } catch { setError('Use o botão de impressão do visualizador PDF ou baixe o documento para imprimir.'); } }} className="border rounded-lg px-4 py-2">Imprimir documento</button><a href={pdf.url} target="_blank" rel="noreferrer" className="border rounded-lg px-4 py-2">Abrir PDF</a></div><iframe ref={frame} title="Prévia do relatório de auditoria" src={pdf.url} className="w-full h-[650px] border rounded-xl" /><p className="text-xs text-slate-500">A prévia e o download usam o mesmo PDF. O identificador não possui assinatura digital nem registro permanente no banco.</p></section>}
    </div>
  </div>;
}
