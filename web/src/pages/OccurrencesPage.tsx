import React, { useState, useEffect } from 'react';
import { Occurrence, OccurrenceComment, OccurrenceStatus, SimulatedFine, Apartment, Conversation, ConversationMessage } from '../types/database.types';
import { DataService } from '../lib/dataService';
import { useAuth } from '../contexts/AuthContext';
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Plus, 
  Send, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Check, 
  Building2, 
  Volume2, 
  Search, 
  ShieldCheck, 
  X, 
  Trash2, 
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { PrintableBoleto } from '../components/PrintableBoleto';

interface OccurrencesPageProps {
  occurrences: Occurrence[];
  onRefresh: () => void;
}

export const OccurrencesPage: React.FC<OccurrencesPageProps> = ({ occurrences, onRefresh }) => {
  const { user } = useAuth();
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(occurrences[0] || null);
  const [comments, setComments] = useState<OccurrenceComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterApartmentId, setFilterApartmentId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [fines, setFines] = useState<SimulatedFine[]>([]);

  // Modais de Controle
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isBulletinModalOpen, setIsBulletinModalOpen] = useState(false);
  const [isNewOccurrenceModalOpen, setIsNewOccurrenceModalOpen] = useState(false);
  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [isBillingDocModalOpen, setIsBillingDocModalOpen] = useState(false);
  const [activeFineToView, setActiveFineToView] = useState<SimulatedFine | null>(null);

  // Chat Síndico <-> Morador
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ConversationMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);

  // Decisão do Síndico
  const [decisionMode, setDecisionMode] = useState<OccurrenceStatus>('em análise');
  const [syndicNotes, setSyndicNotes] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [decisionSuccessMsg, setDecisionSuccessMsg] = useState<string | null>(null);

  // Cancelamento de Multa
  const [isCancelFineModalOpen, setIsCancelFineModalOpen] = useState(false);
  const [fineToCancel, setFineToCancel] = useState<SimulatedFine | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancellingFine, setIsCancellingFine] = useState(false);

  // Formulário de Multa
  const [fineAmount, setFineAmount] = useState<number>(150);
  const [fineDueDate, setFineDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [fineReason, setFineReason] = useState('Infração por ruído excessivo acima dos limites permitidos');
  const [fineNotes, setFineNotes] = useState('');

  // Formulário de Nova Ocorrência (Síndico)
  const [newType, setNewType] = useState('Música Alta / Som Mecânico');
  const [newTargetAptId, setNewTargetAptId] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const loadData = async () => {
    const [apts, allFines] = await Promise.all([
      DataService.getApartments(),
      DataService.getFines(),
    ]);
    setApartments(apts);
    setFines(allFines);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mantém ocorrência selecionada sincronizada
  useEffect(() => {
    if (occurrences.length > 0) {
      if (!selectedOccurrence) {
        setSelectedOccurrence(occurrences[0]);
      } else {
        const updated = occurrences.find(o => o.id === selectedOccurrence.id);
        if (updated) {
          setSelectedOccurrence(updated);
          setDecisionMode(updated.status);
          setSyndicNotes(updated.syndic_notes || '');
        }
      }
    }
  }, [occurrences]);

  useEffect(() => {
    if (selectedOccurrence) {
      DataService.getComments(selectedOccurrence.id).then(setComments);
      setDecisionMode(selectedOccurrence.status);
      setSyndicNotes(selectedOccurrence.syndic_notes || '');
      setFineReason(`Infração: ${selectedOccurrence.type} na unidade ${selectedOccurrence.apartment_number || selectedOccurrence.location}`);
    }
  }, [selectedOccurrence]);

  // Sincronização em tempo real quando o modal de chat estiver aberto
  useEffect(() => {
    if (!isChatModalOpen || !activeConversation) return;

    const unsubscribe = DataService.subscribeToChatRealtime((event) => {
      if (event.type === 'INSERT' && event.message && event.message.conversation_id === activeConversation.id) {
        const msg = event.message;
        setChatMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        DataService.markMessagesAsRead(activeConversation.id, user?.id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isChatModalOpen, activeConversation, user?.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedOccurrence) return;

    const added = await DataService.addComment(
      selectedOccurrence.id,
      user?.id || 'admin1',
      newCommentText.trim(),
      user?.full_name || 'Síndico Geral'
    );
    setComments([...comments, added]);
    setNewCommentText('');
  };

  // Abrir Chat a partir de uma ocorrência
  const handleOpenOccurrenceChat = async (targetOcc?: Occurrence) => {
    const occ = targetOcc || selectedOccurrence;
    if (!occ) return;

    setSelectedOccurrence(occ);

    let targetAptId = occ.apartment_id;
    if (!targetAptId) {
      const foundApt = apartments.find(a => 
        (occ.apartment_number && a.number === occ.apartment_number) ||
        (occ.location && occ.location.includes(a.number))
      );
      if (foundApt) targetAptId = foundApt.id;
    }

    const conv = await DataService.getOrCreateOccurrenceConversation(occ.id, {
      condominium_id: occ.condominium_id || user?.condominium_id || '00000000-0000-0000-0000-000000000001',
      apartment_id: targetAptId || undefined,
      apartment_number: occ.apartment_number,
      type: 'ocorrencia',
      title: `Ocorrência #${occ.id.slice(0, 8)} • ${occ.type}`,
      subject: `Ocorrência #${occ.id.slice(0, 8)} • ${occ.type}`,
      initial_message: `Olá! Entramos em contato referente à ocorrência registrada sobre "${occ.type}" na unidade ${occ.apartment_number || occ.location}. Gostaríamos de orientar a respeito das regras de convivência acústica do condomínio e solicitar adequação dos níveis de ruído.`,
    });

    setActiveConversation(conv);
    const msgs = await DataService.getMessages(conv.id);
    setChatMessages(msgs);
    await DataService.markMessagesAsRead(conv.id, user?.id);
    setIsChatModalOpen(true);
  };

  // Abrir Modal de Multa para uma ocorrência específica
  const handleOpenFineModalFor = (occ: Occurrence) => {
    setSelectedOccurrence(occ);
    setFineReason(`Infração: ${occ.type} na unidade ${occ.apartment_number || occ.location}`);
    setIsFineModalOpen(true);
  };

  // Aplicação rápida de Advertência diretamente no card
  const handleApplyWarningFor = async (occ: Occurrence) => {
    setSelectedOccurrence(occ);
    await DataService.decideOccurrence(
      occ.id,
      'advertência',
      'Advertência formal regimental emitida após verificação de ruído excessivo.',
      user?.full_name || 'Síndico Geral'
    );
    setDecisionSuccessMsg(`Advertência registrada para a unidade ${occ.apartment_number || occ.location}!`);
    setTimeout(() => setDecisionSuccessMsg(null), 4000);
    onRefresh();
  };

  // Abertura do Modal de Detalhes
  const handleOpenDetailsFor = (occ: Occurrence) => {
    setSelectedOccurrence(occ);
    setIsDetailsModalOpen(true);
  };

  // Abertura do Modal de Cancelamento de Multa
  const handleOpenCancelModal = (fine: SimulatedFine) => {
    setFineToCancel(fine);
    setCancellationReason('');
    setIsCancelFineModalOpen(true);
  };

  // Confirmação de Cancelamento de Multa com Auditoria
  const handleConfirmCancelFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineToCancel || !cancellationReason.trim() || isCancellingFine) return;

    setIsCancellingFine(true);
    try {
      await DataService.cancelFine({
        fine_id: fineToCancel.id,
        cancellation_reason: cancellationReason.trim(),
        cancelled_by: user?.full_name || 'Síndico Geral',
      });
      setIsCancelFineModalOpen(false);
      setFineToCancel(null);
      setDecisionSuccessMsg(`Multa ${fineToCancel.fine_number} cancelada com sucesso no sistema!`);
      setTimeout(() => setDecisionSuccessMsg(null), 4000);
      await loadData();
      onRefresh();
    } finally {
      setIsCancellingFine(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !activeConversation || isSendingChatMessage) return;

    setIsSendingChatMessage(true);
    try {
      const msg = await DataService.sendMessage({
        conversation_id: activeConversation.id,
        sender_id: user?.id || 'admin-sindico',
        sender_name: user?.full_name || 'Síndico Geral',
        sender_role: 'syndic',
        content: newChatMessage.trim(),
      });
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setNewChatMessage('');
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  // Aplicação da Decisão do Síndico no Modal de Detalhes
  const handleApplyDecision = async (overrideDecision?: OccurrenceStatus) => {
    if (!selectedOccurrence) return;
    const targetDecision = overrideDecision || decisionMode;
    setIsSavingDecision(true);

    try {
      await DataService.decideOccurrence(
        selectedOccurrence.id,
        targetDecision,
        syndicNotes.trim(),
        user?.full_name || 'Síndico Geral'
      );

      setDecisionSuccessMsg(`Decisão "${targetDecision.toUpperCase()}" registrada com sucesso!`);
      setTimeout(() => setDecisionSuccessMsg(null), 4000);

      onRefresh();
      const updatedComments = await DataService.getComments(selectedOccurrence.id);
      setComments(updatedComments);
    } finally {
      setIsSavingDecision(false);
    }
  };

  // Confirmação de Aplicação de Multa
  const handleConfirmFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOccurrence) return;

    let targetAptId = selectedOccurrence.apartment_id;
    if (!targetAptId) {
      const apt = apartments.find(a => 
        (selectedOccurrence.apartment_number && a.number === selectedOccurrence.apartment_number) ||
        (selectedOccurrence.location && selectedOccurrence.location.includes(a.number))
      );
      if (apt) targetAptId = apt.id;
    }

    if (!targetAptId) {
      alert('Não foi possível identificar a unidade residencial para aplicar a multa. Por favor, vincule uma unidade à ocorrência.');
      return;
    }

    const fine = await DataService.createFine({
      apartment_id: targetAptId,
      apartment_number: selectedOccurrence.apartment_number,
      occurrence_id: selectedOccurrence.id,
      reason: fineReason.trim(),
      amount: Number(fineAmount) || 150,
      due_date: fineDueDate,
      syndic_notes: fineNotes.trim(),
    });

    setIsFineModalOpen(false);
    setActiveFineToView(fine);
    await loadData();
    onRefresh();

    // Oferece abertura direta do documento de cobrança simulada na rota dedicada
    window.open(`/boleto/${fine.id}`, '_blank');
  };

  // Simular Pagamento da Multa
  const handleSimulatePayment = async (fineId: string) => {
    const ok = await DataService.simulatePayFine(fineId);
    if (ok) {
      if (activeFineToView && activeFineToView.id === fineId) {
        setActiveFineToView({ ...activeFineToView, status: 'paga', paid_at: new Date().toISOString() });
      }
      await loadData();
      onRefresh();
    }
  };

  // Criação de Ocorrência Manual pelo Síndico
  const handleCreateOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) return;

    const apt = apartments.find(a => a.id === newTargetAptId);

    const newOcc = await DataService.createOccurrence({
      condominium_id: user?.condominium_id || '00000000-0000-0000-0000-000000000001',
      reporter_id: isAnonymous ? undefined : user?.id,
      apartment_id: newTargetAptId || null,
      apartment_number: apt?.number,
      type: newType,
      location: apt ? `Apartamento ${apt.number}` : (newLocation.trim() || 'Área Residencial'),
      description: newDescription.trim(),
      occurred_at: new Date().toISOString(),
      status: 'aberta',
      priority: 'media',
      anonymous: isAnonymous,
      reporter_name: isAnonymous ? 'Morador Anônimo' : (user?.full_name || 'Síndico Geral'),
      noise_level_db: apt?.current_db || 74.5,
    });

    setIsNewOccurrenceModalOpen(false);
    setNewDescription('');
    setSelectedOccurrence(newOcc);
    onRefresh();
  };

  // Multa associada à ocorrência selecionada
  const linkedFine = selectedOccurrence
    ? fines.find(f => f.occurrence_id === selectedOccurrence.id || (selectedOccurrence.apartment_id && f.apartment_id === selectedOccurrence.apartment_id && f.status === 'pendente'))
    : null;

  // Filtragem conforme os critérios solicitados
  const filteredOccurrences = occurrences.filter(occ => {
    let matchesStatus = true;
    if (filterStatus !== 'all') {
      if (filterStatus === 'em análise') {
        matchesStatus = (occ.status === 'em análise' || occ.status === 'aberta');
      } else {
        matchesStatus = occ.status === filterStatus;
      }
    }

    const matchesApt = filterApartmentId === 'all' || occ.apartment_id === filterApartmentId;
    const matchesSearch = 
      occ.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occ.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (occ.location && occ.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (occ.apartment_number && occ.apartment_number.includes(searchQuery));

    return matchesStatus && matchesApt && matchesSearch;
  });

  const getStatusBadge = (status: OccurrenceStatus) => {
    switch (status) {
      case 'aberta':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">ABERTA</span>;
      case 'em análise':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">EM ANÁLISE</span>;
      case 'procedente':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">PROCEDENTE</span>;
      case 'improcedente':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-600/40 text-slate-300 border border-slate-500/30">IMPROCEDENTE</span>;
      case 'advertência':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">ADVERTÊNCIA</span>;
      case 'multa':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/25 text-red-400 border border-red-500/40 shadow-glow-red">MULTADA</span>;
      case 'resolvida':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">RESOLVIDA</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  const getNoiseBadgeColor = (db?: number | null) => {
    const val = db ?? 74.5;
    if (val >= 75) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (val >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. TOPBAR / CABEÇALHO */}
      {/* ========================================================================= */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Ocorrências & Decisões
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Síndico
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Monitoramento em Tempo Real • Gestão de Ruído & Decisões Administrativas
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setIsBulletinModalOpen(true)}
            className="flex items-center gap-2 bg-space-900 hover:bg-space-800 text-slate-200 hover:text-white border border-white/10 hover:border-violet-500/50 font-semibold px-4 py-2.5 rounded-2xl text-xs transition shadow-sm cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-violet-400" />
            <span>Ver Boletim</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewOccurrenceModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs shadow-glow-purple transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova ocorrência</span>
          </button>
        </div>
      </header>

      {/* Decision Success Notification */}
      {decisionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{decisionSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BARRA DE FILTROS HORIZONTAL (100% LARGURA, RESPONSIVA, SEM CORTES) */}
      {/* ========================================================================= */}
      <div className="w-full space-y-3">
        {/* Abas horizontais de status */}
        <div className="flex flex-wrap items-center gap-2 bg-space-900/90 p-2 rounded-2xl border border-white/10 w-full shadow-inner">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'em análise', label: 'Em análise' },
            { id: 'procedente', label: 'Procedentes' },
            { id: 'improcedente', label: 'Improcedentes' },
            { id: 'advertência', label: 'Advertência' },
            { id: 'multa', label: 'Multada' },
            { id: 'resolvida', label: 'Resolvida' },
          ].map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-glow-purple ring-1 ring-white/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Linha de busca por texto e filtro de apartamento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tipo, apartamento, palavras-chave ou descrição..."
              className="w-full bg-space-900/80 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <select
              value={filterApartmentId}
              onChange={(e) => setFilterApartmentId(e.target.value)}
              className="w-full bg-space-900/80 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="all">Todos os Apartamentos / Unidades</option>
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>Apartamento {a.number} (Andar {a.floor || 1})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LISTA DE OCORRÊNCIAS (CARDS COM LARGURA TOTAL width: 100%) */}
      {/* ========================================================================= */}
      <div className="w-full space-y-4">
        {filteredOccurrences.length === 0 ? (
          <div className="w-full p-12 text-center text-slate-500 text-sm vault-card rounded-3xl border border-white/10">
            Nenhuma ocorrência encontrada para os filtros selecionados.
          </div>
        ) : (
          filteredOccurrences.map((occ) => {
            const occFine = fines.find(f => f.occurrence_id === occ.id || (occ.apartment_id && f.apartment_id === occ.apartment_id && f.status === 'pendente'));
            const noiseVal = occ.noise_level_db ?? 74.5;
            const noiseBadge = getNoiseBadgeColor(noiseVal);

            return (
              <div
                key={occ.id}
                className="w-full p-5 sm:p-6 rounded-3xl bg-space-900/90 border border-white/10 hover:border-violet-500/40 transition-all shadow-lg space-y-4 relative overflow-hidden"
              >
                {/* Linha Superior: Ícone de Som + dB, Apartamento, Data/Hora, Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Telemetria Acústica */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${noiseBadge}`}>
                      <Volume2 className="w-4 h-4" />
                      <span>{noiseVal.toFixed(1)} dB SPL</span>
                    </div>

                    {/* Unidade */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-violet-300">
                      <Building2 className="w-4 h-4 text-violet-400" />
                      <span>Apto {occ.apartment_number || occ.location?.replace(/[^0-9]/g, '') || 'Geral'}</span>
                    </div>

                    {/* Tipo / Assunto */}
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      {occ.type}
                    </h3>

                    {/* Data e Hora */}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(occ.occurred_at).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {occ.anonymous && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                        <ShieldAlert className="w-3 h-3 text-violet-400" />
                        Anônima
                      </span>
                    )}
                    {getStatusBadge(occ.status)}
                  </div>
                </div>

                {/* Linha Central: Descrição do Relato */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-space-950/50 p-3.5 rounded-2xl border border-white/5">
                  {occ.description}
                </p>

                {/* Linha Inferior: Botões de Ação Rápida no Próprio Card */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Botão Chat */}
                    <button
                      type="button"
                      onClick={() => handleOpenOccurrenceChat(occ)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-200 hover:text-white border border-violet-500/30 text-xs font-bold transition cursor-pointer"
                      title="Abrir chat direto com a unidade"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                      <span>💬 Chat</span>
                    </button>

                    {/* Botão Advertência */}
                    <button
                      type="button"
                      onClick={() => handleApplyWarningFor(occ)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                      title="Emitir advertência formal para a unidade"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>⚠️ Advertência</span>
                    </button>

                    {/* Botão Multa */}
                    <button
                      type="button"
                      onClick={() => handleOpenFineModalFor(occ)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 hover:text-red-200 border border-red-500/30 text-xs font-bold transition cursor-pointer"
                      title="Aplicar multa regimental à unidade"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-red-400" />
                      <span>💰 Multa</span>
                    </button>

                    {/* Botão Boleto se já existir multa */}
                    {occFine && (
                      <button
                        type="button"
                        onClick={() => window.open(`/boleto/${occFine.id}`, '_blank')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
                        title="Abrir documento de cobrança simulada em nova aba"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>📄 Boleto #{occFine.fine_number}</span>
                      </button>
                    )}
                  </div>

                  <div>
                    {/* Botão Ver Detalhes */}
                    <button
                      type="button"
                      onClick={() => handleOpenDetailsFor(occ)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition cursor-pointer"
                    >
                      <span>Ver detalhes</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL DE DETALHES COMPLETO ("Ver detalhes") */}
      {/* ========================================================================= */}
      {isDetailsModalOpen && selectedOccurrence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="vault-card rounded-3xl p-6 w-full max-w-4xl space-y-6 border border-violet-500/30 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white">{selectedOccurrence.type}</h2>
                  {getStatusBadge(selectedOccurrence.status)}
                  <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">
                    Prioridade {selectedOccurrence.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Protocolo #{selectedOccurrence.id.slice(0, 12)} • Registrada em {new Date(selectedOccurrence.occurred_at).toLocaleString('pt-BR')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid com Informações e Telemetria */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Informações da Unidade e Denunciante */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-space-950/70 border border-white/10 space-y-2.5">
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-violet-400" />
                  Dados da Unidade & Relato
                </h4>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span>
                    Unidade: <strong className="text-violet-300">Apto {selectedOccurrence.apartment_number || selectedOccurrence.location}</strong>
                  </span>
                  {selectedOccurrence.anonymous ? (
                    <span className="flex items-center gap-1 text-violet-400 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Denúncia Anônima (Privacidade Resguardada)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      Denunciante: {selectedOccurrence.reporter_name || 'Morador'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed pt-2 border-t border-white/5 whitespace-pre-wrap">
                  {selectedOccurrence.description}
                </p>
              </div>

              {/* Card de Evidência Acústica */}
              <div className="p-4 rounded-2xl bg-space-950/70 border border-white/10 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    Telemetria Acústica
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Medição registrada pelos sensores MAX9814 da unidade no momento da infração:
                  </p>
                </div>

                <div className="pt-2">
                  <span className="text-3xl font-black font-mono text-amber-400">
                    {selectedOccurrence.noise_level_db ? `${selectedOccurrence.noise_level_db.toFixed(1)} dB` : '74.5 dB'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">SPL calibrado • Limiar noturno excedido</span>
                </div>
              </div>
            </div>

            {/* Seção de Comunicação Direta com o Morador */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/50 via-purple-950/30 to-space-950 border border-violet-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/40 text-violet-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Canal Direto com a Unidade Denunciada</h4>
                  <p className="text-[11px] text-slate-300">
                    Converse diretamente com o morador para solicitar adequação de volume com confidencialidade.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleOpenOccurrenceChat(selectedOccurrence);
                }}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-glow-purple transition flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Abrir Chat com Morador</span>
              </button>
            </div>

            {/* Linha do Tempo & Histórico Integrado */}
            <div className="p-5 rounded-2xl bg-space-950/60 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" />
                Linha do Tempo & Histórico da Ocorrência
              </h4>

              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10 text-xs">
                {/* 1. Sensor Telemetry */}
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center">
                    <Volume2 className="w-2 h-2 text-amber-300" />
                  </div>
                  <div>
                    <span className="font-bold text-white">Telemetria Acústica Registrada</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">
                      {selectedOccurrence.noise_level_db ? `${selectedOccurrence.noise_level_db.toFixed(1)} dB SPL` : '74.5 dB SPL'}
                    </span>
                    <p className="text-slate-400 text-[11px]">Captação automatizada pelos sensores acústicos.</p>
                  </div>
                </div>

                {/* 2. Denúncia Registrada */}
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
                    <FileText className="w-2 h-2 text-blue-300" />
                  </div>
                  <div>
                    <span className="font-bold text-white">Denúncia Registrada ({selectedOccurrence.type})</span>
                    <span className="text-[10px] text-slate-500 ml-2">{new Date(selectedOccurrence.occurred_at).toLocaleString('pt-BR')}</span>
                    <p className="text-slate-400 text-[11px]">
                      {selectedOccurrence.anonymous ? 'Denúncia registrada com anonimato protegido.' : `Registrada por ${selectedOccurrence.reporter_name || 'Morador'}.`}
                    </p>
                  </div>
                </div>

                {/* 3. Decisão Atual */}
                {selectedOccurrence.decision && (
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-violet-500/20 border-2 border-violet-400 flex items-center justify-center">
                      <Check className="w-2 h-2 text-violet-300" />
                    </div>
                    <div>
                      <span className="font-bold text-violet-300">Parecer do Síndico: {selectedOccurrence.decision.toUpperCase()}</span>
                      <p className="text-slate-400 text-[11px]">{selectedOccurrence.syndic_notes || 'Decisão homologada na auditoria.'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Painel de Parecer e Decisão do Síndico */}
            <div className="p-5 rounded-2xl bg-space-950/80 border border-violet-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-400" />
                    Parecer & Decisão Formal do Síndico
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecione a resolução administrativa da denúncia:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'em análise', label: 'Em Análise', color: 'bg-blue-600 hover:bg-blue-500' },
                  { id: 'procedente', label: 'Procedente (Confirmada)', color: 'bg-emerald-600 hover:bg-emerald-500' },
                  { id: 'improcedente', label: 'Improcedente', color: 'bg-slate-700 hover:bg-slate-600' },
                  { id: 'advertência', label: 'Emitir Advertência', color: 'bg-amber-600 hover:bg-amber-500' },
                  { id: 'multa', label: 'Aplicar Multa', color: 'bg-red-600 hover:bg-red-500' },
                  { id: 'resolvida', label: 'Concluir / Resolvida', color: 'bg-purple-600 hover:bg-purple-500' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setDecisionMode(btn.id as OccurrenceStatus)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      decisionMode === btn.id
                        ? `${btn.color} text-white shadow-lg ring-2 ring-white/20`
                        : 'bg-space-900 border border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Justificativa / Parecer do Síndico:
                </label>
                <textarea
                  rows={2}
                  value={syndicNotes}
                  onChange={(e) => setSyndicNotes(e.target.value)}
                  placeholder="Justifique a decisão com base na conferência dos decibéis e regimento..."
                  className="w-full bg-space-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  disabled={isSavingDecision}
                  onClick={() => handleApplyDecision()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs shadow-glow-purple transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingDecision ? 'Salvando...' : 'Registrar Decisão no Sistema'}</span>
                </button>
              </div>
            </div>

            {/* Multa Associada (se houver) */}
            {linkedFine && (
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                linkedFine.status === 'cancelada'
                  ? 'bg-slate-900/60 border-slate-700/50'
                  : linkedFine.status === 'paga'
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-red-950/20 border-red-500/30'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className={`w-4 h-4 ${linkedFine.status === 'cancelada' ? 'text-slate-400' : 'text-red-400'}`} />
                    <span className="font-bold text-xs text-white">Multa Registrada: {linkedFine.fine_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      linkedFine.status === 'paga' 
                        ? 'bg-emerald-500/20 text-emerald-300' 
                        : linkedFine.status === 'cancelada'
                        ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {linkedFine.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Valor: <strong>R$ {linkedFine.amount.toFixed(2)}</strong> • Vencimento: {new Date(linkedFine.due_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {linkedFine.status === 'pendente' && (
                    <button
                      type="button"
                      onClick={() => handleSimulatePayment(linkedFine.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simular Pagamento</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.open(`/boleto/${linkedFine.id}`, '_blank')}
                    className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-glow-purple transition flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Boleto</span>
                  </button>
                  {linkedFine.status !== 'cancelada' && (
                    <button
                      type="button"
                      onClick={() => handleOpenCancelModal(linkedFine)}
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancelar Multa</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Auditoria / Comentários */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-400" />
                Histórico de Providências & Auditoria ({comments.length})
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">Nenhum despacho registrado ainda.</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="p-3 rounded-xl bg-space-900 border border-white/5 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-violet-300">{c.author_name || 'Administrador'}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(c.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-300">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Adicionar nota de auditoria ou despacho..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 bg-space-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Enviar</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BOLETIM GERAL DE MULTAS & INFRAÇÕES */}
      {/* ========================================================================= */}
      {isBulletinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="vault-card rounded-3xl p-6 w-full max-w-2xl space-y-5 border border-white/15 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-violet-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">Boletim Geral de Multas & Notificações</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulletinModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumo Financeiro / Administrativo */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-space-950/80 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total de Multas</span>
                <span className="text-lg font-black text-white font-mono">{fines.length}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-space-950/80 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Pendentes</span>
                <span className="text-lg font-black text-amber-300 font-mono">
                  {fines.filter(f => f.status === 'pendente').length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-space-950/80 border border-white/5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Pagas / Baixadas</span>
                <span className="text-lg font-black text-emerald-300 font-mono">
                  {fines.filter(f => f.status === 'paga').length}
                </span>
              </div>
            </div>

            {/* Lista de Multas e Boletos */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Documentos de Cobrança Simulada Gerados
              </h4>

              {fines.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Nenhuma multa emitida no condomínio.</p>
              ) : (
                fines.map(f => (
                  <div key={f.id} className="p-3.5 rounded-2xl bg-space-950/60 border border-white/5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Boleto #{f.fine_number}</span>
                        <span className="text-violet-300 font-semibold">
                          {f.apartment_number ? `Apto ${f.apartment_number}` : 'Unidade'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.status === 'paga' ? 'bg-emerald-500/20 text-emerald-400' :
                          f.status === 'cancelada' ? 'bg-slate-700 text-slate-400' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {f.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        R$ {f.amount.toFixed(2)} • Vencimento: {new Date(f.due_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.open(`/boleto/${f.id}`, '_blank')}
                      className="px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver Documento</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CHAT COM O MORADOR DA OCORRÊNCIA (COM SUPORTE REALTIME) */}
      {/* ========================================================================= */}
      {isChatModalOpen && selectedOccurrence && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="vault-card rounded-3xl p-6 w-full max-w-2xl space-y-4 border border-violet-500/40 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/40 text-violet-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Canal com Morador • Apto {selectedOccurrence.apartment_number || selectedOccurrence.location}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Ocorrência
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeConversation.subject}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context Notice */}
            <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/20 text-[11px] text-violet-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
              <span>Mensagens entregues em tempo real. O anonimato da denúncia permanece 100% resguardado.</span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-500 text-[10px] shrink-0 font-bold uppercase">Modelos:</span>
              {[
                'Solicitamos adequar o volume do som conforme regulamento interno.',
                'Detectamos ruído constante nesta unidade. Favor atenuar.',
                'Agradecemos a colaboração com a tranquilidade coletiva.'
              ].map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNewChatMessage(tpl)}
                  className="px-2.5 py-1 rounded-lg bg-space-900 border border-white/10 hover:border-violet-500/50 text-slate-300 hover:text-white shrink-0 transition cursor-pointer"
                >
                  {tpl.slice(0, 32)}...
                </button>
              ))}
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 rounded-2xl bg-space-950/70 border border-white/5 min-h-[260px] max-h-[380px]">
              {chatMessages.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Nenhuma mensagem trocada ainda. Inicie o diálogo abaixo.
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = user?.id ? msg.sender_id === user.id : msg.sender_role === 'syndic';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400">
                        <span className={`font-bold ${isMe ? 'text-violet-300' : 'text-blue-400'}`}>
                          {isMe ? 'Você (Síndico Geral)' : (msg.sender_name || 'Morador')}
                        </span>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-tr-none shadow-md'
                            : 'bg-space-900 border border-white/10 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content || msg.message}</p>
                      </div>

                      <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
                        {isMe && (
                          <span>{msg.read_at ? '✓✓ Visualizada' : '✓ Enviada'}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form Input */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-2 border-t border-white/10">
              <input
                type="text"
                value={newChatMessage}
                onChange={e => setNewChatMessage(e.target.value)}
                placeholder="Digite sua mensagem para a unidade..."
                className="flex-1 bg-space-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={isSendingChatMessage || !newChatMessage.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 text-white font-bold text-xs shadow-glow-purple transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingChatMessage ? '...' : 'Enviar'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APLICAR MULTA SIMULADA */}
      {/* ========================================================================= */}
      {isFineModalOpen && selectedOccurrence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="vault-card rounded-3xl p-6 w-full max-w-lg space-y-5 border border-red-500/30 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-red-400">
                <DollarSign className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Aplicar Multa Regimental</h3>
              </div>
              <button onClick={() => setIsFineModalOpen(false)} className="text-slate-400 hover:text-white text-xs cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmFine} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Unidade Infratora:</label>
                  <input
                    type="text"
                    disabled
                    value={`Apartamento ${selectedOccurrence.apartment_number || selectedOccurrence.location}`}
                    className="w-full bg-space-950/80 border border-white/10 rounded-xl p-2.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Valor da Multa (R$):</label>
                  <input
                    type="number"
                    step="50"
                    min="50"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(Number(e.target.value))}
                    required
                    className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white font-mono font-bold focus:border-red-500 focus:outline-none text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Data de Vencimento:</label>
                <input
                  type="date"
                  value={fineDueDate}
                  onChange={(e) => setFineDueDate(e.target.value)}
                  required
                  className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Motivo / Enquadramento Regimental:</label>
                <input
                  type="text"
                  value={fineReason}
                  onChange={(e) => setFineReason(e.target.value)}
                  required
                  className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Observações Adicionais:</label>
                <textarea
                  rows={2}
                  value={fineNotes}
                  onChange={(e) => setFineNotes(e.target.value)}
                  placeholder="Ex: Infração reincidente apurada por telemetria contínua..."
                  className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsFineModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold shadow-glow-red transition cursor-pointer"
                >
                  Confirmar e Gerar Boleto Simulado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DOCUMENTO DE COBRANÇA (FALLBACK INTERNO) */}
      {/* ========================================================================= */}
      {isBillingDocModalOpen && activeFineToView && (
        <PrintableBoleto
          fine={activeFineToView}
          onClose={() => setIsBillingDocModalOpen(false)}
          onSimulatePayment={handleSimulatePayment}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: CANCELAR MULTA SIMULADA (COM AUDITORIA) */}
      {/* ========================================================================= */}
      {isCancelFineModalOpen && fineToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="vault-card rounded-3xl p-6 w-full max-w-md space-y-4 border border-red-500/30 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Cancelar Multa Simulada</h3>
              </div>
              <button
                onClick={() => setIsCancelFineModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20 text-xs text-red-300 space-y-1">
              <p>
                Cancelando multa <strong>{fineToCancel.fine_number}</strong> (R$ {fineToCancel.amount.toFixed(2)}) da unidade {fineToCancel.apartment_number ? `Apto ${fineToCancel.apartment_number}` : ''}.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-semibold block">
                Motivo do Cancelamento: *
              </label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Descreva a justificativa do cancelamento..."
                required
                className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsCancelFineModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isCancellingFine || !cancellationReason.trim()}
                onClick={handleConfirmCancelFine}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow-red transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isCancellingFine ? 'Cancelando...' : 'Confirmar Cancelamento'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR NOVA OCORRÊNCIA (PELO SÍNDICO) */}
      {/* ========================================================================= */}
      {isNewOccurrenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="vault-card rounded-3xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Registrar Nova Ocorrência</h3>
              <button onClick={() => setIsNewOccurrenceModalOpen(false)} className="text-slate-400 hover:text-white text-xs cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOccurrence} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Tipo de Ocorrência:</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="Música Alta / Som Mecânico">Música Alta / Som Mecânico</option>
                  <option value="Reforma Fora do Horário">Reforma Fora do Horário</option>
                  <option value="Festas e Algazarras">Festas e Algazarras</option>
                  <option value="Ruído de Impacto / Salto">Ruído de Impacto / Salto</option>
                  <option value="Outros Ruídos Urbanos">Outros Ruídos Urbanos</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Unidade Denunciada:</label>
                <select
                  value={newTargetAptId}
                  onChange={(e) => setNewTargetAptId(e.target.value)}
                  className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">Selecione uma unidade residencial...</option>
                  {apartments.map((a) => (
                    <option key={a.id} value={a.id}>
                      Apartamento {a.number} (Andar {a.floor || 1})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Descrição dos Fatos:</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Relate detalhadamente os acontecimentos..."
                  required
                  className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="sindicoAnon"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded bg-space-900 border-white/20 text-violet-600"
                />
                <label htmlFor="sindicoAnon" className="text-slate-300 text-xs">
                  Proteger identidade do relator (Registrar como Denúncia Anônima)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewOccurrenceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 text-white font-bold shadow-glow-purple transition cursor-pointer"
                >
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
