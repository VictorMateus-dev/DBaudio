import React, { useState } from 'react';
import { Apartment, Device, Sensor, Occurrence, Alert } from '../types/database.types';
import { NoiseLevelBadge } from '../components/NoiseLevelBadge';
import { NoiseChart } from '../components/NoiseChart';
import { 
  ArrowLeft, 
  Cpu, 
  Activity, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Info,
  Sliders,
  Volume2,
  MessageSquare,
  Send,
  X,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { DataService } from '../lib/dataService';
import { useAuth } from '../contexts/AuthContext';

interface ApartmentDetailPageProps {
  apartment: Apartment;
  device?: Device;
  sensors: Sensor[];
  occurrences: Occurrence[];
  alerts: Alert[];
  onBack: () => void;
  onOpenSimulator: (aptId: string) => void;
}

export const ApartmentDetailPage: React.FC<ApartmentDetailPageProps> = ({
  apartment,
  device,
  sensors,
  occurrences,
  alerts,
  onBack,
  onOpenSimulator,
}) => {
  const { user } = useAuth();
  const [selectedSensorChannel, setSelectedSensorChannel] = useState<number>(1);

  const [isPreventiveModalOpen, setIsPreventiveModalOpen] = useState(false);
  const [preventiveSubject, setPreventiveSubject] = useState(`Aviso Preventivo de Ruído • Apto ${apartment.number}`);
  const [preventiveMessage, setPreventiveMessage] = useState(
    `Olá morador do Apto ${apartment.number}! Nossos sensores acústicos registraram leituras contínuas de ${apartment.current_db?.toFixed(1) || '70.0'} dB na sua unidade. Solicitamos gentilmente a verificação do volume para preservação da convivência condominial.`
  );
  const [isSendingPreventive, setIsSendingPreventive] = useState(false);
  const [preventiveSuccessMsg, setPreventiveSuccessMsg] = useState<string | null>(null);

  const handleSendPreventive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preventiveMessage.trim() || isSendingPreventive) return;

    setIsSendingPreventive(true);
    try {
      await DataService.createConversation({
        condominium_id: user?.condominium_id || '00000000-0000-0000-0000-000000000001',
        apartment_id: apartment.id,
        type: 'preventivo',
        subject: preventiveSubject.trim() || `Contato Preventivo • Apto ${apartment.number}`,
        initial_message: preventiveMessage.trim(),
      });

      setPreventiveSuccessMsg(`Conversa preventiva iniciada com sucesso com o Apto ${apartment.number}! Notificação enviada.`);
      setTimeout(() => setPreventiveSuccessMsg(null), 5000);
      setIsPreventiveModalOpen(false);
    } finally {
      setIsSendingPreventive(false);
    }
  };

  const currentDb = apartment.current_db || 45.0;
  const sensorReadings: Record<number, number> = {
    1: currentDb,
    2: Math.max(35, currentDb - 4.2),
    3: Math.max(35, currentDb - 7.5),
  };

  const aptOccurrences = occurrences.filter(
    o => o.apartment_id === apartment.id || o.location.includes(apartment.number)
  );

  const aptAlerts = alerts.filter(a => a.apartment_id === apartment.id);

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition group w-fit"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
          <span>Voltar para Planta</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPreventiveModalOpen(true)}
            className="flex items-center space-x-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Contatar Morador (Preventivo)</span>
          </button>

          <button
            onClick={() => onOpenSimulator(apartment.id)}
            className="flex items-center space-x-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simular Ruído Nesta Unidade</span>
          </button>
        </div>
      </div>

      
      {preventiveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{preventiveSuccessMsg}</span>
        </div>
      )}

      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-black text-white font-mono tracking-tight">
                Apartamento {apartment.number}
              </h1>
              <NoiseLevelBadge status={apartment.status} decibel={apartment.current_db} size="lg" />
            </div>
            <p className="text-sm text-slate-400">
              Bloco A • {apartment.floor || 1}º Andar • Unidade Residencial
            </p>
          </div>

          
          <div className="flex items-center space-x-4 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <div className="text-center px-4">
              <span className="text-[11px] text-slate-400 block uppercase font-bold">Nível Atual</span>
              <span className="text-2xl font-black text-white font-mono">{currentDb.toFixed(1)} <span className="text-xs text-slate-400">dB</span></span>
            </div>
            <div className="w-px h-8 bg-slate-700"></div>
            <div className="text-center px-4">
              <span className="text-[11px] text-slate-400 block uppercase font-bold">Pico Registrado</span>
              <span className="text-2xl font-black text-amber-400 font-mono">{apartment.peak_db?.toFixed(1) || '--'} <span className="text-xs text-slate-400">dB</span></span>
            </div>
            <div className="w-px h-8 bg-slate-700"></div>
            <div className="text-center px-4">
              <span className="text-[11px] text-slate-400 block uppercase font-bold">Média 24h</span>
              <span className="text-2xl font-black text-blue-400 font-mono">{apartment.avg_db?.toFixed(1) || '46.0'} <span className="text-xs text-slate-400">dB</span></span>
            </div>
          </div>
        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Hardware ESP32 Associado</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Device UID</span>
              <span className="font-mono text-white">{device?.device_uid || 'ESP32-APT-' + apartment.number}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Status</span>
              <span className={`font-semibold capitalize ${
                apartment.status === 'offline' ? 'text-slate-500' : 'text-emerald-400'
              }`}>
                {apartment.status === 'offline' ? 'Offline' : 'Online / Conectado'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Firmware</span>
              <span className="font-mono text-slate-300">{device?.firmware_version || '1.2.0'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Último Heartbeat</span>
              <span className="text-slate-300">Há poucos segundos</span>
            </div>
          </div>
        </div>

        
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-white">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Canais dos Sensores MAX9814</span>
            </div>
            <span className="text-xs text-slate-500">3 canais calibrados</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { channel: 1, name: 'Sensor 1 — Sala', pos: 'Sala Principal' },
              { channel: 2, name: 'Sensor 2 — Quarto', pos: 'Quarto Casal' },
              { channel: 3, name: 'Sensor 3 — Cozinha', pos: 'Cozinha / Área' },
            ].map(s => {
              const val = sensorReadings[s.channel];
              const isSelected = selectedSensorChannel === s.channel;
              return (
                <div
                  key={s.channel}
                  onClick={() => setSelectedSensorChannel(s.channel)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    {s.pos}
                  </span>
                  <div className="flex items-baseline space-x-1 mb-2">
                    <span className="text-2xl font-black text-white font-mono">{val.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">dB</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Canal {s.channel} Ativo</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      
      <NoiseChart
        data={[
          { time: '17:00', decibel: Math.max(35, currentDb - 8) },
          { time: '18:00', decibel: Math.max(35, currentDb - 4) },
          { time: '19:00', decibel: Math.max(35, currentDb - 2) },
          { time: '20:00', decibel: currentDb },
          { time: '21:00', decibel: Math.max(35, currentDb - 5) },
          { time: '22:00', decibel: currentDb },
        ]}
      />

      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Alertas Emitidos para esta Unidade ({aptAlerts.length})
          </h3>
          {aptAlerts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Nenhum alerta recente para esta unidade.</p>
          ) : (
            <div className="space-y-2.5">
              {aptAlerts.map(a => (
                <div key={a.id} className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 text-xs">
                  <div className="flex justify-between font-semibold text-white mb-1">
                    <span>{a.title}</span>
                    <span className="text-[10px] text-slate-400">{new Date(a.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Ocorrências Vinculadas ({aptOccurrences.length})
          </h3>
          {aptOccurrences.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Nenhuma ocorrência registrada para esta unidade.</p>
          ) : (
            <div className="space-y-2.5">
              {aptOccurrences.map(o => (
                <div key={o.id} className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 text-xs">
                  <div className="flex justify-between font-semibold text-white mb-1">
                    <span>{o.type}</span>
                    <span className="text-[10px] uppercase font-bold text-amber-400">{o.status}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mb-2">{o.description}</p>
                  <span className="text-[10px] text-slate-500">{new Date(o.occurred_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      
      
      
      {isPreventiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="vault-card rounded-3xl p-6 w-full max-w-lg space-y-4 border border-violet-500/30 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Contato Preventivo • Apto {apartment.number}</h3>
                  <p className="text-[11px] text-slate-400">Canal direto via telemetria acústica</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreventiveModalOpen(false)}
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
              <span className="text-slate-400">Nível sonoro atual medido:</span>
              <span className="font-mono font-bold text-amber-400">
                {currentDb.toFixed(1)} dB SPL
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
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Modelos de Mensagem:</span>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  {[
                    'Solicitamos atenção ao volume de aparelhos sonoros conforme convenção.',
                    'Detectamos ruído persistente nesta unidade no monitoramento predial. Favor verificar.',
                    'Lembramos que após às 22h vigora o horário de silêncio rigoroso.'
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreventiveMessage(`Olá morador do Apto ${apartment.number}! ${tpl} Agradecemos a compreensão e colaboração.`)}
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
                  onClick={() => setIsPreventiveModalOpen(false)}
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
