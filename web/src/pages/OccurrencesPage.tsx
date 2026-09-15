import React, { useState, useEffect } from 'react';
import { Occurrence, OccurrenceComment, OccurrenceStatus, SimulatedFine, Apartment, Conversation, ConversationMessage } from '../types/database.types';
import { DataService, localStore } from '../lib/dataService';
import { useAuth } from '../contexts/AuthContext';
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Plus, 
  Send, 
  User, 
  MapPin, 
  Info,
  Calendar,
  DollarSign,
  FileText,
  Printer,
  Check,
  Building2,
  Volume2,
  Search,
  Filter,
  CreditCard,
  ShieldCheck,
  HelpCircle,
  QrCode,
  X,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { PrintableBoleto } from '../components/PrintableBoleto';

interface OccurrencesPageProps {
  occurrences: Occurrence[];
  onRefresh: () => void;
}

export const OccurrencesPage: React.FC<OccurrencesPageProps> = ({ occurrences, onRefresh }) => {
  const { user, role } = useAuth();
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(occurrences[0] || null);
  const [comments, setComments] = useState<OccurrenceComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterApartmentId, setFilterApartmentId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [fines, setFines] = useState<SimulatedFine[]>([]);

  // Modais
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

  // Abertura do Chat com o Morador (REUTILIZA CONVERSA EXISTENTE)
  const handleOpenOccurrenceChat = async () => {
    if (!selectedOccurrence) return;

    let targetAptId = selectedOccurrence.apartment_id;
    if (!targetAptId) {
      const foundApt = apartments.find(a => 
        (selectedOccurrence.apartment_number && a.number === selectedOccurrence.apartment_number) ||
        (selectedOccurrence.location && selectedOccurrence.location.includes(a.number))
      );
      if (foundApt) targetAptId = foundApt.id;
    }

    // Reutiliza a conversa se já existir para esta ocorrência
    const conv = await DataService.getOrCreateOccurrenceConversation(selectedOccurrence.id, {
      condominium_id: selectedOccurrence.condominium_id || user?.condominium_id || '00000000-0000-0000-0000-000000000001',
      apartment_id: targetAptId || undefined,
      apartment_number: selectedOccurrence.apartment_number,
      type: 'ocorrencia',
      title: `Ocorrência #${selectedOccurrence.id.slice(0, 8)} • ${selectedOccurrence.type}`,
      subject: `Ocorrência #${selectedOccurrence.id.slice(0, 8)} • ${selectedOccurrence.type}`,
      initial_message: `Olá! Entramos em contato referente à ocorrência registrada sobre "${selectedOccurrence.type}" na unidade ${selectedOccurrence.apartment_number || selectedOccurrence.location}. Gostaríamos de orientar a respeito das regras de convivência acústica do condomínio e solicitar adequação dos níveis de ruído.`,
    });

    setActiveConversation(conv);
    const msgs = await DataService.getMessages(conv.id);
    setChatMessages(msgs);
    await DataService.markMessagesAsRead(conv.id, user?.id);
    setIsChatModalOpen(true);
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
      setChatMessages(prev => [...prev, msg]);
      setNewChatMessage('');
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  // Aplicação da Decisão do Síndico
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
      amount: Number(fineAmount) || 500,
      due_date: fineDueDate,
      syndic_notes: fineNotes.trim(),
    });

    setIsFineModalOpen(false);
    setActiveFineToView(fine);
    setIsBillingDocModalOpen(true);
    await loadData();
    onRefresh();
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
      noise_level_db: apt?.current_db,
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

  // Filtragem
  const filteredOccurrences = occurrences.filter(occ => {
    const matchesStatus = filterStatus === 'all' || occ.status === filterStatus;
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
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">ABERTA</span>;
      case 'em análise':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">EM ANÁLISE</span>;
      case 'procedente':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PROCEDENTE</span>;
      case 'improcedente':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">IMPROCEDENTE</span>;
      case 'advertência':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">ADVERTÊNCIA</span>;
      case 'multa':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">MULTADA</span>;
      case 'resolvida':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">RESOLVIDA</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Gestão de Ocorrências & Decisões do Síndico
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
              Administração & Cobrança
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recepção de denúncias com anonimato protegido, cruzamento com telemetria acústica (dB SPL), parecer do síndico e emissão de multas simuladas.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsNewOccurrenceModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold px-4 py-2.5 rounded-2xl text-xs shadow-glow-purple transition"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nova Ocorrência</span>
          </button>
        </div>
      </div>

      {/* Decision Success Notification */}
      {decisionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{decisionSuccessMsg}</span>
        </div>
      )}

      {/* Main Split View: Left List, Right Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Occurrences List & Filters */}
        <div className="space-y-4">
          {/* Search & Apartment Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tipo, descrição ou unidade..."
                className="w-full bg-space-900/90 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterApartmentId}
                onChange={(e) => setFilterApartmentId(e.target.value)}
                className="w-full bg-space-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
              >
                <option value="all">Todas as Unidades</option>
                {apartments.map((a) => (
                  <option key={a.id} value={a.id}>Apartamento {a.number}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1 bg-space-900/80 p-1.5 rounded-2xl border border-white/5 text-[11px]">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'aberta', label: 'Abertas' },
              { id: 'em análise', label: 'Em Análise' },
              { id: 'procedente', label: 'Procedentes' },
              { id: 'advertência', label: 'Advertência' },
              { id: 'multa', label: 'Multadas' },
              { id: 'resolvida', label: 'Resolvidas' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setFilterStatus(s.id)}
                className={`px-2.5 py-1 rounded-xl font-medium transition-all ${
                  filterStatus === s.id
                    ? 'bg-violet-600 text-white shadow-glow-purple font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Occurrences Cards Scroll */}
          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {filteredOccurrences.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs vault-card rounded-2xl">
                Nenhuma ocorrência encontrada com os filtros selecionados.
              </div>
            ) : (
              filteredOccurrences.map(occ => {
                const isSelected = selectedOccurrence?.id === occ.id;
                return (
                  <div
                    key={occ.id}
                    onClick={() => setSelectedOccurrence(occ)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-space-900 border-violet-500 shadow-glow-purple'
                        : 'bg-space-900/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-white text-xs truncate max-w-[190px]">{occ.type}</span>
                      {getStatusBadge(occ.status)}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">{occ.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                      <span className="flex items-center gap-1 font-semibold text-violet-300">
                        <Building2 className="w-3 h-3 text-violet-400" />
                        Apto {occ.apartment_number || occ.location?.replace(/[^0-9]/g, '') || 'Geral'}
                      </span>

                      {occ.noise_level_db && (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-amber-400 font-bold">
                          <Volume2 className="w-3 h-3" />
                          {occ.noise_level_db.toFixed(1)} dB
                        </span>
                      )}

                      <span>{new Date(occ.occurred_at).toLocaleDateString('pt-BR')}</span>
                    </div>

                    {occ.anonymous && (
                      <div className="mt-2 text-[10px] text-violet-400/90 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-violet-400" />
                        <span>Denúncia Anônima (Identidade Protegida)</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Occurrence Details, Decision & Fines */}
        <div className="lg:col-span-2">
          {selectedOccurrence ? (
            <div className="vault-card rounded-3xl p-6 space-y-6 animate-fadeIn">
              {/* Header & Main Info */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-white/10">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-black text-white">{selectedOccurrence.type}</h2>
                    {getStatusBadge(selectedOccurrence.status)}
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                      Prioridade {selectedOccurrence.priority}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1 font-medium text-white">
                      <Building2 className="w-3.5 h-3.5 text-violet-400" />
                      Unidade Denunciada: <strong className="text-violet-300">Apto {selectedOccurrence.apartment_number || selectedOccurrence.location}</strong>
                    </span>

                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(selectedOccurrence.occurred_at).toLocaleString('pt-BR')}
                    </span>

                    {selectedOccurrence.anonymous ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[11px] font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                        Denúncia Anônima (Identidade Protegida)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Denunciante: {selectedOccurrence.reporter_name || 'Morador Identificado'}
                      </span>
                    )}
                  </div>
                </div>

                {/* AÇÕES DESTACADAS DA OCORRÊNCIA */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={handleOpenOccurrenceChat}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 hover:text-white border border-violet-500/40 text-xs font-bold transition shadow-sm"
                    title="Abrir canal direto e privado de mensagem com a unidade"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                    <span>💬 Conversar com morador</span>
                  </button>

                  <button
                    onClick={() => handleApplyDecision('advertência')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition"
                    title="Emitir advertência formal regimental"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>⚠️ Emitir advertência</span>
                  </button>

                  <button
                    onClick={() => setIsFineModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-glow-red transition"
                    title="Aplicar Multa Fictícia ao Morador da Unidade Denunciada"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>💰 APLICAR MULTA</span>
                  </button>

                  <button
                    onClick={() => handleApplyDecision('resolvida')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition"
                    title="Marcar ocorrência como concluída/resolvida"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>✓ Encerrar ocorrência</span>
                  </button>

                  {linkedFine && (
                    <button
                      onClick={() => {
                        setActiveFineToView(linkedFine);
                        setIsBillingDocModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-semibold transition"
                      title="Visualizar Boleto / Cobrança Simulada da Ocorrência"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver Boleto Simulado</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ÁREA CLARA DE CHAT COM MORADOR */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/60 via-purple-950/40 to-space-900 border border-violet-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/40 text-violet-300 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      Comunicação com o Morador
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        Apto {selectedOccurrence.apartment_number || selectedOccurrence.location}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300">
                      Canal de diálogo direto para notificar, solicitar esclarecimentos ou pedir redução do ruído.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenOccurrenceChat}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs shadow-glow-purple transition flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>💬 CONVERSAR COM MORADOR</span>
                </button>
              </div>

              {/* Descrição e Telemetria Acústica */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 p-4 rounded-2xl bg-space-900/80 border border-white/5 space-y-1.5">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Relato do Morador</h4>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedOccurrence.description}</p>
                </div>

                {/* Card de Evidência Acústica */}
                <div className="p-4 rounded-2xl bg-space-900/80 border border-white/5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                      Telemetria de Ruído
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Medições acústicas da unidade denunciada registradas no horário:
                    </p>
                  </div>

                  <div className="pt-3">
                    <span className="text-2xl font-black font-mono text-amber-400">
                      {selectedOccurrence.noise_level_db ? `${selectedOccurrence.noise_level_db.toFixed(1)} dB` : '74.5 dB'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Sensor MAX9814 calibrado</span>
                  </div>
                </div>
              </div>

              {/* LINHA DO TEMPO / HISTÓRICO INTEGRADO DA OCORRÊNCIA */}
              <div className="p-5 rounded-2xl bg-space-900/70 border border-white/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-400" />
                    Linha do Tempo & Histórico Integrado
                  </h4>
                  <span className="text-[10px] text-slate-500">Auditoria cronológica da ocorrência</span>
                </div>

                <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                  {/* 1. Sensor Telemetry */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center">
                      <Volume2 className="w-2 h-2 text-amber-300" />
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Telemetria Acústica Registrada</span>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {selectedOccurrence.noise_level_db ? `${selectedOccurrence.noise_level_db.toFixed(1)} dB SPL` : '74.5 dB SPL'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">Captado automaticamente pelos sensores MAX9814 da unidade.</p>
                    </div>
                  </div>

                  {/* 2. Occurrence Registered */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
                      <FileText className="w-2 h-2 text-blue-300" />
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">Denúncia Registrada ({selectedOccurrence.type})</span>
                        <span className="text-[10px] text-slate-500">{new Date(selectedOccurrence.occurred_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {selectedOccurrence.anonymous ? 'Denúncia anônima com privacidade 100% resguardada.' : `Registrada pelo morador ${selectedOccurrence.reporter_name || ''}.`}
                      </p>
                    </div>
                  </div>

                  {/* 3. Diálogo / Chat */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-violet-500/20 border-2 border-violet-400 flex items-center justify-center">
                      <MessageSquare className="w-2 h-2 text-violet-300" />
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">Canal de Comunicação com a Unidade</span>
                        <button
                          type="button"
                          onClick={handleOpenOccurrenceChat}
                          className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold underline"
                        >
                          Abrir Chat
                        </button>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Canal direto aberto para comunicação síndico ↔ moradores da unidade {selectedOccurrence.apartment_number || selectedOccurrence.location}.
                      </p>
                    </div>
                  </div>

                  {/* 4. Advertência se aplicável */}
                  {(selectedOccurrence.status === 'advertência' || selectedOccurrence.decision === 'advertência') && (
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center">
                        <AlertTriangle className="w-2 h-2 text-amber-300" />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-amber-400">Advertência Formal Emitida</span>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          {selectedOccurrence.syndic_notes || 'Notificação emitida para adequação imediata do som.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 5. Multa se aplicável */}
                  {linkedFine && (
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center">
                        <DollarSign className="w-2 h-2 text-red-300" />
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-400">Multa Aplicada: R$ {linkedFine.amount.toFixed(2)}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            linkedFine.status === 'paga' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {linkedFine.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Boleto simulado #{linkedFine.fine_number} gerado para a unidade.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 6. Encerramento se aplicável */}
                  {selectedOccurrence.status === 'resolvida' && (
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-2 h-2 text-emerald-300" />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-emerald-400">Ocorrência Concluída e Encerrada</span>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          {selectedOccurrence.syndic_notes || 'Situação normalizada e finalizada pelo síndico.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PAINEL DE DECISÃO FORMAL DO SÍNDICO */}
              <div className="p-5 rounded-2xl bg-space-900 border border-violet-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-violet-400" />
                      Parecer & Decisão do Síndico
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Formalize a análise da denúncia. Todas as decisões são salvas no banco de dados e registradas na auditoria.
                    </p>
                  </div>

                  {selectedOccurrence.decision && (
                    <span className="text-[11px] text-slate-400">
                      Última decisão: <strong className="text-white">{selectedOccurrence.decision.toUpperCase()}</strong>
                    </span>
                  )}
                </div>

                {/* Seletor de Estados / Decisões */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { id: 'em análise', label: 'Em Análise', color: 'bg-blue-600 hover:bg-blue-500' },
                    { id: 'procedente', label: 'Procedente (Confirmada)', color: 'bg-emerald-600 hover:bg-emerald-500' },
                    { id: 'improcedente', label: 'Improcedente (Não Confirmada)', color: 'bg-slate-700 hover:bg-slate-600' },
                    { id: 'advertência', label: 'Emitir Advertência', color: 'bg-amber-600 hover:bg-amber-500' },
                    { id: 'multa', label: 'Aplicar Multa', color: 'bg-red-600 hover:bg-red-500' },
                    { id: 'resolvida', label: 'Concluir / Resolvida', color: 'bg-purple-600 hover:bg-purple-500' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setDecisionMode(btn.id as OccurrenceStatus)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        decisionMode === btn.id
                          ? `${btn.color} text-white shadow-lg ring-2 ring-white/20`
                          : 'bg-space-950 border border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Campo de Justificativa */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Justificativa / Observação do Síndico:
                  </label>
                  <textarea
                    rows={2}
                    value={syndicNotes}
                    onChange={(e) => setSyndicNotes(e.target.value)}
                    placeholder="Ex: Ocorrência confirmada após conferência dos gráficos de decibéis às 23h30. Advertência ou multa emitida conforme convenção..."
                    className="w-full bg-space-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isSavingDecision}
                    onClick={() => handleApplyDecision()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs shadow-glow-purple transition flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingDecision ? 'Salvando Decisão...' : 'Registrar Decisão no Sistema'}</span>
                  </button>
                </div>
              </div>

              {/* CARD DE MULTA EXISTENTE (se houver multa associada) */}
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
                      <span className="font-bold text-xs text-white">Multa Aplicada: {linkedFine.fine_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        linkedFine.status === 'paga' 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : linkedFine.status === 'cancelada'
                          ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        STATUS: {linkedFine.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Valor: <strong>R$ {linkedFine.amount.toFixed(2)}</strong> • Vencimento: {new Date(linkedFine.due_date).toLocaleDateString('pt-BR')}
                    </p>
                    {linkedFine.status === 'cancelada' && linkedFine.cancellation_reason && (
                      <p className="text-[10px] text-red-400 italic pt-0.5">
                        Cancelada em {linkedFine.cancelled_at ? new Date(linkedFine.cancelled_at).toLocaleDateString('pt-BR') : ''}: {linkedFine.cancellation_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {linkedFine.status === 'pendente' && (
                      <button
                        type="button"
                        onClick={() => handleSimulatePayment(linkedFine.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition flex items-center gap-1"
                        title="Simular baixa do pagamento para demonstração"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Simular Pagamento</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFineToView(linkedFine);
                        setIsBillingDocModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-glow-purple transition flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Visualizar Documento</span>
                    </button>
                    {linkedFine.status !== 'cancelada' && (
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(linkedFine)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold transition flex items-center gap-1"
                        title="Cancelar multa com registro em ata/auditoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancelar Multa</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Histórico e Providências */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-400" />
                  Histórico de Providências & Auditoria ({comments.length})
                </h4>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">Nenhum despacho ou observação registrada ainda.</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="p-3 rounded-xl bg-space-900/60 border border-white/5 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-violet-300">{c.author_name || 'Administrador'}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{c.comment}</p>
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
                    className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="vault-card rounded-3xl p-12 text-center text-slate-500 text-xs">
              Selecione uma ocorrência ao lado para visualizar os detalhes e tomar uma decisão.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: APLICAR MULTA SIMULADA */}
      {/* ========================================================================= */}
      {isFineModalOpen && selectedOccurrence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="vault-card rounded-3xl p-6 w-full max-w-lg space-y-5 border border-red-500/30 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-red-400">
                <DollarSign className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Aplicar Multa por Infração Acústica</h3>
              </div>
              <button onClick={() => setIsFineModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
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
                  placeholder="Ex: Infração reiterada conforme registros acústicos automatizados..."
                  className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-[11px] text-red-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-red-400" />
                  Aviso de Simulação Acadêmica:
                </span>
                <p>
                  Esta multa será registrada como <strong>COBRANÇA SIMULADA</strong> para fins de demonstração do sistema dBSound. Não possui validade bancária real.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsFineModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold shadow-glow-red transition"
                >
                  Confirmar e Emitir Boleto Simulado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DOCUMENTO DE COBRANÇA / BOLETO SIMULADO */}
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
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20 text-xs text-red-300 space-y-1.5">
              <p>
                Você está cancelando a multa <strong>{fineToCancel.fine_number}</strong> no valor de <strong>R$ {fineToCancel.amount.toFixed(2)}</strong> da unidade {fineToCancel.apartment_number ? `Apto ${fineToCancel.apartment_number}` : ''}.
              </p>
              <p className="text-[11px] text-slate-400">
                O cancelamento será registrado na auditoria com data, responsável e justificativa. O morador da unidade receberá uma notificação informando o cancelamento.
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
                placeholder="Descreva o motivo do cancelamento (ex: Acordo entre as partes, aferição revista, tolerância concedida)..."
                required
                className="w-full bg-space-950 border border-white/15 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsCancelFineModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isCancellingFine || !cancellationReason.trim()}
                onClick={handleConfirmCancelFine}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow-red transition flex items-center gap-1.5"
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
              <button onClick={() => setIsNewOccurrenceModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
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
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 text-white font-bold shadow-glow-purple transition"
                >
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CHAT BIDIRECIONAL COM O MORADOR DA UNIDADE */}
      {/* ========================================================================= */}
      {isChatModalOpen && selectedOccurrence && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
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
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Banner de Contexto e Proteção */}
            <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/20 text-[11px] text-violet-300 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
                <span>As mensagens chegam instantaneamente na <strong>Central de Mensagens</strong> do morador desta unidade. O anonimato do denunciante original permanece 100% resguardado.</span>
              </span>
            </div>

            {/* Quick Presets / Frases Rápidas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-500 text-[10px] shrink-0 font-bold uppercase">Modelos:</span>
              {[
                'Solicitamos abaixar o volume do som conforme regimento interno.',
                'Detectamos ruído elevado nesta unidade. Favor adequar o volume.',
                'Agradecemos a atenção e colaboração com a vizinhança.'
              ].map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNewChatMessage(tpl)}
                  className="px-2.5 py-1 rounded-lg bg-space-900 border border-white/10 hover:border-violet-500/50 text-slate-300 hover:text-white shrink-0 transition"
                >
                  {tpl.slice(0, 35)}...
                </button>
              ))}
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 rounded-2xl bg-space-950/70 border border-white/5 min-h-[260px] max-h-[380px]">
              {chatMessages.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Nenhuma mensagem trocada ainda. Digite uma mensagem abaixo para iniciar o diálogo com o morador.
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
                          <span>{msg.read ? '✓✓ Visualizada' : '✓ Enviada'}</span>
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
                placeholder="Digite sua mensagem ou orientação para o morador..."
                className="flex-1 bg-space-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={isSendingChatMessage || !newChatMessage.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 text-white font-bold text-xs shadow-glow-purple transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingChatMessage ? 'Enviando...' : 'Enviar'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
