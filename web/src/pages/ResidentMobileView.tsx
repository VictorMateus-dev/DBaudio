import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  Plus, 
  AlertTriangle, 
  Activity, 
  History, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  VolumeX, 
  ChevronRight,
  Wifi,
  Smartphone,
  Info,
  Building2,
  Clock,
  Sparkles,
  LogOut
} from 'lucide-react';
import { Apartment, Alert, Occurrence } from '../types/database.types';
import { DataService, localStore } from '../lib/dataService';
import { useAuth } from '../contexts/AuthContext';

interface ResidentMobileViewProps {
  apartment?: Apartment | null;
  alerts: Alert[];
  occurrences: Occurrence[];
  onRefresh: () => void;
}

export const ResidentMobileView: React.FC<ResidentMobileViewProps> = ({
  apartment,
  alerts,
  occurrences,
  onRefresh,
}) => {
  const { user, switchRole, refreshProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'occurrences' | 'profile' | 'privacy'>('home');
  const [activeModalAlert, setActiveModalAlert] = useState<Alert | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);

  // Form states para nova ocorrência
  const [newType, setNewType] = useState('Música Alta / Som Excessivo');
  const [newLocation, setNewLocation] = useState('Apartamento 202');
  const [newDesc, setNewDesc] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  // Detecta alerta crítico recente não lido e abre modal automaticamente
  useEffect(() => {
    const unreadCritical = alerts.find(a => a.severity === 'critical' && !a.read);
    if (unreadCritical && !activeModalAlert) {
      setActiveModalAlert(unreadCritical);
    }
  }, [alerts]);

  // Unidade efetiva: caso apartment seja nulo, sintetiza com base nos dados do usuário alocado
  const effectiveApt: Apartment = apartment || {
    id: user?.apartment_id || 'unassigned',
    building_id: '00000000-0000-0000-0000-000000000002',
    number: user?.apartment_number || 'Sua Unidade',
    floor: 1,
    current_db: 42.0,
    status: 'normal',
    peak_db: 45.0,
    avg_db: 42.0,
    custom_day_threshold_db: 70,
    custom_night_threshold_db: 60,
    custom_critical_threshold_db: 80,
    created_at: user?.created_at || new Date().toISOString(),
  };

  const currentDb = effectiveApt.current_db || 48.0;
  const status = effectiveApt.status || 'normal';

  const handleDismissAlert = () => {
    if (activeModalAlert) {
      DataService.markAlertAsRead(activeModalAlert.id);
    }
    setActiveModalAlert(null);
    setShowInstructions(false);
    onRefresh();
  };

  const handleCreateOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const newOcc: Occurrence = {
      id: `occ-${Date.now()}`,
      condominium_id: user?.condominium_id || '00000000-0000-0000-0000-000000000001',
      reporter_id: isAnonymous ? undefined : user?.id,
      apartment_id: effectiveApt.id,
      type: newType,
      location: newLocation,
      description: newDesc.trim(),
      occurred_at: new Date().toISOString(),
      status: 'aberta',
      priority: 'media',
      anonymous: isAnonymous,
      reporter_name: isAnonymous ? 'Morador Anônimo' : (user?.full_name || 'Morador'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStore.occurrences.unshift(newOcc);
    localStore.notify();
    setNewDesc('');
    setCreatedSuccess(true);
    setTimeout(() => {
      setCreatedSuccess(false);
      setActiveTab('occurrences');
    }, 1500);
  };

  // TELA DE ESPERA: Quando o morador confirmou e-mail mas ainda não foi alocado a um apartamento
  if (!user?.apartment_id || user?.status === 'pending') {
    return (
      <div className="min-h-screen bg-space-950 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Atmospheric Glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-violet-600/15 blur-[120px] pointer-events-none" />

        {/* Top Bar */}
        <div className="w-full max-w-md mb-4 flex items-center justify-between text-xs text-slate-400 px-2 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-white font-medium">dBSound • App Morador</span>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 transition text-xs"
            title="Sair da Conta"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>

        {/* Pending Card in Vaultflow Style */}
        <div className="w-full max-w-md vault-card rounded-3xl p-8 text-center space-y-6 shadow-glass-card relative z-10 animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-violet-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-glow-purple">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: Cadastro em Análise / Aguardando Alocação</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">Olá, {user?.full_name || 'Novo Morador'}!</h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
              Sua conta está confirmada no sistema. O síndico do condomínio já pode visualizar sua solicitação e fará a vinculação da sua unidade residencial em instantes.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-space-900/90 border border-white/5 text-left text-xs space-y-2.5">
            <div className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Como funciona a liberação:</span>
            </div>
            <div className="space-y-2 text-slate-400 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <span>O síndico acessa a aba "Moradores" e aloca você ao seu apartamento.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <span>O medidor em decibéis (dB SPL), histórico e ocorrências abrem automaticamente aqui.</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={async () => { await refreshProfile(); onRefresh(); }}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-xs shadow-glow-purple transition flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span>Verificar se Já Fui Alocado</span>
            </button>
            <button
              onClick={() => logout()}
              className="w-full py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 text-xs font-medium transition"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-950 p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Top Banner with View Switcher */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between text-xs text-slate-400 px-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-white font-medium">App Morador (Apto {effectiveApt.number})</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:text-white transition flex items-center gap-1 text-[11px]"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isPhoneFrame ? 'Expandir' : 'Moldura'}</span>
          </button>

          {/* Botão de retorno visível APENAS para administradores em modo teste */}
          {user?.role === 'admin' && (
            <button
              onClick={() => switchRole('admin')}
              className="px-2.5 py-1 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-500 transition text-[11px]"
            >
              Voltar ao Síndico
            </button>
          )}

          <button
            onClick={() => logout()}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
            title="Sair da Conta"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Smartphone Container */}
      <div className={`w-full max-w-md bg-slate-900 border ${
        isPhoneFrame ? 'border-slate-800 rounded-[36px] shadow-2xl p-4 ring-8 ring-slate-950' : 'border-transparent rounded-2xl p-2'
      } relative overflow-hidden flex flex-col min-h-[720px]`}>
        
        {/* Smartphone Speaker Notch */}
        {isPhoneFrame && (
          <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-3 flex items-center justify-center">
            <div className="w-8 h-1 bg-slate-800 rounded-full"></div>
          </div>
        )}

        {/* App Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4 px-2">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Olá, {user?.full_name || 'Morador'}</h2>
            <p className="text-xs text-slate-400">Meu apartamento: <strong className="text-violet-400 font-mono">{effectiveApt.number}</strong> • Bloco Principal</p>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-800 px-2.5 py-1 rounded-full text-[11px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>ESP32 Online</span>
          </div>
        </div>

        {/* Content Screens */}
        <div className="flex-1 overflow-y-auto px-1 pb-16 space-y-4">
          {activeTab === 'home' && (
            <div className="space-y-4">
              {/* Circular Gauge Card */}
              <div className={`p-6 rounded-2xl border text-center transition-all ${
                status === 'critical'
                  ? 'bg-red-950/20 border-red-500 critical-pulse'
                  : status === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/80'
                  : 'bg-slate-950/60 border-slate-800'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-4">
                  Nível Acústico em Tempo Real
                </span>

                <div className="relative w-40 h-40 mx-auto rounded-full bg-slate-900 border-4 border-slate-800 flex flex-col items-center justify-center shadow-inner">
                  <span className={`text-4xl font-black font-mono tracking-tight ${
                    status === 'critical' ? 'text-red-400' : status === 'warning' ? 'text-amber-400' : 'text-white'
                  }`}>
                    {currentDb.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold mt-0.5">dB SPL</span>
                </div>

                <div className="mt-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    status === 'critical' ? 'bg-red-500/20 text-red-400' :
                    status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {status === 'critical' ? '🔴 Ruído Elevado' : status === 'warning' ? '🟡 Atenção' : '🟢 Nível Normal'}
                  </span>
                </div>
              </div>

              {/* 24h Metrics Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs">
                  <span className="text-slate-400 block mb-1">Média 24h</span>
                  <span className="text-lg font-bold text-white font-mono">{effectiveApt.avg_db?.toFixed(1) || '46.5'} dB</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs">
                  <span className="text-slate-400 block mb-1">Último Pico</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">{effectiveApt.peak_db?.toFixed(1) || '68.2'} dB</span>
                </div>
              </div>

              {/* Quick Button: Criar Ocorrência */}
              <button
                onClick={() => setActiveTab('occurrences')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nova Ocorrência</span>
              </button>

              {/* Recent Alerts List */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-300 block">Alertas Recentes da Unidade</span>
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">Nenhum ruído anômalo registrado.</p>
                ) : (
                  alerts.slice(0, 2).map(a => (
                    <div key={a.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
                      <div className="flex justify-between font-bold text-white mb-1">
                        <span className={a.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}>{a.title}</span>
                        <span className="text-[10px] text-slate-500">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{a.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-white block">Histórico de Ruído da Unidade {effectiveApt.number}</span>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
                <div className="flex justify-between text-slate-400">
                  <span>Pico Máximo Registrado</span>
                  <strong className="text-amber-400 font-mono">{effectiveApt.peak_db?.toFixed(1) || '84.5'} dB</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Média das últimas 24h</span>
                  <strong className="text-blue-400 font-mono">{effectiveApt.avg_db?.toFixed(1) || '46.5'} dB</strong>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Episódios Gravados</span>
                {[
                  { pos: 'Sala Principal', db: 84.5, time: 'Hoje, 22:45', dur: '18s', sev: 'critical' },
                  { pos: 'Cozinha', db: 72.0, time: 'Hoje, 19:12', dur: '12s', sev: 'warning' },
                  { pos: 'Quarto Casal', db: 55.0, time: 'Ontem, 16:30', dur: '8s', sev: 'normal' },
                ].map((ev, i) => (
                  <div key={i} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
                    <div className="flex justify-between font-bold text-white mb-1">
                      <span>{ev.pos}</span>
                      <span className={ev.sev === 'critical' ? 'text-red-400' : 'text-amber-400'}>{ev.db} dB</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Duração: {ev.dur}</span>
                      <span>{ev.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'occurrences' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-white block">Registrar Ocorrência</span>
                {createdSuccess && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Relato enviado ao síndico com sucesso!</span>
                  </div>
                )}
                <form onSubmit={handleCreateOccurrence} className="space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Tipo</label>
                    <select
                      value={newType}
                      onChange={e => setNewType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    >
                      <option value="Música Alta / Som Excessivo">Música Alta / Som Excessivo</option>
                      <option value="Reforma Fora do Horário">Reforma Fora do Horário</option>
                      <option value="Festas e Gritos">Festas e Gritos</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Local / Unidade</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={e => setNewLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Descrição</label>
                    <textarea
                      rows={3}
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="Descreva o barulho observado..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white resize-none"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="anonMob"
                      checked={isAnonymous}
                      onChange={e => setIsAnonymous(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-800 text-blue-600"
                    />
                    <label htmlFor="anonMob" className="text-slate-300 text-[11px]">Enviar como anônimo</label>
                  </div>

                  <div className="p-2.5 bg-blue-950/20 border border-blue-800/30 rounded-lg text-[10px] text-blue-300">
                    🔒 Esta ocorrência utiliza dados quantitativos de ruído. O sistema não grava ou armazena áudio.
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-xs transition"
                  >
                    Confirmar Envio
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-2 text-xl font-bold shadow-glow-purple">
                  {(user?.full_name || 'MO').slice(0, 2).toUpperCase()}
                </div>
                <h3 className="font-bold text-white text-base">{user?.full_name || 'Morador'}</h3>
                <p className="text-slate-400">Unidade {effectiveApt.number} • Bloco Principal</p>
                <p className="text-slate-500 text-[11px]">{user?.email || 'morador@dbsound.com'}</p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                <button
                  onClick={() => setActiveTab('privacy')}
                  className="w-full text-left py-2 flex items-center justify-between text-slate-300 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Termos de Privacidade (LGPD)
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <div className="h-px bg-white/5 my-1" />

                <button
                  onClick={() => logout()}
                  className="w-full text-left py-2 flex items-center justify-between text-red-400 hover:text-red-300"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Sair da Conta
                  </span>
                  <ChevronRight className="w-4 h-4 text-red-400/50" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3 text-xs">
              <button
                onClick={() => setActiveTab('profile')}
                className="text-blue-400 text-xs mb-1 block"
              >
                ← Voltar para Perfil
              </button>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Sem Gravação de Áudio ou Voz</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  O hardware do dBSound realiza processamento de sinais diretamente na memória volátil do microcontrolador ESP32.
                  Nenhum arquivo de voz é gravado ou transmitido. Apenas telemetria quantitativa em dB SPL é armazenada.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-slate-950 border-t border-slate-800/80 flex items-center justify-around px-2 z-20">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center text-[10px] ${
              activeTab === 'home' ? 'text-blue-400 font-bold' : 'text-slate-500'
            }`}
          >
            <Activity className="w-4 h-4 mb-0.5" />
            <span>Início</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center text-[10px] ${
              activeTab === 'history' ? 'text-blue-400 font-bold' : 'text-slate-500'
            }`}
          >
            <History className="w-4 h-4 mb-0.5" />
            <span>Histórico</span>
          </button>
          <button
            onClick={() => setActiveTab('occurrences')}
            className={`flex flex-col items-center text-[10px] ${
              activeTab === 'occurrences' ? 'text-blue-400 font-bold' : 'text-slate-500'
            }`}
          >
            <AlertTriangle className="w-4 h-4 mb-0.5" />
            <span>Ocorrências</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center text-[10px] ${
              activeTab === 'profile' || activeTab === 'privacy' ? 'text-blue-400 font-bold' : 'text-slate-500'
            }`}
          >
            <User className="w-4 h-4 mb-0.5" />
            <span>Perfil</span>
          </button>
        </div>

        {/* Modal de Alerta Crítico (Exato Requisito 23) */}
        {activeModalAlert && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border-2 border-red-500 rounded-3xl p-6 text-center space-y-4 shadow-2xl max-w-xs w-full">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-lg font-black text-red-500 tracking-wider">ALERTA!!</h4>
                <p className="text-xs font-bold text-white uppercase">Ruído Alto Detectado</p>
              </div>

              <div className="bg-slate-950 border border-red-500/30 rounded-xl py-3">
                <span className="text-3xl font-black text-red-400 font-mono">{currentDb.toFixed(1)} dB</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Nível sonoro acima do limite configurado detectado no seu apartamento.
              </p>

              {showInstructions && (
                <div className="p-3 bg-slate-950 rounded-xl text-left text-[11px] text-slate-400 space-y-1">
                  <span className="text-white font-bold block">Orientações de Boa Convivência:</span>
                  <p>• Diminua o volume de televisores e instrumentos.</p>
                  <p>• Feche portas e janelas para reduzir a reverberação.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleDismissAlert}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
                >
                  Ignorar
                </button>
                <button
                  onClick={() => {
                    if (!showInstructions) setShowInstructions(true);
                    else handleDismissAlert();
                  }}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >
                  {showInstructions ? 'Entendido' : 'Baixar som'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
