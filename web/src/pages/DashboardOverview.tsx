import React, { useState } from 'react';
import { StatCard } from '../components/StatCard';
import { FloorPlanGrid } from '../components/FloorPlanGrid';
import { NoiseChart } from '../components/NoiseChart';
import { Apartment, Alert, Occurrence, Device } from '../types/database.types';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  VolumeX, 
  Flame, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  MessageSquare,
  X,
  ShieldCheck,
  Send,
  Info
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';
import { DataService } from '../lib/dataService';
import { useAuth } from '../contexts/AuthContext';

interface DashboardOverviewProps {
  apartments: Apartment[];
  devices: Device[];
  alerts: Alert[];
  occurrences: Occurrence[];
  onNavigateTab: (tab: NavTab) => void;
  onSelectApartment: (apartment: Apartment) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  apartments,
  devices,
  alerts,
  occurrences,
  onNavigateTab,
  onSelectApartment,
}) => {
  const { user } = useAuth();
  const onlineDevicesCount = devices.filter(d => d.status === 'online').length;
  const offlineDevicesCount = devices.filter(d => d.status === 'offline').length;
  const openOccurrencesCount = occurrences.filter(o => o.status === 'aberta' || o.status === 'em análise').length;
  const criticalEventsCount = apartments.filter(a => a.status === 'critical').length;
  
  const highestPeak = Math.max(...apartments.map(a => a.peak_db || 0), 0);

  const [preventiveModalApartment, setPreventiveModalApartment] = useState<Apartment | null>(null);
  const [preventiveSubject, setPreventiveSubject] = useState('');
  const [preventiveMessage, setPreventiveMessage] = useState('');
  const [isSendingPreventive, setIsSendingPreventive] = useState(false);
  const [preventiveSuccessMsg, setPreventiveSuccessMsg] = useState<string | null>(null);

  const handleOpenPreventiveModal = (apt: Apartment) => {
    setPreventiveModalApartment(apt);
    setPreventiveSubject(`Aviso Preventivo de Ruído • Apto ${apt.number}`);
    setPreventiveMessage(
      `Olá morador do Apto ${apt.number}! Nossos sensores acústicos registraram leituras contínuas de ${apt.current_db?.toFixed(1) || '70.0'} dB na sua unidade. Solicitamos gentilmente a verificação do volume de aparelhos de som, TV ou ruídos de impacto para preservação da boa convivência.`
    );
  };

  const handleSendPreventive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preventiveModalApartment || !preventiveMessage.trim() || isSendingPreventive) return;

    setIsSendingPreventive(true);
    try {
      await DataService.createConversation({
        condominium_id: user?.condominium_id || '00000000-0000-0000-0000-000000000001',
        apartment_id: preventiveModalApartment.id,
        type: 'preventivo',
        subject: preventiveSubject.trim() || `Contato Preventivo • Apto ${preventiveModalApartment.number}`,
        initial_message: preventiveMessage.trim(),
      });

      setPreventiveSuccessMsg(`Conversa preventiva iniciada com sucesso com o Apto ${preventiveModalApartment.number}! Notificação enviada para a Central de Mensagens do morador.`);
      setTimeout(() => setPreventiveSuccessMsg(null), 5000);
      setPreventiveModalApartment(null);
    } finally {
      setIsSendingPreventive(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Painel de Monitoramento Síndico</h1>
          <p className="text-sm text-slate-400">
            Visão consolidada em tempo real da acústica predial e ocorrências condominiais.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs shadow-lg shadow-amber-500/20 transition"
          >
            <span>Abrir Simulador de Ruído</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      
      {preventiveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{preventiveSuccessMsg}</span>
        </div>
      )}

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Apartamentos"
          value={apartments.length}
          subtitle="9 monitorados (Bloco A)"
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Dispositivos Online"
          value={onlineDevicesCount}
          subtitle="ESP32 transmitindo"
          icon={Wifi}
          color="emerald"
        />
        <StatCard
          title="Dispositivos Offline"
          value={offlineDevicesCount}
          subtitle="Sem sinal recente"
          icon={WifiOff}
          color={offlineDevicesCount > 0 ? 'slate' : 'emerald'}
        />
        <StatCard
          title="Ocorrências Abertas"
          value={openOccurrencesCount}
          subtitle="Requerem despacho"
          icon={AlertCircle}
          color={openOccurrencesCount > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Alertas Críticos"
          value={criticalEventsCount}
          subtitle="Neste momento"
          icon={Flame}
          color={criticalEventsCount > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          title="Maior Pico Hoje"
          value={`${highestPeak.toFixed(1)} dB`}
          subtitle="Registrado no Bloco A"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Planta dos Apartamentos</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h2>
            <button
              onClick={() => onNavigateTab('floorplan')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              Ver mapa expandido <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <FloorPlanGrid
            apartments={apartments}
            onSelectApartment={onSelectApartment}
            onPreventiveContact={handleOpenPreventiveModal}
          />

          <NoiseChart
            data={[
              { time: '18:00', decibel: 48 },
              { time: '19:00', decibel: 55 },
              { time: '20:00', decibel: 72 },
              { time: '21:00', decibel: 68 },
              { time: '22:00', decibel: 84 },
              { time: '23:00', decibel: 52 },
              { time: '00:00', decibel: 44 },
            ]}
          />
        </div>

        
        <div className="space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                Alertas Recentes
              </h3>
              <span className="text-xs text-slate-500">{alerts.length} registros</span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nenhum ruído anômalo nas últimas horas.</p>
              ) : (
                alerts.map(alt => {
                  const targetApt = apartments.find(a => a.id === alt.apartment_id || a.number === alt.apartment_number);
                  return (
                    <div key={alt.id} className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1">
                          {alt.severity === 'critical' ? '🔴' : '🟡'} Apto {alt.apartment_number || '101'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(alt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300">{alt.message}</p>

                      {targetApt && (
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-[10px] text-slate-400">Telemetria elevada</span>
                          <button
                            type="button"
                            onClick={() => handleOpenPreventiveModal(targetApt)}
                            className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 bg-violet-600/10 hover:bg-violet-600/25 px-2 py-0.5 rounded border border-violet-500/20 transition"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Contatar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Últimas Ocorrências
              </h3>
              <button
                onClick={() => onNavigateTab('occurrences')}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Gerenciar
              </button>
            </div>

            <div className="space-y-3">
              {occurrences.slice(0, 3).map(occ => (
                <div key={occ.id} className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">{occ.type}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      occ.status === 'aberta' ? 'bg-amber-500/20 text-amber-400' :
                      occ.status === 'em análise' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {occ.status}
                    </span>
                  </div>
                  <p className="text-slate-400 line-clamp-2 text-[11px] mb-2">{occ.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{occ.location}</span>
                    <span>{new Date(occ.occurred_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      
      
      
      {preventiveModalApartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="vault-card rounded-3xl p-6 w-full max-w-lg space-y-4 border border-violet-500/30 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Contato Preventivo • Apto {preventiveModalApartment.number}</h3>
                  <p className="text-[11px] text-slate-400">Comunicação direta baseada na telemetria acústica</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreventiveModalApartment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            
            <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/20 text-[11px] text-violet-300 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                Diálogo Educativo & Amigável:
              </span>
              <p>
                Esta mensagem será enviada diretamente à <strong>Central de Mensagens</strong> do morador. <strong>NÃO cria ocorrência nem registro punitivo</strong> no histórico do condomínio.
              </p>
            </div>

            
            <div className="p-3 rounded-xl bg-space-950 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400">Leitura acústica atual da unidade:</span>
              <span className="font-mono font-bold text-amber-400">
                {preventiveModalApartment.current_db?.toFixed(1) || '74.5'} dB SPL
              </span>
            </div>

            <form onSubmit={handleSendPreventive} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Assunto da Mensagem:</label>
                <input
                  type="text"
                  value={preventiveSubject}
                  onChange={e => setPreventiveSubject(e.target.value)}
                  className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Mensagem Inicial:</label>
                <textarea
                  rows={4}
                  value={preventiveMessage}
                  onChange={e => setPreventiveMessage(e.target.value)}
                  placeholder="Escreva a mensagem de orientação para o morador..."
                  className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  required
                />
              </div>

              
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Modelos Rápidos:</span>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  {[
                    'Solicitamos atenção ao volume de aparelhos sonoros conforme convenção.',
                    'Detectamos ruído persistente nesta unidade no monitoramento predial. Favor verificar.',
                    'Lembramos que após às 22h vigora o horário de silêncio rigoroso.'
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreventiveMessage(`Olá morador do Apto ${preventiveModalApartment.number}! ${tpl} Agradecemos a compreensão e colaboração.`)}
                      className="text-left px-2.5 py-1.5 rounded-lg bg-space-950/80 border border-white/5 hover:border-violet-500/30 text-slate-300 hover:text-white transition"
                    >
                      • {tpl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPreventiveModalApartment(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingPreventive || !preventiveMessage.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 text-white font-bold shadow-glow-purple transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingPreventive ? 'Enviando...' : 'Iniciar Conversa Preventiva'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
