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
  MessageSquare,
  Sun,
  Moon
} from 'lucide-react';
import { Apartment, Alert, Occurrence, SimulatedFine, OccurrenceStatus, Conversation, ConversationMessage } from '../types/database.types';
import { DataService, localStore } from '../lib/dataService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'messages' | 'occurrences' | 'profile' | 'privacy'>('home');
  const [occSubTab, setOccSubTab] = useState<'new' | 'notices' | 'my_reports'>('new');
  const [activeModalAlert, setActiveModalAlert] = useState<Alert | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const selectedConversationRef = React.useRef<Conversation | null>(null);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  const [activeMessages, setActiveMessages] = useState<ConversationMessage[]>([]);
  const [residentReplyText, setResidentReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  const [newType, setNewType] = useState('Música Alta / Som Excessivo');
  const [targetAptId, setTargetAptId] = useState<string>('');
  const [newLocation, setNewLocation] = useState('Apartamento 202');
  const [newDesc, setNewDesc] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);
  const [isSubmittingOcc, setIsSubmittingOcc] = useState(false);

  const [availableApartments, setAvailableApartments] = useState<Apartment[]>([]);
  const [unitFines, setUnitFines] = useState<SimulatedFine[]>([]);
  const [allOccurrencesList, setAllOccurrencesList] = useState<Occurrence[]>(occurrences);
  const [selectedFineForModal, setSelectedFineForModal] = useState<SimulatedFine | null>(null);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

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
    const unsubLocal = localStore.subscribe(() => {
      fetchData();
    });

    const unsubRealtime = DataService.subscribeToChatRealtime((event) => {
      if (event.type === 'INSERT' && event.message) {
        const newMsg = event.message;
        const currentOpenConv = selectedConversationRef.current;
        if (currentOpenConv && newMsg.conversation_id === currentOpenConv.id) {
          setActiveMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_id !== user?.id) {
            DataService.markMessagesAsRead(newMsg.conversation_id, user?.id);
          }
        } else {
          fetchData();
        }
      } else if (event.type === 'UPDATE' && event.message) {
        const updatedMsg = event.message;
        const currentOpenConv = selectedConversationRef.current;
        if (currentOpenConv && updatedMsg.conversation_id === currentOpenConv.id) {
          setActiveMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
        }
      } else if (event.type === 'READ_RECEIPT' && event.conversation_id) {
        const currentOpenConv = selectedConversationRef.current;
        if (currentOpenConv && event.conversation_id === currentOpenConv.id) {
          setActiveMessages(prev => prev.map(m => (!m.read_at && m.sender_id === user?.id) ? { ...m, read: true, read_at: event.read_at || new Date().toISOString() } : m));
        }
      }
    });

    return () => {
      unsubLocal();
      unsubRealtime();
    };
  }, [effectiveApt.id, selectedConversation?.id, user?.id]);

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
        recipient_id: selectedConversation.created_by || 'admin-sindico',
        sender_name: user?.full_name || `Morador Apto ${effectiveApt.number}`,
        sender_role: 'resident',
        content: residentReplyText.trim(),
        message: residentReplyText.trim(),
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

  if (!user?.apartment_id || user?.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center justify-center animate-fadeIn">
        
        {/* Barra superior do app pendente */}
        <div className="w-full max-w-md mb-4 flex items-center justify-between text-xs text-slate-500 px-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-slate-900 font-semibold">dBSound • Portal do Morador</span>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 transition text-xs shadow-sm font-medium"
            title="Sair da Conta"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>

        {/* Card de Boas-vindas e Aguardo */}
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-6 shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Status: Cadastro em Análise / Aguardando Alocação</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Olá, {user?.full_name || 'Novo Morador'}!</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Sua conta está confirmada no sistema. O síndico do condomínio já pode visualizar sua solicitação e fará a vinculação da sua unidade residencial em instantes.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2.5">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>Como funciona a liberação:</span>
            </div>
            <div className="space-y-2 text-slate-600 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <span>O síndico acessa a aba "Moradores" e aloca você ao seu apartamento.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <span>O medidor em decibéis (dB SPL), histórico e ocorrências abrem automaticamente aqui.</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={async () => { await refreshProfile(); onRefresh(); }}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span>Verificar se Já Fui Alocado</span>
            </button>
            <button
              onClick={() => logout()}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center justify-start animate-fadeIn">
      
      {/* Barra de controle superior */}
      <div className={`w-full ${isPhoneFrame ? 'max-w-md' : 'max-w-3xl'} mb-4 flex items-center justify-between text-xs text-slate-500 px-2 transition-all`}>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-900 font-semibold">Portal do Morador • Unidade {effectiveApt.number}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition flex items-center justify-center cursor-pointer"
            title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Alternar entre visualização ampla e moldura mobile"
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            <span>{isPhoneFrame ? 'Expandir Tela' : 'Simular Celular'}</span>
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => switchRole('admin')}
              className="px-3 py-1.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 shadow-sm transition text-xs"
            >
              Voltar ao Síndico
            </button>
          )}

          <button
            onClick={() => logout()}
            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 shadow-sm transition"
            title="Sair da Conta"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Container Principal do Portal */}
      <div className={`w-full ${
        isPhoneFrame 
          ? 'max-w-md bg-white border-2 border-slate-300 rounded-[36px] shadow-2xl p-4 ring-8 ring-slate-100' 
          : 'max-w-3xl bg-white border border-slate-200/80 rounded-2xl p-6 shadow-card'
      } relative overflow-hidden flex flex-col min-h-[720px] transition-all`}>
        
        {/* Notch apenas quando no modo simulador de celular */}
        {isPhoneFrame && (
          <div className="w-24 h-3.5 bg-slate-200 rounded-full mx-auto mb-3 flex items-center justify-center">
            <div className="w-8 h-1 bg-slate-300 rounded-full"></div>
          </div>
        )}

        {/* Cabeçalho do Morador */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Olá, {user?.full_name || 'Morador'}</h2>
            <p className="text-xs text-slate-500">
              Apartamento: <strong className="text-brand-600 font-semibold">{effectiveApt.number}</strong> • Bloco Principal
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs text-emerald-700 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ESP32 Online</span>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto px-1 pb-16 space-y-4">
          
          {/* ABA INÍCIO */}
          {activeTab === 'home' && (
            <div className="space-y-4">
              
              {/* Medidor Principal */}
              <div className={`p-6 rounded-2xl border text-center transition-all ${
                status === 'critical'
                  ? 'bg-rose-50/70 border-rose-300'
                  : status === 'warning'
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-slate-50/70 border-slate-200/80'
              }`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-4">
                  Nível Acústico em Tempo Real
                </span>

                <div className="relative w-44 h-44 mx-auto rounded-full bg-white border-4 border-slate-200 flex flex-col items-center justify-center shadow-subtle">
                  <span className={`text-4xl font-bold font-mono tracking-tight ${
                    status === 'critical' ? 'text-rose-600' : status === 'warning' ? 'text-amber-600' : 'text-slate-900'
                  }`}>
                    {currentDb.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold mt-0.5">dB SPL</span>
                </div>

                <div className="mt-4">
                  <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-semibold ${
                    status === 'critical' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    status === 'warning' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {status === 'critical' ? 'Ruído Elevado' : status === 'warning' ? 'Atenção' : 'Nível Normal'}
                  </span>
                </div>
              </div>

              {/* Cards de Métricas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
                  <span className="text-slate-500 block mb-1">Média 24h</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{effectiveApt.avg_db != null ? effectiveApt.avg_db.toFixed(1) : '40.0'} dB</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
                  <span className="text-slate-500 block mb-1">Último Pico</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{effectiveApt.peak_db != null ? effectiveApt.peak_db.toFixed(1) : '40.0'} dB</span>
                </div>
              </div>

              {/* Ação Rápida de Denúncia */}
              <button
                onClick={() => setActiveTab('occurrences')}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nova Ocorrência</span>
              </button>

              {/* Alertas Recentes da Unidade */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-800 block">Alertas Recentes da Unidade</span>
                {unitAlerts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">Nenhum ruído anômalo registrado nesta unidade.</p>
                ) : (
                  unitAlerts.slice(0, 3).map(a => (
                    <div key={a.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                      <div className="flex justify-between font-semibold text-slate-900 mb-1">
                        <span className={a.severity === 'critical' ? 'text-rose-700 font-bold' : 'text-amber-700'}>{a.title}</span>
                        <span className="text-[10px] text-slate-400">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{a.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABA HISTÓRICO */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 block">Histórico de Ruído da Unidade {effectiveApt.number}</span>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-3">
                <div className="flex justify-between text-slate-600">
                  <span>Pico Máximo Registrado</span>
                  <strong className="text-amber-700 font-mono font-bold">{effectiveApt.peak_db != null ? effectiveApt.peak_db.toFixed(1) : '40.0'} dB</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Média das últimas 24h</span>
                  <strong className="text-brand-700 font-mono font-bold">{effectiveApt.avg_db != null ? effectiveApt.avg_db.toFixed(1) : '40.0'} dB</strong>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Episódios Gravados</span>
                {[
                  { pos: 'Sala Principal', db: 84.5, time: 'Hoje, 22:45', dur: '18s', sev: 'critical' },
                  { pos: 'Cozinha', db: 72.0, time: 'Hoje, 19:12', dur: '12s', sev: 'warning' },
                  { pos: 'Quarto Casal', db: 55.0, time: 'Ontem, 16:30', dur: '8s', sev: 'normal' },
                ].map((ev, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                    <div className="flex justify-between font-semibold text-slate-900 mb-1">
                      <span>{ev.pos}</span>
                      <span className={ev.sev === 'critical' ? 'text-rose-700 font-bold' : 'text-amber-700 font-bold'}>{ev.db} dB</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Duração: {ev.dur}</span>
                      <span>{ev.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA MENSAGENS */}
          {activeTab === 'messages' && (
            <div className="space-y-3 text-xs flex flex-col h-full animate-fadeIn">
              {selectedConversation ? (
                <div className="flex flex-col space-y-3">
                  
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSelectedConversation(null)}
                      className="text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1"
                    >
                      <span>← Conversas</span>
                    </button>

                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold ${
                      selectedConversation.type === 'preventivo'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-brand-700 border border-blue-200'
                    }`}>
                      {selectedConversation.type === 'preventivo' ? 'Contato Preventivo' : 'Ocorrência'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{selectedConversation.subject}</h4>
                    <p className="text-[10px] text-slate-500">Canal direto com a Administração do condomínio</p>
                  </div>

                  {/* Banner de Contexto */}
                  <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed ${
                    selectedConversation.type === 'preventivo'
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-blue-50 border border-blue-200 text-brand-800'
                  }`}>
                    {selectedConversation.type === 'preventivo'
                      ? 'Diálogo educativo baseado no monitoramento acústico predial. Esta mensagem não gera denúncia nem penalidade formal.'
                      : 'Comunicação direta referente à ocorrência registrada. O anonimato do denunciante permanece 100% blindado.'}
                  </div>

                  {/* Thread de Mensagens */}
                  <div className="space-y-2.5 max-h-[320px] overflow-y-auto p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    {activeMessages.length === 0 ? (
                      <p className="text-center py-6 text-slate-400 text-[11px]">Nenhuma mensagem nesta conversa.</p>
                    ) : (
                      activeMessages.map(msg => {
                        const isMe = user?.id ? msg.sender_id === user.id : msg.sender_role === 'resident';
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-1.5 mb-0.5 text-[9px] text-slate-400">
                              <span className={isMe ? 'text-brand-600 font-semibold' : 'text-slate-700 font-semibold'}>
                                {isMe ? 'Você' : (msg.sender_name || 'Síndico Geral')}
                              </span>
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`p-2.5 rounded-2xl text-[11px] max-w-[85%] leading-relaxed ${
                              isMe
                                ? 'bg-brand-600 text-white rounded-tr-none shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content || msg.message}</p>
                            </div>
                            {isMe && (
                              <div className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <span>{msg.read_at ? 'Visualizada' : 'Enviada'}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Form de Envio */}
                  <form onSubmit={handleSendResidentReply} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={residentReplyText}
                      onChange={e => setResidentReplyText(e.target.value)}
                      placeholder="Responder ao síndico..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply || !residentReplyText.trim()}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center gap-1 disabled:opacity-50 transition shadow-sm"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSendingReply ? '...' : 'Enviar'}</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Central de Mensagens</span>
                      <p className="text-[10px] text-slate-500">Comunicações com a Administração ({effectiveApt.number})</p>
                    </div>
                    {unreadMessagesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        <span>{unreadMessagesCount} nova(s)</span>
                      </span>
                    )}
                  </div>

                  {conversations.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-900 text-xs">Caixa de entrada vazia</p>
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
                          className={`p-3 rounded-2xl border transition cursor-pointer relative ${
                            conv.unread_count && conv.unread_count > 0
                              ? 'bg-white border-brand-500 shadow-md ring-1 ring-brand-500'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-subtle'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              conv.type === 'preventivo'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-brand-700 border border-blue-200'
                            }`}>
                              {conv.type === 'preventivo' ? 'Contato Preventivo' : 'Ocorrência'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(conv.updated_at || conv.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <h5 className="font-semibold text-slate-900 text-xs mt-1 mb-0.5">{conv.subject}</h5>

                          {conv.last_message && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {conv.last_message}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 mt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1 text-brand-600 font-medium">
                              <MessageSquare className="w-3 h-3" />
                              <span>Toque para responder ao síndico</span>
                            </span>
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ABA OCORRÊNCIAS */}
          {activeTab === 'occurrences' && (
            <div className="space-y-3 text-xs">
              
              {/* Seletor de Sub-abas */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setOccSubTab('new')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-xs transition text-center ${
                    occSubTab === 'new'
                      ? 'bg-white text-brand-600 font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nova Denúncia
                </button>
                <button
                  type="button"
                  onClick={() => setOccSubTab('notices')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-xs transition text-center relative ${
                    occSubTab === 'notices'
                      ? 'bg-white text-brand-600 font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Minha Unidade</span>
                  {(unitFines.filter(f => f.status === 'pendente').length > 0) && (
                    <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-bold rounded-full">
                      {unitFines.filter(f => f.status === 'pendente').length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOccSubTab('my_reports')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-xs transition text-center ${
                    occSubTab === 'my_reports'
                      ? 'bg-white text-brand-600 font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Meus Relatos
                </button>
              </div>

              {/* Sub-aba: Nova Denúncia */}
              {occSubTab === 'new' && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Registrar Ocorrência / Denúncia</span>
                    <span className="text-[10px] text-slate-500 font-medium">Proteção de Privacidade Ativa</span>
                  </div>

                  {createdSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-1.5 animate-fadeIn font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Relato enviado ao síndico com sucesso!</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateOccurrence} className="space-y-3">
                    <div>
                      <label className="text-slate-600 font-medium block mb-1">Apartamento Infrator (Alvo do Relato)</label>
                      <select
                        value={targetAptId}
                        onChange={e => {
                          setTargetAptId(e.target.value);
                          const found = availableApartments.find(a => a.id === e.target.value);
                          if (found) setNewLocation(`Apartamento ${found.number}`);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
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

                    {/* Leitura do sensor do alvo */}
                    {(() => {
                      const targetApt = availableApartments.find(a => a.id === targetAptId);
                      if (!targetApt) return null;
                      return (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <Volume2 className="w-3.5 h-3.5 text-brand-600" />
                            <span>Telemetria atual do alvo:</span>
                          </div>
                          <span className={`font-mono font-bold ${
                            (targetApt.current_db || 0) >= 80 ? 'text-rose-600' :
                            (targetApt.current_db || 0) >= 65 ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {targetApt.current_db != null ? targetApt.current_db.toFixed(1) : '40.0'} dB SPL
                          </span>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="text-slate-600 font-medium block mb-1">Tipo de Perturbação</label>
                      <select
                        value={newType}
                        onChange={e => setNewType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
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
                      <label className="text-slate-600 font-medium block mb-1">Descrição do Ocorrido</label>
                      <textarea
                        rows={3}
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                        placeholder="Descreva o barulho observado, horário de início e o incômodo gerado..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 resize-none text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                        required
                      />
                    </div>

                    {/* Caixa de Denúncia Anônima */}
                    <div 
                      onClick={() => setIsAnonymous(!isAnonymous)}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        isAnonymous 
                          ? 'bg-emerald-50/70 border-emerald-300' 
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
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
                            className="rounded border-slate-300 text-emerald-600 focus:ring-brand-500"
                          />
                          <label htmlFor="anonMob" className="text-slate-900 font-semibold text-xs cursor-pointer">
                            Denúncia Anônima (100% Protegida)
                          </label>
                        </div>
                        {isAnonymous ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4 text-slate-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-6">
                        {isAnonymous 
                          ? 'Seu nome e apartamento NÃO serão revelados ao síndico nem à unidade denunciada.' 
                          : 'Sua identificação ficará visível apenas para o síndico administrar o caso.'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-brand-800 leading-relaxed">
                      O dBSound não grava áudio nem conversas. Apenas medições quantitativas em dB SPL são associadas ao registro.
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingOcc || !newDesc.trim()}
                      className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingOcc ? 'Enviando ao Síndico...' : 'Confirmar Envio'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Sub-aba: Minha Unidade (Avisos e Boletos) */}
              {occSubTab === 'notices' && (
                <div className="space-y-3">
                  
                  {unitFines.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-rose-600" />
                          <span>Multas da Unidade {effectiveApt.number}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">Boleto Simulado</span>
                      </div>

                      {unitFines.map(fine => {
                        const isCancelled = fine.status === 'cancelada';
                        const isPaid = fine.status === 'paga';
                        return (
                          <div key={fine.id} className={`p-3.5 bg-white rounded-2xl space-y-2 border shadow-subtle ${
                            isCancelled
                              ? 'border-slate-200 opacity-70'
                              : isPaid
                              ? 'border-emerald-300'
                              : 'border-rose-300'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold mb-1 ${
                                  isCancelled
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  <span>{isCancelled ? 'Cobrança Cancelada' : 'Doc. de Cobrança Simulado'}</span>
                                </div>
                                <h4 className="font-semibold text-slate-900 text-xs">{fine.reason}</h4>
                                <p className="text-[10px] text-slate-500">Vencimento: {new Date(fine.due_date).toLocaleDateString('pt-BR')}</p>
                                {isCancelled && fine.cancellation_reason && (
                                  <p className="text-[10px] text-rose-600 italic pt-1">
                                    Motivo do cancelamento: {fine.cancellation_reason}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className={`text-base font-bold font-mono ${
                                  isCancelled ? 'text-slate-400 line-through' : isPaid ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  R$ {fine.amount.toFixed(2)}
                                </span>
                                <span className={`block text-[10px] font-semibold uppercase ${
                                  isPaid 
                                    ? 'text-emerald-700' 
                                    : isCancelled 
                                    ? 'text-rose-700' 
                                    : 'text-amber-700'
                                }`}>
                                  {isPaid ? 'Liquidada' : isCancelled ? 'Cancelada' : 'Pendente'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setSelectedFineForModal(fine)}
                                className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition"
                              >
                                <FileText className="w-3 h-3 text-slate-500" />
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
                                className="py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-brand-700 font-semibold text-xs flex items-center justify-center gap-1 transition"
                              >
                                <MessageSquare className="w-3 h-3 text-brand-600" />
                                <span>Falar com Síndico</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pareceres de Ocorrências Registradas Contra a Unidade */}
                  {(() => {
                    const unitNotices = allOccurrencesList.filter(
                      o => o.apartment_id === effectiveApt.id && 
                      ['advertência', 'multa', 'procedente', 'em análise', 'resolvida'].includes(o.status)
                    );

                    if (unitNotices.length === 0 && unitFines.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                          <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                          <p className="font-semibold text-slate-900">Nenhuma notificação ou multa ativa</p>
                          <p className="text-[11px] text-slate-500">
                            Sua unidade ({effectiveApt.number}) está em plena conformidade com as regras de convivência acústica.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-bold text-slate-900 block">
                          Notificações da Administração ({unitNotices.length})
                        </span>

                        {unitNotices.map(notif => (
                          <div key={notif.id} className="p-3.5 bg-white border border-slate-200/80 rounded-2xl space-y-2 text-xs shadow-subtle">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-semibold text-slate-900 block">{notif.type}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(notif.occurred_at || notif.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                                notif.status === 'multa' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                notif.status === 'advertência' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                notif.status === 'procedente' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                'bg-blue-50 text-brand-700 border border-blue-200'
                              }`}>
                                {notif.status}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                              <span className="text-brand-700 font-semibold block mb-0.5">Parecer da Administração:</span>
                              <p className="text-slate-600">
                                {notif.syndic_notes || 'Ocorrência sob averiguação do síndico. Mantenha os níveis sonoros dentro dos limites permitidos.'}
                              </p>
                              {notif.noise_level_db != null && (
                                <p className="text-[10px] text-slate-500 pt-0.5">
                                  Telemetria registrada pelo sensor: <strong className="text-slate-800 font-mono">{notif.noise_level_db} dB SPL</strong>
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenConversationByOccurrence(notif)}
                              className="w-full py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-brand-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                              <span>Conversar com o Síndico sobre este Aviso</span>
                            </button>

                            <span className="text-[10px] text-slate-400 italic block">
                              A identidade de eventuais denunciantes é rigorosamente protegida.
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Sub-aba: Meus Relatos */}
              {occSubTab === 'my_reports' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-900 block">Histórico de Relatos Enviados por Você</span>
                  {(() => {
                    const myReports = allOccurrencesList.filter(
                      o => o.reporter_id === user?.id || (o.apartment_id !== effectiveApt.id && (!o.reporter_id || o.reporter_name === user?.full_name))
                    );

                    if (myReports.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                          <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto" />
                          <p className="font-semibold text-slate-900">Nenhum relato registrado</p>
                          <p className="text-[11px] text-slate-500">
                            Quando você registrar barulhos anômalos de outras unidades, o status do acompanhamento aparecerá aqui.
                          </p>
                          <button
                            type="button"
                            onClick={() => setOccSubTab('new')}
                            className="mt-2 px-3 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-sm hover:bg-brand-700 transition"
                          >
                            Registrar Primeiro Relato
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {myReports.map(rep => (
                          <div key={rep.id} className="p-3.5 bg-white border border-slate-200/80 rounded-2xl space-y-2 text-xs shadow-subtle">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-semibold text-slate-900 block">
                                  Alvo: {rep.location || `Apto ${rep.apartment_number || 'N/A'}`}
                                </span>
                                <span className="text-[10px] text-slate-500 block">{rep.type}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                                rep.status === 'multa' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                rep.status === 'advertência' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                rep.status === 'procedente' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                rep.status === 'improcedente' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                'bg-blue-50 text-brand-700 border border-blue-200'
                              }`}>
                                {rep.status}
                              </span>
                            </div>

                            <p className="text-slate-600 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                              "{rep.description}"
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                              <span className="flex items-center gap-1">
                                {rep.anonymous ? (
                                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                                    <EyeOff className="w-3 h-3" /> Anônima
                                  </span>
                                ) : (
                                  <span className="text-slate-500 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Identificada
                                  </span>
                                )}
                              </span>
                              <span>{new Date(rep.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>

                            {rep.syndic_notes && (
                              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 text-[11px] text-brand-800">
                                <strong className="text-slate-900 block mb-0.5">Resposta do Síndico:</strong>
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

          {/* ABA PERFIL */}
          {activeTab === 'profile' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center mx-auto mb-2 text-xl font-bold">
                  {(user?.full_name || 'MO').slice(0, 2).toUpperCase()}
                </div>
                <h3 className="font-bold text-slate-900 text-base">{user?.full_name || 'Morador'}</h3>
                <p className="text-slate-500">Unidade {effectiveApt.number} • Bloco Principal</p>
                <p className="text-slate-400 text-[11px]">{user?.email || 'morador@dbsound.com'}</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 space-y-2 shadow-subtle">
                <button
                  onClick={() => setActiveTab('privacy')}
                  className="w-full text-left py-2 px-2 flex items-center justify-between text-slate-700 hover:text-brand-600 rounded-lg hover:bg-slate-50 transition"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    Termos de Privacidade (LGPD)
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <div className="h-px bg-slate-100 my-1" />

                <button
                  onClick={() => logout()}
                  className="w-full text-left py-2 px-2 flex items-center justify-between text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition font-medium"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Sair da Conta
                  </span>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            </div>
          )}

          {/* ABA PRIVACIDADE */}
          {activeTab === 'privacy' && (
            <div className="space-y-3 text-xs">
              <button
                onClick={() => setActiveTab('profile')}
                className="text-brand-600 hover:text-brand-700 font-medium text-xs mb-1 block"
              >
                ← Voltar para Perfil
              </button>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-subtle">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Sem Gravação de Áudio ou Voz</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  O hardware do dBSound realiza processamento de sinais diretamente na memória volátil do microcontrolador ESP32.
                  Nenhum arquivo de voz é gravado ou transmitido. Apenas telemetria quantitativa em dB SPL é armazenada.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Navegação Inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur border-t border-slate-200 flex items-center justify-around px-2 z-20">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center text-[10px] transition ${
              activeTab === 'home' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 mb-0.5" />
            <span>Início</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center text-[10px] transition ${
              activeTab === 'history' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
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
            className={`flex flex-col items-center text-[10px] relative transition ${
              activeTab === 'messages' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4 mb-0.5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              )}
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
            </div>
            <span>Mensagens</span>
          </button>
          <button
            onClick={() => setActiveTab('occurrences')}
            className={`flex flex-col items-center text-[10px] transition ${
              activeTab === 'occurrences' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 mb-0.5" />
            <span>Ocorrências</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center text-[10px] transition ${
              activeTab === 'profile' || activeTab === 'privacy' ? 'text-brand-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4 mb-0.5" />
            <span>Perfil</span>
          </button>
        </div>

        {/* Modal de Boleto */}
        {selectedFineForModal && (
          <PrintableBoleto
            fine={selectedFineForModal}
            onClose={() => setSelectedFineForModal(null)}
          />
        )}

        {/* Modal Crítico de Ruído Elevado */}
        {activeModalAlert && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white border-2 border-rose-500 rounded-2xl p-6 text-center space-y-4 shadow-elevated max-w-xs w-full animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-base font-bold text-rose-600 tracking-wider uppercase">Alerta de Ruído</h4>
                <p className="text-xs font-semibold text-slate-800">Volume Elevado Detectado</p>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl py-3">
                <span className="text-3xl font-bold text-rose-700 font-mono">{currentDb.toFixed(1)} dB</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Nível sonoro acima do limite configurado detectado no seu apartamento.
              </p>

              {showInstructions && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-[11px] text-slate-600 space-y-1">
                  <span className="text-slate-900 font-bold block">Orientações de Boa Convivência:</span>
                  <p>• Diminua o volume de televisores e instrumentos.</p>
                  <p>• Feche portas e janelas para reduzir a reverberação.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleDismissAlert}
                  className="py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium transition"
                >
                  Ignorar
                </button>
                <button
                  onClick={() => {
                    if (!showInstructions) setShowInstructions(true);
                    else handleDismissAlert();
                  }}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition shadow-sm"
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
