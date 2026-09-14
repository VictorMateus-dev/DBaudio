import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, UserPlus, Sliders, Trash2, History, AlertTriangle, 
  CheckCircle, Clock, Shield, Search, ArrowRight, X, Edit3, Volume2, UserCheck, Sparkles, Filter, RefreshCw
} from 'lucide-react';
import { Profile, Apartment, UserHistoryReport, CreateApartmentDTO, UpdateApartmentThresholdsDTO } from '../types/database.types';
import { DataService, localStore } from '../lib/dataService';

export const ResidentsManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'residents' | 'apartments'>('residents');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [selectedUserHistory, setSelectedUserHistory] = useState<UserHistoryReport | null>(null);
  const [allocatingProfile, setAllocatingProfile] = useState<Profile | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');

  // Apartment Create / Edit Modals
  const [showCreateAptModal, setShowCreateAptModal] = useState(false);
  const [newAptNumber, setNewAptNumber] = useState('');
  const [newAptFloor, setNewAptFloor] = useState(1);
  const [newAptDayDb, setNewAptDayDb] = useState(70);
  const [newAptNightDb, setNewAptNightDb] = useState(60);
  const [newAptCritDb, setNewAptCritDb] = useState(80);

  const [editingAptThresholds, setEditingAptThresholds] = useState<Apartment | null>(null);
  const [editDayDb, setEditDayDb] = useState(70);
  const [editNightDb, setEditNightDb] = useState(60);
  const [editCritDb, setEditCritDb] = useState(80);

  // Estados para Alocação Flexível (Unidade Existente ou Criação On-the-Fly)
  const [allocationMode, setAllocationMode] = useState<'existing' | 'new'>('existing');
  const [inlineAptNumber, setInlineAptNumber] = useState('');
  const [inlineAptFloor, setInlineAptFloor] = useState(1);
  const [inlineDayDb, setInlineDayDb] = useState(70);
  const [inlineNightDb, setInlineNightDb] = useState(60);
  const [inlineCritDb, setInlineCritDb] = useState(80);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profs, apts] = await Promise.all([
        DataService.getProfiles(),
        DataService.getApartments(),
      ]);
      setProfiles([...profs]);
      setApartments([...apts]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = localStore.subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  const openAllocationModal = (profile: Profile, preselectedAptId?: string) => {
    setAllocatingProfile(profile);
    const initialAptId = preselectedAptId || (apartments.length > 0 ? apartments[0].id : '');
    setSelectedApartmentId(initialAptId);
    setAllocationMode(apartments.length > 0 ? 'existing' : 'new');
    setInlineAptNumber('');
    setInlineAptFloor(1);
    setInlineDayDb(70);
    setInlineNightDb(60);
    setInlineCritDb(80);
  };

  // Handlers for Resident Assignment
  const handleAssignApartment = async () => {
    if (!allocatingProfile) return;

    if (allocationMode === 'existing') {
      const aptIdToUse = selectedApartmentId || (apartments.length > 0 ? apartments[0].id : '');
      if (!aptIdToUse) {
        showFeedback('error', 'Nenhum apartamento disponível. Use a opção "+ Nova Unidade" para criar uma nova unidade.');
        return;
      }
      const ok = await DataService.assignResidentToApartment(allocatingProfile.id, aptIdToUse);
      if (ok) {
        const targetApt = apartments.find(a => a.id === aptIdToUse);
        showFeedback('success', `Morador ${allocatingProfile.full_name} alocado ao Apartamento ${targetApt?.number || ''} com sucesso!`);
        setAllocatingProfile(null);
        setSelectedApartmentId('');
        await loadData();
      } else {
        showFeedback('error', 'Falha ao vincular morador ao apartamento. Verifique a conexão com o banco.');
      }
    } else {
      if (!inlineAptNumber.trim()) {
        showFeedback('error', 'Informe o número do apartamento a ser criado.');
        return;
      }
      const res = await DataService.createAndAssignApartment(allocatingProfile.id, {
        number: inlineAptNumber.trim(),
        floor: Number(inlineAptFloor) || 1,
        custom_day_threshold_db: Number(inlineDayDb) || 70,
        custom_night_threshold_db: Number(inlineNightDb) || 60,
        custom_critical_threshold_db: Number(inlineCritDb) || 80,
      });

      if (res.success) {
        showFeedback('success', `Apartamento ${inlineAptNumber} criado e ${allocatingProfile.full_name} alocado com sucesso!`);
        setAllocatingProfile(null);
        setInlineAptNumber('');
        setInlineAptFloor(1);
        await loadData();
      } else {
        showFeedback('error', res.message || 'Falha ao criar unidade e alocar morador.');
      }
    }
  };

  const handleUnassignResident = async (profile: Profile) => {
    if (window.confirm(`Deseja desvincular ${profile.full_name} do apartamento atual? A unidade ficará livre.`)) {
      const ok = await DataService.unassignResident(profile.id);
      if (ok) {
        showFeedback('success', `Morador desvinculado com sucesso.`);
        loadData();
      }
    }
  };

  const handleDeleteResident = async (profile: Profile) => {
    if (window.confirm(`Tem certeza que deseja excluir o cadastro de ${profile.full_name}?`)) {
      const ok = await DataService.deleteResident(profile.id);
      if (ok) {
        showFeedback('success', `Usuário excluído com sucesso.`);
        loadData();
      }
    }
  };

  const handleOpenUserHistory = async (profile: Profile) => {
    const report = await DataService.getUserHistory(profile.id);
    if (report) {
      setSelectedUserHistory(report);
    }
  };

  // Handlers for Apartment Management
  const handleCreateApartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAptNumber.trim()) return;

    await DataService.createApartment({
      number: newAptNumber.trim(),
      floor: Number(newAptFloor),
      custom_day_threshold_db: Number(newAptDayDb),
      custom_night_threshold_db: Number(newAptNightDb),
      custom_critical_threshold_db: Number(newAptCritDb),
    });

    showFeedback('success', `Apartamento ${newAptNumber} criado com limites customizados!`);
    setShowCreateAptModal(false);
    setNewAptNumber('');
    setNewAptFloor(1);
    loadData();
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAptThresholds) return;

    const ok = await DataService.updateApartmentThresholds({
      apartmentId: editingAptThresholds.id,
      custom_day_threshold_db: Number(editDayDb),
      custom_night_threshold_db: Number(editNightDb),
      custom_critical_threshold_db: Number(editCritDb),
    });

    if (ok) {
      showFeedback('success', `Limites acústicos da unidade ${editingAptThresholds.number} atualizados!`);
      setEditingAptThresholds(null);
      loadData();
    }
  };

  const handleDeleteApartment = async (apt: Apartment) => {
    if (window.confirm(`Deseja excluir o Apartamento ${apt.number}? Moradores vinculados ficarão sem unidade alocada.`)) {
      const ok = await DataService.deleteApartment(apt.id);
      if (ok) {
        showFeedback('success', `Apartamento ${apt.number} excluído.`);
        loadData();
      }
    }
  };

  const handleClearMockApartments = async () => {
    if (window.confirm('⚠️ ATENÇÃO: Deseja apagar todos os apartamentos mockados e telemetrias antigas para iniciar o condomínio do zero?')) {
      const ok = await DataService.clearMockApartments();
      if (ok) {
        showFeedback('success', 'Todos os apartamentos mockados foram apagados! Você pode cadastrar suas unidades reais agora.');
        loadData();
      }
    }
  };

  const pendingResidents = profiles.filter(p => {
    const isExplicitAdmin = p.role === 'admin' && (p.email.toLowerCase().includes('admin') || p.email === 'admin@dbsound.com');
    // Qualquer usuário que não seja estritamente o admin e não tenha apartamento alocado é considerado pendente!
    return !isExplicitAdmin && !p.apartment_id && !p.apartment_number;
  });

  const activeResidents = profiles.filter(p => {
    const isExplicitAdmin = p.role === 'admin' && (p.email.toLowerCase().includes('admin') || p.email === 'admin@dbsound.com');
    return !isExplicitAdmin && (Boolean(p.apartment_id) || Boolean(p.apartment_number));
  });

  const filteredResidents = (activeTab === 'residents' ? activeResidents : []).filter(p =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.apartment_number && p.apartment_number.includes(searchQuery))
  );

  return (
    <div className="space-y-7 animate-fadeIn">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Gestão de Moradores & Unidades
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
              Administração
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Alocação de novos moradores, histórico acústico por usuário e configuração de limites de ruído por apartamento.
          </p>
        </div>

        {/* Action Tabs Selector & Cloud Sync Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await loadData();
              showFeedback('success', 'Cadastros e solicitações de moradores sincronizados com sucesso!');
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-space-900/90 border border-white/10 hover:border-violet-500/40 text-slate-300 hover:text-white text-xs font-semibold shadow-sm transition"
            title="Sincronizar cadastros de moradores do Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sincronizar Nuvem</span>
          </button>

          <div className="flex items-center gap-1 bg-space-900/80 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveTab('residents')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'residents'
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-glow-purple'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Moradores</span>
              {pendingResidents.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                  {pendingResidents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('apartments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'apartments'
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-glow-purple'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Unidades & Limites dB</span>
              <span className="text-[10px] text-slate-400">({apartments.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Feedback Alert */}
      {feedbackMsg && (
        <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 animate-fadeIn ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-950/40 border-red-500/30 text-red-300'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* PENDING RESIDENTS ALERT BANNER (Shows in both tabs if there are pending users) */}
      {pendingResidents.length > 0 && (
        <div className="vault-card rounded-3xl p-5 border-amber-500/30 bg-amber-500/[0.03] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Novos Cadastros Aguardando Alocação de Apartamento
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {pendingResidents.length} pendente(s)
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Estes moradores criaram conta e confirmaram e-mail. Vincule cada morador à sua respectiva unidade para liberar o monitoramento.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingResidents.map((prof) => (
              <div key={prof.id} className="p-3.5 rounded-2xl bg-space-900/90 border border-white/10 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-xs text-white truncate">{prof.full_name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{prof.email}</div>
                  {prof.phone && <div className="text-[10px] text-slate-500">{prof.phone}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => openAllocationModal(prof)}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-medium shadow-glow-purple shrink-0 transition flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Alocar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: RESIDENTS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'residents' && (
        <div className="space-y-5">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar morador por nome, email ou apartamento..."
                className="w-full bg-space-900/80 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              Total de moradores ativos: <strong className="text-white">{activeResidents.length}</strong>
            </div>
          </div>

          {/* Residents Table / Cards */}
          <div className="vault-card rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-semibold">
                    <th className="py-3.5 px-5">Morador</th>
                    <th className="py-3.5 px-4">Unidade</th>
                    <th className="py-3.5 px-4">Contatos</th>
                    <th className="py-3.5 px-4">Ingresso</th>
                    <th className="py-3.5 px-5 text-right">Ações do Síndico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {filteredResidents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        Nenhum morador ativo encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredResidents.map((resident) => (
                      <tr key={resident.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-glow-purple">
                              {resident.full_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{resident.full_name}</div>
                              <div className="text-[11px] text-slate-500">{resident.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-violet-400" />
                            Apto {resident.apartment_number || apartments.find(a => a.id === resident.apartment_id)?.number || 'S/N'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-300">{resident.phone || '—'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-400">
                          {new Date(resident.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenUserHistory(resident)}
                              title="Ver histórico acústico e ocorrências"
                              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-violet-500/20 hover:text-violet-300 border border-white/10 text-slate-300 transition text-[11px] flex items-center gap-1.5"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>Histórico</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const otherApt = apartments.find(a => a.id !== resident.apartment_id)?.id || apartments[0]?.id;
                                openAllocationModal(resident, otherApt);
                              }}
                              title="Trocar morador de apartamento"
                              className="px-2.5 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 transition text-[11px] flex items-center gap-1"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Trocar Apto</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUnassignResident(resident)}
                              title="Desvincular deste apartamento"
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition text-[11px] flex items-center gap-1"
                            >
                              <span>Desvincular</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteResident(resident)}
                              title="Excluir cadastro"
                              className="p-1.5 rounded-xl hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: APARTMENTS & CUSTOM dB LIMITS */}
      {/* ========================================================================= */}
      {activeTab === 'apartments' && (
        <div className="space-y-6">
          {/* Top Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Unidades Residenciais & Calibração Acústica</h2>
              <p className="text-xs text-slate-400">Configure os limites de decibéis individualmente para cada apartamento.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearMockApartments}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Apartamentos Mockados</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCreateAptModal(true)}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-semibold shadow-glow-purple border border-violet-400/20 transition flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>+ Novo Apartamento</span>
              </button>
            </div>
          </div>

          {/* Apartments Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apartments.length === 0 ? (
              <div className="col-span-full vault-card rounded-3xl p-12 text-center space-y-3">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Nenhum apartamento cadastrado</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Você limpou as unidades mockadas! Clique no botão "+ Novo Apartamento" acima para cadastrar os apartamentos reais do condomínio.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateAptModal(true)}
                  className="px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium shadow-glow-purple transition"
                >
                  Cadastrar Primeiro Apartamento
                </button>
              </div>
            ) : (
              apartments.map((apt) => {
                const matching = profiles.filter(p => 
                  p.apartment_id === apt.id || 
                  (p.apartment_number && apt.number && p.apartment_number.trim() === apt.number.trim())
                );
                // Prioriza o usuário real (email diferente de @dbsound.com) em vez do morador mockado
                const resident = matching.find(p => !p.email.includes('@dbsound.com')) || matching[0];
                return (
                  <div key={apt.id} className="vault-card rounded-3xl p-5 space-y-4 relative group">
                    {/* Apartment Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-purple-600/30 border border-violet-500/30 flex items-center justify-center text-white font-bold text-sm">
                          {apt.number}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">Apartamento {apt.number}</div>
                          <div className="text-xs text-slate-400">Andar {apt.floor || 1} • Bloco Principal</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteApartment(apt)}
                        title="Excluir Apartamento"
                        className="p-1.5 rounded-xl hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Resident Info */}
                    <div className="p-3 rounded-2xl bg-space-900/80 border border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Morador:</span>
                      {resident ? (
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          {resident.full_name}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400/90 italic font-medium">Unidade Vaga</span>
                          {pendingResidents.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openAllocationModal(pendingResidents[0], apt.id)}
                              className="px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white text-[10px] font-semibold transition flex items-center gap-1 border border-violet-500/30 shadow-glow-purple"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Alocar</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Decibel Limits Display */}
                    <div className="space-y-2 pt-1 border-t border-white/5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                          Limites de Ruído (dB SPL):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAptThresholds(apt);
                            setEditDayDb(apt.custom_day_threshold_db ?? 70);
                            setEditNightDb(apt.custom_night_threshold_db ?? 60);
                            setEditCritDb(apt.custom_critical_threshold_db ?? 80);
                          }}
                          className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-[10px] text-slate-500">Diurno</div>
                          <div className="font-bold text-emerald-400">{apt.custom_day_threshold_db ?? 70} dB</div>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-[10px] text-slate-500">Noturno</div>
                          <div className="font-bold text-amber-400">{apt.custom_night_threshold_db ?? 60} dB</div>
                        </div>
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-[10px] text-slate-500">Crítico</div>
                          <div className="font-bold text-red-400">{apt.custom_critical_threshold_db ?? 80} dB</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ALOCAR MORADOR AO APARTAMENTO */}
      {/* ========================================================================= */}
      {allocatingProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="vault-card rounded-3xl p-6 w-full max-w-md space-y-5 shadow-glass-card animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-white text-base">
                  {allocatingProfile.apartment_id ? 'Trocar de Apartamento' : 'Alocar Morador'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAllocatingProfile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-space-900/80 border border-white/5 space-y-1 text-xs">
              <div className="text-slate-400 font-medium">Morador selecionado:</div>
              <div className="font-bold text-white text-sm flex items-center justify-between">
                <span>{allocatingProfile.full_name}</span>
                {allocatingProfile.apartment_number && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300">
                    Atual: Apto {allocatingProfile.apartment_number}
                  </span>
                )}
              </div>
              <div className="text-slate-400">{allocatingProfile.email}</div>
            </div>

            {/* Alternador de Modo: Unidade Existente vs Criar Nova */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-space-900 border border-white/5 text-xs">
              <button
                type="button"
                onClick={() => setAllocationMode('existing')}
                disabled={apartments.length === 0}
                className={`py-2 rounded-lg font-medium transition ${
                  allocationMode === 'existing'
                    ? 'bg-violet-600 text-white shadow-glow-purple'
                    : apartments.length === 0
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unidade Existente {apartments.length > 0 ? `(${apartments.length})` : '(0)'}
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('new')}
                className={`py-2 rounded-lg font-medium transition ${
                  allocationMode === 'new'
                    ? 'bg-violet-600 text-white shadow-glow-purple'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                + Nova Unidade
              </button>
            </div>

            {/* MODO 1: SELECIONAR UNIDADE EXISTENTE */}
            {allocationMode === 'existing' && (
              <div className="space-y-3 text-xs animate-fadeIn">
                {apartments.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    Nenhum apartamento cadastrado no condomínio. Clique na aba <strong>"+ Nova Unidade"</strong> acima para criar e alocar o morador no mesmo instante.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-slate-300 font-medium">Selecione a Unidade Residencial:</label>
                    <select
                      value={selectedApartmentId || (apartments.length > 0 ? apartments[0].id : '')}
                      onChange={(e) => setSelectedApartmentId(e.target.value)}
                      className="w-full bg-space-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-violet-500"
                    >
                      {apartments.map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          Apartamento {apt.number} (Andar {apt.floor || 1}) — Limite Diurno {apt.custom_day_threshold_db ?? 70} dB
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* MODO 2: CRIAR NOVA UNIDADE E ALOCAR DIRETAMENTE */}
            {allocationMode === 'new' && (
              <div className="space-y-3 text-xs animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Número do Apto:</label>
                    <input
                      type="text"
                      value={inlineAptNumber}
                      onChange={(e) => setInlineAptNumber(e.target.value)}
                      placeholder="Ex: 101, 202, Cob 01"
                      className="w-full bg-space-900 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Andar:</label>
                    <input
                      type="number"
                      value={inlineAptFloor}
                      onChange={(e) => setInlineAptFloor(Number(e.target.value))}
                      min="1"
                      className="w-full bg-space-900 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300 block">Limites de Decibéis (dB SPL) desta Unidade:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Diurno</label>
                      <input
                        type="number"
                        value={inlineDayDb}
                        onChange={(e) => setInlineDayDb(Number(e.target.value))}
                        className="w-full bg-space-900 border border-white/10 rounded-lg px-2 py-1.5 text-center text-emerald-400 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Noturno</label>
                      <input
                        type="number"
                        value={inlineNightDb}
                        onChange={(e) => setInlineNightDb(Number(e.target.value))}
                        className="w-full bg-space-900 border border-white/10 rounded-lg px-2 py-1.5 text-center text-amber-400 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Crítico</label>
                      <input
                        type="number"
                        value={inlineCritDb}
                        onChange={(e) => setInlineCritDb(Number(e.target.value))}
                        className="w-full bg-space-900 border border-white/10 rounded-lg px-2 py-1.5 text-center text-red-400 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAllocatingProfile(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAssignApartment}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-glow-purple transition"
              >
                {allocationMode === 'new' ? 'Criar e Alocar Morador' : 'Confirmar Alocação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: HISTÓRICO ACÚSTICO COMPLETO DO USUÁRIO */}
      {/* ========================================================================= */}
      {selectedUserHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="vault-card rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-6 shadow-glass-card animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white font-bold">
                  {selectedUserHistory.profile.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    {selectedUserHistory.profile.full_name}
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300">
                      Apto {selectedUserHistory.profile.apartment_number || 'Sem Unidade'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedUserHistory.profile.email} • Ativo há {selectedUserHistory.stats.daysActive} dias
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserHistory(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-space-900/80 border border-white/5 text-center">
                <div className="text-[10px] text-slate-400">Alertas Recebidos</div>
                <div className="text-lg font-black text-amber-400">{selectedUserHistory.stats.totalAlerts}</div>
              </div>
              <div className="p-3 rounded-2xl bg-space-900/80 border border-white/5 text-center">
                <div className="text-[10px] text-slate-400">Ocorrências</div>
                <div className="text-lg font-black text-violet-400">{selectedUserHistory.stats.totalOccurrences}</div>
              </div>
              <div className="p-3 rounded-2xl bg-space-900/80 border border-white/5 text-center">
                <div className="text-[10px] text-slate-400">Pico Acústico</div>
                <div className="text-lg font-black text-red-400">
                  {selectedUserHistory.stats.peakDbRecorded ? `${selectedUserHistory.stats.peakDbRecorded} dB` : '—'}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-space-900/80 border border-white/5 text-center">
                <div className="text-[10px] text-slate-400">Status Geral</div>
                <div className="text-xs font-bold text-emerald-400 mt-1">Conformidade</div>
              </div>
            </div>

            {/* Timeline: Alertas da Unidade */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Histórico de Alertas de Ruído</span>
              </h4>
              {selectedUserHistory.alerts.length === 0 ? (
                <div className="p-4 rounded-2xl bg-space-900/40 border border-white/5 text-center text-xs text-slate-500">
                  Nenhum alerta crítico ou de advertência registrado para esta unidade.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedUserHistory.alerts.map((alt) => (
                    <div key={alt.id} className="p-3 rounded-xl bg-space-900/80 border border-white/5 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-white">{alt.title}</div>
                        <div className="text-[11px] text-slate-400">{alt.message}</div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(alt.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline: Ocorrências Vinculadas */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-violet-400" />
                <span>Ocorrências Vinculadas ao Morador</span>
              </h4>
              {selectedUserHistory.occurrences.length === 0 ? (
                <div className="p-4 rounded-2xl bg-space-900/40 border border-white/5 text-center text-xs text-slate-500">
                  Nenhuma ocorrência registrada por ou contra este morador.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedUserHistory.occurrences.map((occ) => (
                    <div key={occ.id} className="p-3 rounded-xl bg-space-900/80 border border-white/5 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-white">{occ.type} • {occ.location}</div>
                        <div className="text-[11px] text-slate-400">{occ.description}</div>
                        <div className="text-[10px] text-violet-300 mt-0.5">Status: {occ.status.toUpperCase()}</div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(occ.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserHistory(null)}
                className="px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold transition"
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: NOVO APARTAMENTO COM LIMITES DE dB */}
      {/* ========================================================================= */}
      {showCreateAptModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateApartment} className="vault-card rounded-3xl p-6 w-full max-w-md space-y-5 shadow-glass-card animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-white text-base">Cadastrar Novo Apartamento</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Número da Unidade</label>
                <input
                  type="text"
                  value={newAptNumber}
                  onChange={(e) => setNewAptNumber(e.target.value)}
                  placeholder="Ex: 401 ou Cobertura A"
                  className="w-full bg-space-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Andar</label>
                <input
                  type="number"
                  value={newAptFloor}
                  onChange={(e) => setNewAptFloor(Number(e.target.value))}
                  min={1}
                  max={50}
                  className="w-full bg-space-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
            </div>

            {/* Custom dB Limits */}
            <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-violet-400" />
                <span>Definir Limites de Decibéis (dB SPL) desta Unidade:</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Limite Diurno (dB)</label>
                  <input
                    type="number"
                    value={newAptDayDb}
                    onChange={(e) => setNewAptDayDb(Number(e.target.value))}
                    className="w-full bg-space-900 border border-white/15 rounded-xl px-3 py-2 text-center text-emerald-400 font-bold focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Limite Noturno (dB)</label>
                  <input
                    type="number"
                    value={newAptNightDb}
                    onChange={(e) => setNewAptNightDb(Number(e.target.value))}
                    className="w-full bg-space-900 border border-white/15 rounded-xl px-3 py-2 text-center text-amber-400 font-bold focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Alerta Crítico (dB)</label>
                  <input
                    type="number"
                    value={newAptCritDb}
                    onChange={(e) => setNewAptCritDb(Number(e.target.value))}
                    className="w-full bg-space-900 border border-white/15 rounded-xl px-3 py-2 text-center text-red-400 font-bold focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateAptModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-glow-purple transition"
              >
                Criar Apartamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDITAR LIMITES DE dB DO APARTAMENTO */}
      {/* ========================================================================= */}
      {editingAptThresholds && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveThresholds} className="vault-card rounded-3xl p-6 w-full max-w-md space-y-5 shadow-glass-card animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-white text-base">
                  Limites dB — Apto {editingAptThresholds.number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAptThresholds(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Ajuste as tolerâncias sonoras para esta unidade residencial. O motor de alertas utilizará esses limites para classificar as medições.
            </p>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-300 font-medium">Diurno (dB)</label>
                <input
                  type="number"
                  value={editDayDb}
                  onChange={(e) => setEditDayDb(Number(e.target.value))}
                  min={30}
                  max={120}
                  className="w-full bg-space-900 border border-white/15 rounded-xl px-3 py-2.5 text-center text-emerald-400 font-bold focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-300 font-medium">Noturno (dB)</label>
                <input
                  type="number"
                  value={editNightDb}
                  onChange={(e) => setEditNightDb(Number(e.target.value))}
                  min={30}
                  max={120}
                  className="w-full bg-space-900 border border-white/15 rounded-xl px-3 py-2.5 text-center text-amber-400 font-bold focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-300 font-medium">Crítico (dB)</label>
                <input
                  type="number"
                  value={editCritDb}
                  onChange={(e) => setEditCritDb(Number(e.target.value))}
                  min={30}
                  max={120}
                  className="w-full bg-space-900 border border-white/15 rounded-xl px-3 py-2.5 text-center text-red-400 font-bold focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingAptThresholds(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-glow-purple transition"
              >
                Salvar Limites
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
