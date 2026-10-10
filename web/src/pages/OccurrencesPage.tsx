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

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isBulletinModalOpen, setIsBulletinModalOpen] = useState(false);
  const [isNewOccurrenceModalOpen, setIsNewOccurrenceModalOpen] = useState(false);
  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [isBillingDocModalOpen, setIsBillingDocModalOpen] = useState(false);
  const [activeFineToView, setActiveFineToView] = useState<SimulatedFine | null>(null);

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ConversationMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);

  const [decisionMode, setDecisionMode] = useState<OccurrenceStatus>('em análise');
  const [syndicNotes, setSyndicNotes] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [decisionSuccessMsg, setDecisionSuccessMsg] = useState<string | null>(null);

  const [isCancelFineModalOpen, setIsCancelFineModalOpen] = useState(false);
  const [fineToCancel, setFineToCancel] = useState<SimulatedFine | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancellingFine, setIsCancellingFine] = useState(false);

  const [fineAmount, setFineAmount] = useState<number>(150);
  const [fineDueDate, setFineDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [fineReason, setFineReason] = useState('Infração por ruído excessivo acima dos limites permitidos');
  const [fineNotes, setFineNotes] = useState('');

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

  const handleOpenFineModalFor = (occ: Occurrence) => {
    setSelectedOccurrence(occ);
    setFineReason(`Infração: ${occ.type} na unidade ${occ.apartment_number || occ.location}`);
    setIsFineModalOpen(true);
  };

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

  const handleOpenDetailsFor = (occ: Occurrence) => {
    setSelectedOccurrence(occ);
    setIsDetailsModalOpen(true);
  };

  const handleOpenCancelModal = (fine: SimulatedFine) => {
    setFineToCancel(fine);
    setCancellationReason('');
    setIsCancelFineModalOpen(true);
  };

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

    window.open(`/boleto/${fine.id}`, '_blank');
  };

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

  const linkedFine = selectedOccurrence
    ? fines.find(f => f.occurrence_id === selectedOccurrence.id || (selectedOccurrence.apartment_id && f.apartment_id === selectedOccurrence.apartment_id && f.status === 'pendente'))
    : null;

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
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">ABERTA</span>;
      case 'em análise':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">EM ANÁLISE</span>;
      case 'procedente':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">PROCEDENTE</span>;
      case 'improcedente':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">IMPROCEDENTE</span>;
      case 'advertência':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">ADVERTÊNCIA</span>;
      case 'multa':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">MULTADA</span>;
      case 'resolvida':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">RESOLVIDA</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  const getNoiseBadgeColor = (db?: number | null) => {
    const val = db ?? 74.5;
    if (val >= 75) return 'text-rose-700 bg-rose-50 border-rose-200';
    if (val >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn">
      
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Ocorrências & Decisões
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Administração
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Monitoramento em Tempo Real • Gestão de Ruído & Decisões Administrativas
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setIsBulletinModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold px-4 py-2 rounded-lg text-xs transition shadow-subtle cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Ver Boletim</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewOccurrenceModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-xs shadow-subtle transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova ocorrência</span>
          </button>
        </div>
      </header>

      {/* Success alert */}
      {decisionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{decisionSuccessMsg}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="w-full space-y-3">
        
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200/80 w-full shadow-subtle">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Apartment Select */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tipo, apartamento, palavras-chave ou descrição..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-subtle"
            />
          </div>

          <div>
            <select
              value={filterApartmentId}
              onChange={(e) => setFilterApartmentId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-subtle"
            >
              <option value="all">Todos os Apartamentos / Unidades</option>
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>Apartamento {a.number} (Andar {a.floor || 1})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      
      
      
      {/* Occurrences List */}
      <div className="w-full space-y-4">
        {filteredOccurrences.length === 0 ? (
          <div className="w-full p-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200 shadow-subtle">
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
                className="w-full p-5 sm:p-6 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-subtle space-y-4"
              >
                {/* Occurrence Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold ${noiseBadge}`}>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{noiseVal.toFixed(1)} dB SPL</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Apto {occ.apartment_number || occ.location?.replace(/[^0-9]/g, '') || 'Geral'}</span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-wide">
                      {occ.type}
                    </h3>

                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(occ.occurred_at).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {occ.anonymous && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <ShieldAlert className="w-3 h-3 text-slate-500" />
                        Anônima
                      </span>
                    )}
                    {getStatusBadge(occ.status)}
                  </div>
                </div>

                {/* Occurrence Description */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                  {occ.description}
                </p>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    
                    <button
                      type="button"
                      onClick={() => handleOpenOccurrenceChat(occ)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition cursor-pointer"
                      title="Abrir chat direto com a unidade"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chat</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyWarningFor(occ)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition cursor-pointer"
                      title="Emitir advertência formal para a unidade"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Advertência</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenFineModalFor(occ)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                      title="Aplicar multa regimental à unidade"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-rose-600" />
                      <span>Multa</span>
                    </button>

                    {occFine && (
                      <button
                        type="button"
                        onClick={() => window.open(`/boleto/${occFine.id}`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition cursor-pointer"
                        title="Abrir documento de cobrança simulada em nova aba"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Boleto #{occFine.fine_number}</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenDetailsFor(occ)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-subtle transition cursor-pointer"
                    >
                      <span>Ver detalhes</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      
      
      
      {/* Details Modal */}
      {isDetailsModalOpen && selectedOccurrence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl space-y-6 border border-slate-200 shadow-elevated max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{selectedOccurrence.type}</h2>
                  {getStatusBadge(selectedOccurrence.status)}
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                    Prioridade {selectedOccurrence.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Protocolo #{selectedOccurrence.id.slice(0, 12)} • Registrada em {new Date(selectedOccurrence.occurred_at).toLocaleString('pt-BR')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unit info & Telemetry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Dados da Unidade & Relato
                </h4>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span>
                    Unidade: <strong className="text-slate-900 font-semibold">Apto {selectedOccurrence.apartment_number || selectedOccurrence.location}</strong>
                  </span>
                  {selectedOccurrence.anonymous ? (
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      Denúncia Anônima (Privacidade Resguardada)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-500">
                      <User className="w-3.5 h-3.5" />
                      Denunciante: {selectedOccurrence.reporter_name || 'Morador'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed pt-2 border-t border-slate-200/60 whitespace-pre-wrap">
                  {selectedOccurrence.description}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs uppercase font-bold tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-amber-600" />
                    Telemetria Acústica
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Medição registrada pelos sensores MAX9814 da unidade no momento da infração:
                  </p>
                </div>

                <div className="pt-2">
                  <span className="text-3xl font-bold font-mono text-amber-700">
                    {selectedOccurrence.noise_level_db ? `${selectedOccurrence.noise_level_db.toFixed(1)} dB` : '74.5 dB'}
                  </span>
                  <span className="text-[10px] text-slate-400 block">SPL calibrado • Limiar noturno excedido</span>
                </div>
              </div>
            </div>

            {/* Direct Channel with Unit */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-blue-900">Canal Direto com a Unidade Denunciada</h4>
                  <p className="text-[11px] text-blue-800">
                    Converse diretamente com o morador para solicitar adequação de volume com confidencialidade.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleOpenOccurrenceChat(selectedOccurrence);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-subtle transition flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Abrir Chat com Morador</span>
              </button>
            </div>

            {/* Timeline */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Linha do Tempo & Histórico da Ocorrência
              </h4>

              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
                
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center">
                    <Volume2 className="w-2 h-2 text-amber-700" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Telemetria Acústica Registrada</span>
                    <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded ml-2">
                      {selectedOccurrence.noise_level_db ? `${selectedOccurrence.noise_level_db.toFixed(1)} dB SPL` : '74.5 dB SPL'}
                    </span>
                    <p className="text-slate-500 text-[11px]">Captação automatizada pelos sensores acústicos.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center">
                    <FileText className="w-2 h-2 text-blue-700" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Denúncia Registrada ({selectedOccurrence.type})</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-2">{new Date(selectedOccurrence.occurred_at).toLocaleString('pt-BR')}</span>
                    <p className="text-slate-500 text-[11px]">
                      {selectedOccurrence.anonymous ? 'Denúncia registrada com anonimato protegido.' : `Registrada por ${selectedOccurrence.reporter_name || 'Morador'}.`}
                    </p>
                  </div>
                </div>

                {selectedOccurrence.decision && (
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center">
                      <Check className="w-2 h-2 text-emerald-700" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Parecer da Administração: {selectedOccurrence.decision.toUpperCase()}</span>
                      <p className="text-slate-500 text-[11px]">{selectedOccurrence.syndic_notes || 'Decisão homologada na auditoria.'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Decision Workflow */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-4 shadow-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Parecer & Decisão Formal do Síndico
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Selecione a resolução administrativa da denúncia:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'em análise', label: 'Em Análise', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                  { id: 'procedente', label: 'Procedente (Confirmada)', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                  { id: 'improcedente', label: 'Improcedente', color: 'bg-slate-700 hover:bg-slate-800 text-white' },
                  { id: 'advertência', label: 'Emitir Advertência', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
                  { id: 'multa', label: 'Aplicar Multa', color: 'bg-rose-600 hover:bg-rose-700 text-white' },
                  { id: 'resolvida', label: 'Concluir / Resolvida', color: 'bg-slate-800 hover:bg-slate-900 text-white' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setDecisionMode(btn.id as OccurrenceStatus)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      decisionMode === btn.id
                        ? `${btn.color} shadow-sm ring-2 ring-blue-500/20`
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 block">
                  Justificativa / Parecer do Síndico:
                </label>
                <textarea
                  rows={2}
                  value={syndicNotes}
                  onChange={(e) => setSyndicNotes(e.target.value)}
                  placeholder="Justifique a decisão com base na conferência dos decibéis e regimento..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  disabled={isSavingDecision}
                  onClick={() => handleApplyDecision()}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-subtle transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingDecision ? 'Salvando...' : 'Registrar Decisão no Sistema'}</span>
                </button>
              </div>
            </div>

            {/* Linked Fine (if any) */}
            {linkedFine && (
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                linkedFine.status === 'cancelada'
                  ? 'bg-slate-50 border-slate-200'
                  : linkedFine.status === 'paga'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className={`w-4 h-4 ${linkedFine.status === 'cancelada' ? 'text-slate-400' : 'text-rose-600'}`} />
                    <span className="font-bold text-xs text-slate-900">Multa Registrada: {linkedFine.fine_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      linkedFine.status === 'paga' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : linkedFine.status === 'cancelada'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {linkedFine.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Valor: <strong>R$ {linkedFine.amount.toFixed(2)}</strong> • Vencimento: {new Date(linkedFine.due_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {linkedFine.status === 'pendente' && (
                    <button
                      type="button"
                      onClick={() => handleSimulatePayment(linkedFine.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simular Pagamento</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.open(`/boleto/${linkedFine.id}`, '_blank')}
                    className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-subtle transition flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver Boleto</span>
                  </button>
                  {linkedFine.status !== 'cancelada' && (
                    <button
                      type="button"
                      onClick={() => handleOpenCancelModal(linkedFine)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancelar Multa</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Comments Thread */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Histórico de Providências & Auditoria ({comments.length})
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Nenhum despacho registrado ainda.</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800">{c.author_name || 'Administrador'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(c.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-600">{c.comment}</p>
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
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Enviar</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      
      
      {/* Bulletin Modal */}
      {isBulletinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-5 border border-slate-200 shadow-elevated max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Boletim Geral de Multas & Notificações</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulletinModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick counters */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total de Multas</span>
                <span className="text-xl font-bold text-slate-900 font-mono">{fines.length}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Pendentes</span>
                <span className="text-xl font-bold text-amber-800 font-mono">
                  {fines.filter(f => f.status === 'pendente').length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Pagas / Baixadas</span>
                <span className="text-xl font-bold text-emerald-800 font-mono">
                  {fines.filter(f => f.status === 'paga').length}
                </span>
              </div>
            </div>

            {/* Fines List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Documentos de Cobrança Simulada Gerados
              </h4>

              {fines.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhuma multa emitida no condomínio.</p>
              ) : (
                fines.map(f => (
                  <div key={f.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Boleto #{f.fine_number}</span>
                        <span className="text-blue-700 font-semibold">
                          {f.apartment_number ? `Apto ${f.apartment_number}` : 'Unidade'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.status === 'paga' ? 'bg-emerald-100 text-emerald-800' :
                          f.status === 'cancelada' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {f.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        R$ {f.amount.toFixed(2)} • Vencimento: {new Date(f.due_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.open(`/boleto/${f.id}`, '_blank')}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-subtle transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ver Documento</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Occurrence Chat Modal */}
      {isChatModalOpen && selectedOccurrence && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 border border-slate-200 shadow-elevated flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Canal com Morador • Apto {selectedOccurrence.apartment_number || selectedOccurrence.location}
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Ocorrência
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeConversation.subject}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Mensagens entregues em tempo real. O anonimato da denúncia permanece 100% resguardado.</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-400 text-[10px] shrink-0 font-bold uppercase">Modelos:</span>
              {[
                'Solicitamos adequar o volume do som conforme regulamento interno.',
                'Detectamos ruído constante nesta unidade. Favor atenuar.',
                'Agradecemos a colaboração com a tranquilidade coletiva.'
              ].map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNewChatMessage(tpl)}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-slate-900 shrink-0 transition cursor-pointer"
                >
                  {tpl.slice(0, 32)}...
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 rounded-xl bg-slate-50 border border-slate-200 min-h-[260px] max-h-[380px]">
              {chatMessages.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
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
                        <span className={`font-semibold ${isMe ? 'text-blue-700' : 'text-slate-700'}`}>
                          {isMe ? 'Você (Administrador)' : (msg.sender_name || 'Morador')}
                        </span>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-subtle'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-subtle'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content || msg.message}</p>
                      </div>

                      <div className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                        {isMe && (
                          <span>{msg.read_at ? 'Visualizada' : 'Enviada'}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={newChatMessage}
                onChange={e => setNewChatMessage(e.target.value)}
                placeholder="Digite sua mensagem para a unidade..."
                className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isSendingChatMessage || !newChatMessage.trim()}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-subtle transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingChatMessage ? '...' : 'Enviar'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fine Modal */}
      {isFineModalOpen && selectedOccurrence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-5 border border-slate-200 shadow-elevated">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <DollarSign className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Aplicar Multa Regimental</h3>
              </div>
              <button onClick={() => setIsFineModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer" title="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmFine} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Unidade Infratora:</label>
                  <input
                    type="text"
                    disabled
                    value={`Apartamento ${selectedOccurrence.apartment_number || selectedOccurrence.location}`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-medium block mb-1">Valor da Multa (R$):</label>
                  <input
                    type="number"
                    step="50"
                    min="50"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(Number(e.target.value))}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">Data de Vencimento:</label>
                <input
                  type="date"
                  value={fineDueDate}
                  onChange={(e) => setFineDueDate(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">Motivo / Enquadramento Regimental:</label>
                <input
                  type="text"
                  value={fineReason}
                  onChange={(e) => setFineReason(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">Observações Adicionais:</label>
                <textarea
                  rows={2}
                  value={fineNotes}
                  onChange={(e) => setFineNotes(e.target.value)}
                  placeholder="Ex: Infração reincidente apurada por telemetria contínua..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-rose-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFineModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-subtle transition cursor-pointer"
                >
                  Confirmar e Gerar Boleto Simulado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Billing Doc Modal */}
      {isBillingDocModalOpen && activeFineToView && (
        <PrintableBoleto
          fine={activeFineToView}
          onClose={() => setIsBillingDocModalOpen(false)}
          onSimulatePayment={handleSimulatePayment}
        />
      )}

      {/* Cancel Fine Modal */}
      {isCancelFineModalOpen && fineToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 border border-slate-200 shadow-elevated">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Cancelar Multa Simulada</h3>
              </div>
              <button
                onClick={() => setIsCancelFineModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <p>
                Cancelando multa <strong>{fineToCancel.fine_number}</strong> (R$ {fineToCancel.amount.toFixed(2)}) da unidade {fineToCancel.apartment_number ? `Apto ${fineToCancel.apartment_number}` : ''}.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-700 font-semibold block">
                Motivo do Cancelamento: *
              </label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Descreva a justificativa do cancelamento..."
                required
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCancelFineModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isCancellingFine || !cancellationReason.trim()}
                onClick={handleConfirmCancelFine}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs shadow-subtle transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isCancellingFine ? 'Cancelando...' : 'Confirmar Cancelamento'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Occurrence Modal */}
      {isNewOccurrenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 border border-slate-200 shadow-elevated">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Registrar Nova Ocorrência</h3>
              <button onClick={() => setIsNewOccurrenceModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer" title="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOccurrence} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-medium block mb-1">Tipo de Ocorrência:</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Música Alta / Som Mecânico">Música Alta / Som Mecânico</option>
                  <option value="Reforma Fora do Horário">Reforma Fora do Horário</option>
                  <option value="Festas e Algazarras">Festas e Algazarras</option>
                  <option value="Ruído de Impacto / Salto">Ruído de Impacto / Salto</option>
                  <option value="Outros Ruídos Urbanos">Outros Ruídos Urbanos</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-medium block mb-1">Unidade Denunciada:</label>
                <select
                  value={newTargetAptId}
                  onChange={(e) => setNewTargetAptId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                <label className="text-slate-700 font-medium block mb-1">Descrição dos Fatos:</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Relate detalhadamente os acontecimentos..."
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="sindicoAnon"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sindicoAnon" className="text-slate-600 text-xs">
                  Proteger identidade do relator (Registrar como Denúncia Anônima)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewOccurrenceModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-subtle transition cursor-pointer"
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
