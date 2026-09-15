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
  LogOut, 
  FileText, 
  DollarSign, 
  Receipt, 
  QrCode, 
  Copy, 
  Printer, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Send, 
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { Apartment, Alert, Occurrence, SimulatedFine, OccurrenceStatus, Conversation, ConversationMessage } from '../types/database.types';
import { DataService, localStore } from '../lib/dataService';
import { useAuth } from '../contexts/AuthContext';
import { PrintableBoleto } from '../components/PrintableBoleto';

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
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'messages' | 'occurrences' | 'profile' | 'privacy'>('home');
  const [occSubTab, setOccSubTab] = useState<'new' | 'notices' | 'my_reports'>('new');
  const [activeModalAlert, setActiveModalAlert] = useState<Alert | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);

  // Central de Mensagens do Morador
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeMessages, setActiveMessages] = useState<ConversationMessage[]>([]);
  const [residentReplyText, setResidentReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  // Form states para nova ocorrência
  const [newType, setNewType] = useState('Música Alta / Som Excessivo');
  const [targetAptId, setTargetAptId] = useState<string>('');
  const [newLocation, setNewLocation] = useState('Apartamento 202');
  const [newDesc, setNewDesc] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);
  const [isSubmittingOcc, setIsSubmittingOcc] = useState(false);

  // Dados carregados dinamicamente
  const [availableApartments, setAvailableApartments] = useState<Apartment[]>([]);
  const [unitFines, setUnitFines] = useState<SimulatedFine[]>([]);
  const [allOccurrencesList, setAllOccurrencesList] = useState<Occurrence[]>(occurrences);
  const [selectedFineForModal, setSelectedFineForModal] = useState<SimulatedFine | null>(null);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Unidade efetiva: caso apartment seja nulo, sintetiza com base nos dados do usuário alocado
  const effectiveApt: Apartment = apartment || {
    id: user?.apartment_id || 'unassigned',
    building_id: '00000000-0000-0000-0000-000000000002',
    number: user?.apartment_number || 'Sua Unidade',
    floor: 1,
    current_db: 40.0,
    status: 'normal',
    peak_db: 40.0,
    avg_db: 40.0,
    custom_day_threshold_db: 70,
    custom_night_threshold_db: 60,
    custom_critical_threshold_db: 80,
    created_at: user?.created_at || new Date().toISOString(),
  };

  // Carrega lista de apartamentos, multas da unidade e ocorrências atualizadas
  useEffect(() => {
    const fetchData = async () => {
      try {
        const apts = await DataService.getApartments();
        setAvailableApartments(apts);
        if (apts.length > 0 && !targetAptId) {
          const other = apts.find(a => a.id !== effectiveApt.id) || apts[0];
          if (other) {
            setTargetAptId(other.id);
            setNewLocation(`Apartamento ${other.number}`);
          }
        }
        if (effectiveApt.id && effectiveApt.id !== 'unassigned') {
          const fines = await DataService.getFinesByApartment(effectiveApt.id);
          setUnitFines(fines);

          const convs = await DataService.getConversations(effectiveApt.id);
          setConversations(convs);
          const unread = await DataService.getUnreadMessagesCount(effectiveApt.id, false);
          setUnreadMessagesCount(unread);

          if (selectedConversation) {
            const updated = convs.find(c => c.id === selectedConversation.id);
            if (updated) {
              setSelectedConversation(updated);
              const msgs = await DataService.getMessages(updated.id);
              setActiveMessages(msgs);
            }
          }
        }
        const occs = await DataService.getOccurrences();
        setAllOccurrencesList(occs);
      } catch (err) {
        console.warn('Erro ao carregar dados do morador:', err);
      }
    };

    fetchData();
    const unsub = localStore.subscribe(() => {
      fetchData();
    });
    return () => unsub();
  }, [effectiveApt.id, selectedConversation?.id]);

  const handleOpenConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    const msgs = await DataService.getMessages(conv.id);
    setActiveMessages(msgs);
    await DataService.markMessagesAsRead(conv.id, user?.id);
    const unread = await DataService.getUnreadMessagesCount(effectiveApt.id !== 'unassigned' ? effectiveApt.id : undefined, false);
    setUnreadMessagesCount(unread);
  };

  const handleSendResidentReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !residentReplyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      const msg = await DataService.sendMessage({
        conversation_id: selectedConversation.id,
        sender_id: user?.id || 'morador-' + effectiveApt.number,
        sender_name: user?.full_name || `Morador Apto ${effectiveApt.number}`,
        sender_role: 'resident',
        content: residentReplyText.trim(),
      });
      setActiveMessages(prev => [...prev, msg]);
      setResidentReplyText('');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleOpenConversationByOccurrence = async (occ: Occurrence) => {
    let conv = await DataService.getConversationByOccurrenceId(occ.id);
    if (!conv) {
      conv = await DataService.createConversation({
        condominium_id: occ.condominium_id || user?.condominium_id || '00000000-0000-0000-0000-000000000001',
        apartment_id: effectiveApt.id,
        occurrence_id: occ.id,
        type: 'ocorrencia',
        subject: `Ocorrência #${occ.id.slice(0, 8)} • ${occ.type}`,
        initial_message: `Olá síndico! Gostaria de conversar a respeito da notificação da ocorrência de ${occ.type}.`,
      });
    }
    setActiveTab('messages');
    await handleOpenConversation(conv);
  };

  // Detecta alerta crítico recente não lido estritamente desta unidade e abre modal automaticamente
  useEffect(() => {
    const unreadCritical = alerts.find(a => 
      a.apartment_id === effectiveApt.id && 
      a.severity === 'critical' && 
      !a.read
    );
    if (unreadCritical && !activeModalAlert) {
      setActiveModalAlert(unreadCritical);
    }
  }, [alerts, effectiveApt.id]);

  const currentDb = effectiveApt.current_db ?? 40.0;
  const status = effectiveApt.status || 'normal';
  const unitAlerts = alerts.filter(a => a.apartment_id === effectiveApt.id);

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
    if (!newDesc.trim() || isSubmittingOcc) return;

    setIsSubmittingOcc(true);
    try {
      const targetApt = availableApartments.find(a => a.id === targetAptId);
      const targetNumber = targetApt?.number || newLocation.replace(/[^0-9]/g, '') || undefined;
      const targetLocation = targetApt ? `Apartamento ${targetApt.number}` : (newLocation || 'Apartamento');

      await DataService.createOccurrence({
        condominium_id: user?.condominium_id || '00000000-0000-0000-0000-000000000001',
        apartment_id: targetApt?.id || undefined,
        apartment_number: targetNumber,
        location: targetLocation,
        type: newType,
        description: newDesc.trim(),
        anonymous: isAnonymous,
        reporter_id: isAnonymous ? undefined : user?.id,
        reporter_name: isAnonymous ? 'Morador Anônimo' : (user?.full_name || 'Morador'),
        noise_level_db: targetApt?.current_db,
        status: 'aberta',
        priority: 'media',
        occurred_at: new Date().toISOString(),
      });

      setNewDesc('');
      setCreatedSuccess(true);
      setTimeout(() => {
        setCreatedSuccess(false);
        setOccSubTab('my_reports');
      }, 1200);
      onRefresh();
    } catch (err) {
      console.error('Erro ao enviar ocorrência:', err);
    } finally {
      setIsSubmittingOcc(false);
    }
  };

  const handleCopyBarcode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedBarcode(true);
    setTimeout(() => setCopiedBarcode(false), 2000);
  };

  const handleCopyPix = (payload: string) => {
    navigator.clipboard?.writeText(payload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
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
                  <span className="text-lg font-bold text-white font-mono">{effectiveApt.avg_db != null ? effectiveApt.avg_db.toFixed(1) : '40.0'} dB</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs">
                  <span className="text-slate-400 block mb-1">Último Pico</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">{effectiveApt.peak_db != null ? effectiveApt.peak_db.toFixed(1) : '40.0'} dB</span>
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
                {unitAlerts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">Nenhum ruído anômalo registrado nesta unidade.</p>
                ) : (
                  unitAlerts.slice(0, 3).map(a => (
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
                  <strong className="text-amber-400 font-mono">{effectiveApt.peak_db != null ? effectiveApt.peak_db.toFixed(1) : '40.0'} dB</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Média das últimas 24h</span>
                  <strong className="text-blue-400 font-mono">{effectiveApt.avg_db != null ? effectiveApt.avg_db.toFixed(1) : '40.0'} dB</strong>
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

          {activeTab === 'messages' && (
            <div className="space-y-3 text-xs flex flex-col h-full animate-fadeIn">
              {selectedConversation ? (
                /* CHAT VIEW BIDIRECIONAL COM O SÍNDICO */
                <div className="flex flex-col space-y-3">
                  {/* Top Bar of Chat */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedConversation(null)}
                      className="text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <span>← Conversas</span>
                    </button>

                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      selectedConversation.type === 'preventivo'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    }`}>
                      {selectedConversation.type === 'preventivo' ? '🔴 Contato Preventivo' : '🟢 Ocorrência'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-xs">{selectedConversation.subject}</h4>
                    <p className="text-[10px] text-slate-400">Canal com a Administração • Condomínio Inteligente</p>
                  </div>

                  {/* Clarification Callout */}
                  <div className={`p-2.5 rounded-xl text-[10px] leading-relaxed ${
                    selectedConversation.type === 'preventivo'
                      ? 'bg-amber-950/20 border border-amber-500/20 text-amber-300'
                      : 'bg-violet-950/20 border border-violet-500/20 text-violet-300'
                  }`}>
                    {selectedConversation.type === 'preventivo'
                      ? '🛡️ Diálogo educativo baseado na telemetria acústica predial. Esta mensagem não gera denúncia nem penalidade formal no condomínio.'
                      : '⚖️ Comunicação direta referente à ocorrência registrada. O anonimato do denunciante permanece 100% protegido.'}
                  </div>

                  {/* Messages Stream */}
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto p-2.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    {activeMessages.length === 0 ? (
                      <p className="text-center py-6 text-slate-500 text-[11px]">Nenhuma mensagem nesta conversa.</p>
                    ) : (
                      activeMessages.map(msg => {
                        const isMe = msg.sender_role === 'resident';
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-1.5 mb-0.5 text-[9px] text-slate-400">
                              <span className={isMe ? 'text-blue-400 font-semibold' : 'text-violet-400 font-bold'}>
                                {isMe ? 'Você' : 'Síndico Geral'}
                              </span>
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`p-2.5 rounded-2xl text-[11px] max-w-[85%] leading-relaxed ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content || msg.message}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendResidentReply} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={residentReplyText}
                      onChange={e => setResidentReplyText(e.target.value)}
                      placeholder="Responder ao síndico..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply || !residentReplyText.trim()}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSendingReply ? '...' : 'Enviar'}</span>
                    </button>
                  </form>
                </div>
              ) : (
                /* CONVERSATIONS LIST (CENTRAL DE MENSAGENS) */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Central de Mensagens</span>
                      <p className="text-[10px] text-slate-400">Comunicações com a Administração ({effectiveApt.number})</p>
                    </div>
                    {unreadMessagesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                        <span>{unreadMessagesCount} nova(s)</span>
                      </span>
                    )}
                  </div>

                  {conversations.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-2xl space-y-2">
                      <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="font-semibold text-white text-xs">Caixa de entrada vazia</p>
                      <p className="text-[11px] text-slate-500">
                        Quando o síndico entrar em contato preventivamente ou para tratar de uma ocorrência, as mensagens aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {conversations.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => handleOpenConversation(conv)}
                          className={`p-3 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                            conv.unread_count && conv.unread_count > 0
                              ? 'bg-slate-900 border-violet-500/60 shadow-md'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              conv.type === 'preventivo'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                            }`}>
                              {conv.type === 'preventivo' ? '🔴 Síndico — Contato Preventivo' : '🟢 Ocorrência'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(conv.updated_at || conv.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <h5 className="font-bold text-white text-xs mt-1 mb-0.5">{conv.subject}</h5>

                          {conv.last_message && (
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {conv.last_message}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 mt-1 border-t border-white/5">
                            <span className="flex items-center gap-1 text-violet-400 font-medium">
                              <MessageSquare className="w-3 h-3" />
                              <span>Toque para responder ao síndico</span>
                            </span>
                            <ChevronRight className="w-3 h-3 text-slate-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'occurrences' && (
            <div className="space-y-3 text-xs">
              {/* Sub-tabs de Ocorrências */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setOccSubTab('new')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-[11px] transition text-center ${
                    occSubTab === 'new'
                      ? 'bg-blue-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Nova Denúncia
                </button>
                <button
                  type="button"
                  onClick={() => setOccSubTab('notices')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-[11px] transition text-center relative ${
                    occSubTab === 'notices'
                      ? 'bg-blue-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Minha Unidade</span>
                  {(unitFines.filter(f => f.status === 'pendente').length > 0) && (
                    <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white text-[9px] font-bold rounded-full">
                      {unitFines.filter(f => f.status === 'pendente').length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOccSubTab('my_reports')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-[11px] transition text-center ${
                    occSubTab === 'my_reports'
                      ? 'bg-blue-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Meus Relatos
                </button>
              </div>

              {/* Subaba 1: Nova Denúncia */}
              {occSubTab === 'new' && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Registrar Ocorrência / Denúncia</span>
                    <span className="text-[10px] text-slate-400">Proteção de Privacidade Ativa</span>
                  </div>

                  {createdSuccess && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Relato enviado ao síndico com sucesso!</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateOccurrence} className="space-y-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Apartamento Infrator (Alvo do Relato)</label>
                      <select
                        value={targetAptId}
                        onChange={e => {
                          setTargetAptId(e.target.value);
                          const found = availableApartments.find(a => a.id === e.target.value);
                          if (found) setNewLocation(`Apartamento ${found.number}`);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                      >
                        {availableApartments.length === 0 ? (
                          <option value="">Carregando apartamentos...</option>
                        ) : (
                          availableApartments.map(apt => (
                            <option key={apt.id} value={apt.id}>
                              Apartamento {apt.number} (Andar {apt.floor}) {apt.id === effectiveApt.id ? '• Minha Unidade' : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Telemetria Acústica do Alvo */}
                    {(() => {
                      const targetApt = availableApartments.find(a => a.id === targetAptId);
                      if (!targetApt) return null;
                      return (
                        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                            <span>Telemetria atual do alvo:</span>
                          </div>
                          <span className={`font-mono font-bold ${
                            (targetApt.current_db || 0) >= 80 ? 'text-red-400' :
                            (targetApt.current_db || 0) >= 65 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {targetApt.current_db != null ? targetApt.current_db.toFixed(1) : '40.0'} dB SPL
                          </span>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="text-slate-400 block mb-1">Tipo de Perturbação</label>
                      <select
                        value={newType}
                        onChange={e => setNewType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                      >
                        <option value="Música Alta / Som Excessivo">Música Alta / Som Excessivo</option>
                        <option value="Reforma Fora do Horário">Reforma Fora do Horário</option>
                        <option value="Festas e Gritos">Festas e Gritos</option>
                        <option value="Ruído de Impacto / Móveis / Salto">Ruído de Impacto / Móveis / Salto</option>
                        <option value="Latidos Contínuos / Animais">Latidos Contínuos / Animais</option>
                        <option value="Outros Ruídos Perturbadores">Outros Ruídos Perturbadores</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Descrição do Ocorrido</label>
                      <textarea
                        rows={3}
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                        placeholder="Descreva o barulho observado, horário de início e o incômodo gerado..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white resize-none text-xs"
                        required
                      />
                    </div>

                    {/* Card de Denúncia Anônima */}
                    <div 
                      onClick={() => setIsAnonymous(!isAnonymous)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        isAnonymous 
                          ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm' 
                          : 'bg-slate-950/40 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="anonMob"
                            checked={isAnonymous}
                            onChange={e => setIsAnonymous(e.target.checked)}
                            onClick={e => e.stopPropagation()}
                            className="rounded bg-slate-900 border-slate-800 text-emerald-600 focus:ring-0"
                          />
                          <label htmlFor="anonMob" className="text-white font-semibold text-xs cursor-pointer">
                            Denúncia Anônima (100% Protegida)
                          </label>
                        </div>
                        {isAnonymous ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4 text-slate-500" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 pl-6">
                        {isAnonymous 
                          ? '🛡️ Seu nome e apartamento NÃO serão revelados ao síndico nem à unidade denunciada.' 
                          : 'Sua identificação ficará visível apenas para o síndico administrar o caso.'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-blue-950/20 border border-blue-800/30 rounded-lg text-[10px] text-blue-300">
                      🔒 O dBSound não grava nem transmite áudio/voz. Somente telemetria quantitativa de ruído em dB SPL é associada.
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingOcc || !newDesc.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingOcc ? 'Enviando ao Síndico...' : 'Confirmar Envio'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Subaba 2: Notificações & Multas da Minha Unidade */}
              {occSubTab === 'notices' && (
                <div className="space-y-3">
                  {/* Multas Fictícias da Unidade */}
                  {unitFines.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-red-400" />
                          <span>Multas da Unidade {effectiveApt.number}</span>
                        </span>
                        <span className="text-[10px] text-amber-400 font-semibold">Boleto Simulado</span>
                      </div>

                      {unitFines.map(fine => {
                        const isCancelled = fine.status === 'cancelada';
                        const isPaid = fine.status === 'paga';
                        return (
                          <div key={fine.id} className={`p-3 bg-slate-950/80 rounded-xl space-y-2 border ${
                            isCancelled
                              ? 'border-slate-800 opacity-80'
                              : isPaid
                              ? 'border-emerald-500/30'
                              : 'border-red-500/30'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase mb-1 ${
                                  isCancelled
                                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                  <span>{isCancelled ? 'Cobrança Cancelada' : 'Doc. de Cobrança Simulado'}</span>
                                </div>
                                <h4 className="font-bold text-white text-xs">{fine.reason}</h4>
                                <p className="text-[10px] text-slate-400">Vencimento: {new Date(fine.due_date).toLocaleDateString('pt-BR')}</p>
                                {isCancelled && fine.cancellation_reason && (
                                  <p className="text-[10px] text-red-400 italic pt-1">
                                    Motivo do cancelamento: {fine.cancellation_reason}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className={`text-base font-extrabold font-mono ${
                                  isCancelled ? 'text-slate-500 line-through' : isPaid ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  R$ {fine.amount.toFixed(2)}
                                </span>
                                <span className={`block text-[9px] font-bold uppercase ${
                                  isPaid 
                                    ? 'text-emerald-400' 
                                    : isCancelled 
                                    ? 'text-red-400 font-black' 
                                    : 'text-amber-400'
                                }`}>
                                  {isPaid ? 'Liquidada' : isCancelled ? 'CANCELADA' : 'Pendente'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setSelectedFineForModal(fine)}
                                className="py-2 px-2.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 font-semibold text-[10px] flex items-center justify-center gap-1 transition"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Ver Boleto</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const linkedOcc = allOccurrencesList.find(o => o.id === fine.occurrence_id);
                                  if (linkedOcc) {
                                    handleOpenConversationByOccurrence(linkedOcc);
                                  } else {
                                    setActiveTab('messages');
                                  }
                                }}
                                className="py-2 px-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-semibold text-[10px] flex items-center justify-center gap-1 transition"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Falar com Síndico</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Advertências e Notificações Administrativas */}
                  {(() => {
                    const unitNotices = allOccurrencesList.filter(
                      o => o.apartment_id === effectiveApt.id && 
                      ['advertência', 'multa', 'procedente', 'em análise', 'resolvida'].includes(o.status)
                    );

                    if (unitNotices.length === 0 && unitFines.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-400 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                          <p className="font-semibold text-white">Nenhuma notificação ou multa ativa</p>
                          <p className="text-[11px] text-slate-500">
                            Sua unidade ({effectiveApt.number}) está em plena conformidade com as regras de convivência acústica.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-bold text-white block">
                          Notificações da Administração ({unitNotices.length})
                        </span>

                        {unitNotices.map(notif => (
                          <div key={notif.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-bold text-white block">{notif.type}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(notif.occurred_at || notif.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                notif.status === 'multa' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                notif.status === 'advertência' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                notif.status === 'procedente' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}>
                                {notif.status}
                              </span>
                            </div>

                            {/* Detalhes sem exibir o denunciante (garantia de anonimato absoluto) */}
                            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] space-y-1">
                              <span className="text-violet-400 font-semibold block mb-0.5">Parecer da Administração:</span>
                              <p className="text-slate-300">
                                {notif.syndic_notes || 'Ocorrência sob averiguação do síndico. Mantenha os níveis sonoros dentro dos limites permitidos.'}
                              </p>
                              {notif.noise_level_db != null && (
                                <p className="text-[10px] text-slate-400 pt-0.5">
                                  Telemetria registrada pelo sensor: <strong className="text-white font-mono">{notif.noise_level_db} dB SPL</strong>
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenConversationByOccurrence(notif)}
                              className="w-full py-1.5 px-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 font-semibold text-[10px] flex items-center justify-center gap-1.5 transition"
                            >
                              <MessageSquare className="w-3 h-3 text-violet-400" />
                              <span>💬 Conversar com o Síndico sobre este Aviso</span>
                            </button>

                            <span className="text-[10px] text-slate-500 italic block">
                              🔒 A identidade de eventuais denunciantes é rigorosamente protegida.
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Subaba 3: Minhas Denúncias Enviadas */}
              {occSubTab === 'my_reports' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-white block">Histórico de Relatos Enviados por Você</span>
                  {(() => {
                    const myReports = allOccurrencesList.filter(
                      o => o.reporter_id === user?.id || (o.apartment_id !== effectiveApt.id && (!o.reporter_id || o.reporter_name === user?.full_name))
                    );

                    if (myReports.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-400 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                          <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="font-semibold text-white">Nenhum relato registrado</p>
                          <p className="text-[11px] text-slate-500">
                            Quando você registrar barulhos anômalos de outras unidades, o status do acompanhamento aparecerá aqui.
                          </p>
                          <button
                            type="button"
                            onClick={() => setOccSubTab('new')}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold"
                          >
                            Registrar Primeiro Relato
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {myReports.map(rep => (
                          <div key={rep.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-bold text-white block">
                                  Alvo: {rep.location || `Apto ${rep.apartment_number || 'N/A'}`}
                                </span>
                                <span className="text-[10px] text-slate-400 block">{rep.type}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                rep.status === 'multa' ? 'bg-red-500/20 text-red-400' :
                                rep.status === 'advertência' ? 'bg-amber-500/20 text-amber-400' :
                                rep.status === 'procedente' ? 'bg-emerald-500/20 text-emerald-400' :
                                rep.status === 'improcedente' ? 'bg-slate-700 text-slate-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {rep.status}
                              </span>
                            </div>

                            <p className="text-slate-300 text-[11px] line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                              "{rep.description}"
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                {rep.anonymous ? (
                                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                                    <EyeOff className="w-3 h-3" /> Anônima
                                  </span>
                                ) : (
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Identificada
                                  </span>
                                )}
                              </span>
                              <span>{new Date(rep.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>

                            {rep.syndic_notes && (
                              <div className="p-2 rounded-lg bg-violet-950/20 border border-violet-800/30 text-[10px] text-violet-300">
                                <strong className="text-white block mb-0.5">Resposta do Síndico:</strong>
                                {rep.syndic_notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
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
            onClick={() => {
              setActiveTab('messages');
              setSelectedConversation(null);
            }}
            className={`flex flex-col items-center text-[10px] relative ${
              activeTab === 'messages' ? 'text-blue-400 font-bold' : 'text-slate-500'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4 mb-0.5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </div>
            <span>Mensagens</span>
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

        {/* Modal de Visualização de Documento de Cobrança / Boleto SIMULADO */}
        {selectedFineForModal && (
          <PrintableBoleto
            fine={selectedFineForModal}
            onClose={() => setSelectedFineForModal(null)}
          />
        )}

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
