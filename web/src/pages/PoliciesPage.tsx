import { SessionRequiredError } from '../lib/sessionError';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import type { NoisePolicy } from '../types/database.types';
import { DataService } from '../lib/dataService';
import { activePolicy, validatePolicies } from '../lib/noisePolicy';
import { useAuth } from '../contexts/AuthContext';

export const PoliciesPage: React.FC<{ policies: NoisePolicy[]; onRefresh: () => void; loadError?: string }> = ({ policies, onRefresh, loadError }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [needsLogin, setNeedsLogin] = useState(false);
  const defaults = (): NoisePolicy[] => [
    { name: 'Período diurno', start_time: '07:00', end_time: '22:00', warning_threshold_db: 70, critical_threshold_db: 80 },
    { name: 'Período noturno', start_time: '22:00', end_time: '07:00', warning_threshold_db: 60, critical_threshold_db: 70 },
  ].map(p => ({ ...p, id: crypto.randomUUID(), condominium_id: user?.condominium_id || '', threshold_db: p.warning_threshold_db, min_duration_seconds: 3, cooldown_seconds: 60, enabled: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
  const [editable, setEditable] = useState<NoisePolicy[]>(() => policies.length ? policies.map(p => ({ ...p })) : defaults());
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  useEffect(() => { if (!dirty && policies.length) setEditable(policies.map(p => ({ ...p }))); }, [JSON.stringify(policies), dirty]);
  const change = (id: string, field: keyof NoisePolicy, value: string | number | boolean) => {
    setDirty(true); setSuccess(''); setError('');
    setEditable(previous => previous.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setNeedsLogin(false);
    if (loadError) { setError(loadError); return; }
    const validation = validatePolicies(editable);
    if (validation) { setError(validation); return; }
    setSaving(true);
    try {
      await DataService.savePolicies(editable);
      setDirty(false); setSuccess('Políticas salvas. Os modais do síndico e dos moradores usarão os limites de cada período.'); onRefresh();
    } catch (e) { setNeedsLogin(e instanceof SessionRequiredError); setError(e instanceof Error ? e.message : 'Não foi possível salvar. Tente novamente.'); }
    finally { setSaving(false); }
  };
  const current = activePolicy(policies);
  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900';
  return <form onSubmit={save} className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Políticas de Ruído e Limiares Acústicos</h1><p className="text-sm text-slate-500 mt-2">Defina quando o modal de alerta deve aparecer. Horários de Brasília.</p></div>
      <button disabled={saving || !!loadError} type="submit" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar Alterações'}</button>
    </div>
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <p>Em vigor: {current ? `${current.name} · modal a partir de ${current.critical_threshold_db} dB` : 'limites padrão até salvar a configuração'}.</p>
      <p className="mt-1">O modal exige leituras sucessivas acima ou iguais ao limite durante a duração mínima. Dispensar silencia o episódio até o ruído normalizar. A configuração do modal não cria ocorrências automaticamente.</p>
      {!policies.length && <p className="mt-2 font-semibold">Nenhuma política foi carregada. Revise os períodos sugeridos e salve para configurar este condomínio.</p>}
    </div>
    {loadError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">{loadError} O salvamento ficará indisponível até carregar a configuração existente.</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-800">{error}</p>}
    {needsLogin && <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-white" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}>Entrar novamente no Supabase</button>}
    {success && <p role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">{success}</p>}
    <fieldset disabled={saving} className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {editable.map(p => <section key={p.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700">Nome do período<input aria-label={`Nome ${p.name}`} className={inputClass} value={p.name} onChange={e => change(p.id, 'name', e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm text-slate-700">Início<input required aria-label={`Início ${p.name}`} type="time" className={inputClass} value={p.start_time.slice(0,5)} onChange={e => change(p.id,'start_time',e.target.value)} /></label>
          <label className="text-sm text-slate-700">Fim<input required aria-label={`Fim ${p.name}`} type="time" className={inputClass} value={p.end_time.slice(0,5)} onChange={e => change(p.id,'end_time',e.target.value)} /></label>
        </div>
        <label className="block text-sm text-slate-700">Limite de atenção (dB)<input required aria-label={`Atenção ${p.name}`} type="number" min="30" max="130" step="0.1" className={inputClass} value={p.warning_threshold_db} onChange={e => change(p.id,'warning_threshold_db',e.target.valueAsNumber)} /></label>
        <label className="block text-sm font-bold text-rose-700">Abrir modal a partir de (dB)<input required aria-label={`Limite do modal ${p.name}`} type="number" min="30" max="130" step="0.1" className={inputClass} value={p.critical_threshold_db} onChange={e => change(p.id,'critical_threshold_db',e.target.valueAsNumber)} /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm text-slate-700">Duração mínima (s)<input required aria-label={`Duração ${p.name}`} type="number" min="1" max="300" className={inputClass} value={p.min_duration_seconds} onChange={e => change(p.id,'min_duration_seconds',e.target.valueAsNumber)} /></label>
          <label className="text-sm text-slate-700">Intervalo dos alertas (s)<input required aria-label={`Intervalo ${p.name}`} type="number" min="10" max="3600" className={inputClass} value={p.cooldown_seconds} onChange={e => change(p.id,'cooldown_seconds',e.target.valueAsNumber)} /></label>
        </div>
        <p className="text-xs text-slate-500">O intervalo é usado pelo pipeline de alertas; o modal permanece estável durante o episódio.</p>
      </section>)}
    </fieldset>
    <p className="text-xs text-slate-500">Os períodos devem cobrir as 24 horas sem sobreposição. O período noturno pode atravessar a meia-noite. Alterações só entram em vigor depois de salvar.</p>
  </form>;
};
