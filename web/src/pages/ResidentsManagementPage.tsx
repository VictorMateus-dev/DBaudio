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

  const [selectedUserHistory, setSelectedUserHistory] = useState<UserHistoryReport | null>(null);
  const [allocatingProfile, setAllocatingProfile] = useState<Profile | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');

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
    if (window.confirm('ATENÇÃO: Deseja apagar todos os apartamentos de demonstração e telemetrias antigas para iniciar o condomínio do zero?')) {
      const ok = await DataService.clearMockApartments();
      if (ok) {
        showFeedback('success', 'Todos os apartamentos mockados foram apagados! Você pode cadastrar suas unidades reais agora.');
        loadData();
      }
    }
  };

  const pendingResidents = profiles.filter(p => {
    const isExplicitAdmin = p.role === 'admin' && (p.email.toLowerCase().includes('admin') || p.email === 'admin@dbsound.com');
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
      
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Gestão de Moradores & Unidades
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Administração
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Alocação de moradores, histórico acústico por usuário e configuração de limites de ruído por apartamento.
          </p>
        </div>

        {/* Ações do Header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await loadData();
              showFeedback('success', 'Cadastros e solicitações de moradores sincronizados com sucesso!');
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
            title="Sincronizar cadastros de moradores do Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sincronizar Nuvem</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('residents')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'residents'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Moradores</span>
              {pendingResidents.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingResidents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('apartments')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'apartments'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Unidades & Limites dB</span>
              <span className="text-[10px] text-slate-400">({apartments.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMsg && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-fadeIn ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span className="font-medium">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Card de Cadastros Pendentes */}
      {pendingResidents.length > 0 && (
        <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Novos Cadastros Aguardando Alocação de Apartamento
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {pendingResidents.length} pendente(s)
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Estes moradores criaram conta e confirmaram e-mail. Vincule cada morador à sua respectiva unidade para liberar o monitoramento.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingResidents.map((prof) => (
              <div key={prof.id} className="p-3.5 rounded-xl bg-white border border-amber-200/80 flex items-center justify-between gap-3 shadow-subtle">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-xs text-slate-900 truncate">{prof.full_name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{prof.email}</div>
                  {prof.phone && <div className="text-[10px] text-slate-400">{prof.phone}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => openAllocationModal(prof)}
                  className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm shrink-0 transition flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Alocar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aba de Moradores */}
      {activeTab === 'residents' && (
        <div className="space-y-5">
          
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar morador por nome, email ou apartamento..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
              />
            </div>
            <div className="text-xs text-slate-500">
              Total de moradores ativos: <strong className="text-slate-900 font-semibold">{activeResidents.length}</strong>
            </div>
          </div>

          {/* Tabela de Moradores */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                    <th className="py-3.5 px-5">Morador</th>
                    <th className="py-3.5 px-4">Unidade</th>
                    <th className="py-3.5 px-4">Contatos</th>
                    <th className="py-3.5 px-4">Ingresso</th>
                    <th className="py-3.5 px-5 text-right">Ações do Síndico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredResidents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        Nenhum morador ativo encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredResidents.map((resident) => (
                      <tr key={resident.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-xs">
                              {resident.full_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{resident.full_name}</div>
                              <div className="text-[11px] text-slate-500">{resident.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            Apto {resident.apartment_number || apartments.find(a => a.id === resident.apartment_id)?.number || 'S/N'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-600">{resident.phone || '—'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-500">
                          {new Date(resident.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenUserHistory(resident)}
                              title="Ver histórico acústico e ocorrências"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition text-[11px] font-medium flex items-center gap-1.5"
                            >
                              <History className="w-3.5 h-3.5 text-slate-500" />
                              <span>Histórico</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const otherApt = apartments.find(a => a.id !== resident.apartment_id)?.id || apartments[0]?.id;
                                openAllocationModal(resident, otherApt);
                              }}
                              title="Trocar morador de apartamento"
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-brand-700 border border-blue-200 transition text-[11px] font-medium flex items-center gap-1"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Trocar Apto</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUnassignResident(resident)}
                              title="Desvincular deste apartamento"
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition text-[11px] font-medium flex items-center gap-1"
                            >
                              <span>Desvincular</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteResident(resident)}
                              title="Excluir cadastro"
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
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

      
      
      
      {/* Aba de Unidades & Limites dB */}
      {activeTab === 'apartments' && (
        <div className="space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Unidades Residenciais & Calibração Acústica</h2>
              <p className="text-xs text-slate-500">Configure os limites de decibéis individualmente para cada apartamento.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearMockApartments}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Apartamentos Mockados</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCreateAptModal(true)}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>+ Novo Apartamento</span>
              </button>
            </div>
          </div>

          {/* Grid de Apartamentos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apartments.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200/80 rounded-2xl shadow-card p-12 text-center space-y-3">
                <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">Nenhum apartamento cadastrado</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Você limpou as unidades mockadas! Clique no botão "+ Novo Apartamento" acima para cadastrar os apartamentos reais do condomínio.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateAptModal(true)}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium shadow-sm transition"
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
                const resident = matching.find(p => !p.email.includes('@dbsound.com')) || matching[0];
                return (
                  <div key={apt.id} className="bg-white border border-slate-200/80 rounded-2xl shadow-card p-5 space-y-4 relative group hover:border-slate-300 transition">
                    
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-sm">
                          {apt.number}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">Apartamento {apt.number}</div>
                          <div className="text-xs text-slate-500">Andar {apt.floor || 1} • Bloco Principal</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteApartment(apt)}
                        title="Excluir Apartamento"
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Morador Vinculado */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Morador:</span>
                      {resident ? (
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {resident.full_name}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-700 italic font-medium">Unidade Vaga</span>
                          {pendingResidents.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openAllocationModal(pendingResidents[0], apt.id)}
                              className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-brand-700 text-[10px] font-semibold transition flex items-center gap-1 border border-blue-200"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Alocar</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Limites de Decibéis */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
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
                          className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-emerald-50/50 border border-emerald-100">
                          <div className="text-[10px] text-emerald-700">Diurno</div>
                          <div className="font-bold text-emerald-800">{apt.custom_day_threshold_db ?? 70} dB</div>
                        </div>
                        <div className="p-2 rounded-xl bg-amber-50/50 border border-amber-100">
                          <div className="text-[10px] text-amber-700">Noturno</div>
                          <div className="font-bold text-amber-800">{apt.custom_night_threshold_db ?? 60} dB</div>
                        </div>
                        <div className="p-2 rounded-xl bg-rose-50/50 border border-rose-100">
                          <div className="text-[10px] text-rose-700">Crítico</div>
                          <div className="font-bold text-rose-800">{apt.custom_critical_threshold_db ?? 80} dB</div>
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

      {/* Modal de Alocação de Morador */}
      {allocatingProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-elevated animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {allocatingProfile.apartment_id ? 'Trocar de Apartamento' : 'Alocar Morador'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAllocatingProfile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
              <div className="text-slate-500 font-medium">Morador selecionado:</div>
              <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>{allocatingProfile.full_name}</span>
                {allocatingProfile.apartment_number && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-brand-700 border border-blue-200">
                    Atual: Apto {allocatingProfile.apartment_number}
                  </span>
                )}
              </div>
              <div className="text-slate-500">{allocatingProfile.email}</div>
            </div>

            {/* Alternador de Modo */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setAllocationMode('existing')}
                disabled={apartments.length === 0}
                className={`py-2 rounded-lg font-medium transition ${
                  allocationMode === 'existing'
                    ? 'bg-white text-brand-600 font-semibold shadow-sm'
                    : apartments.length === 0
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unidade Existente {apartments.length > 0 ? `(${apartments.length})` : '(0)'}
              </button>
              <button
                type="button"
                onClick={() => setAllocationMode('new')}
                className={`py-2 rounded-lg font-medium transition ${
                  allocationMode === 'new'
                    ? 'bg-white text-brand-600 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Nova Unidade
              </button>
            </div>

            {/* Seleção de Unidade Existente */}
            {allocationMode === 'existing' && (
              <div className="space-y-3 text-xs animate-fadeIn">
                {apartments.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    Nenhum apartamento cadastrado no condomínio. Clique na aba <strong>"+ Nova Unidade"</strong> acima para criar e alocar o morador no mesmo instante.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-slate-700 font-medium">Selecione a Unidade Residencial:</label>
                    <select
                      value={selectedApartmentId || (apartments.length > 0 ? apartments[0].id : '')}
                      onChange={(e) => setSelectedApartmentId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
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

            {/* Criação de Nova Unidade Inline */}
            {allocationMode === 'new' && (
              <div className="space-y-3 text-xs animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-medium block mb-1">Número do Apto:</label>
                    <input
                      type="text"
                      value={inlineAptNumber}
                      onChange={(e) => setInlineAptNumber(e.target.value)}
                      placeholder="Ex: 101, 202, Cob 01"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-medium block mb-1">Andar:</label>
                    <input
                      type="number"
                      value={inlineAptFloor}
                      onChange={(e) => setInlineAptFloor(Number(e.target.value))}
                      min="1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-700 block">Limites de Decibéis (dB SPL) desta Unidade:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Diurno</label>
                      <input
                        type="number"
                        value={inlineDayDb}
                        onChange={(e) => setInlineDayDb(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-emerald-700 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Noturno</label>
                      <input
                        type="number"
                        value={inlineNightDb}
                        onChange={(e) => setInlineNightDb(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-amber-700 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Crítico</label>
                      <input
                        type="number"
                        value={inlineCritDb}
                        onChange={(e) => setInlineCritDb(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-rose-700 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAllocatingProfile(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 transition font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAssignApartment}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition"
              >
                {allocationMode === 'new' ? 'Criar e Alocar Morador' : 'Confirmar Alocação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico do Morador */}
      {selectedUserHistory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-6 shadow-elevated animate-fadeIn">
            
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-bold">
                  {selectedUserHistory.profile.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    {selectedUserHistory.profile.full_name}
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-brand-700 border border-blue-200">
                      Apto {selectedUserHistory.profile.apartment_number || 'Sem Unidade'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedUserHistory.profile.email} • Ativo há {selectedUserHistory.stats.daysActive} dias
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserHistory(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Métricas Rápidas */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500">Alertas Recebidos</div>
                <div className="text-lg font-bold text-amber-700">{selectedUserHistory.stats.totalAlerts}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500">Ocorrências</div>
                <div className="text-lg font-bold text-brand-700">{selectedUserHistory.stats.totalOccurrences}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500">Pico Acústico</div>
                <div className="text-lg font-bold text-rose-700">
                  {selectedUserHistory.stats.peakDbRecorded ? `${selectedUserHistory.stats.peakDbRecorded} dB` : '—'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500">Status Geral</div>
                <div className="text-xs font-bold text-emerald-700 mt-1">Conformidade</div>
              </div>
            </div>

            {/* Lista de Alertas */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Histórico de Alertas de Ruído</span>
              </h4>
              {selectedUserHistory.alerts.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                  Nenhum alerta crítico ou de advertência registrado para esta unidade.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedUserHistory.alerts.map((alt) => (
                    <div key={alt.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{alt.title}</div>
                        <div className="text-[11px] text-slate-500">{alt.message}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(alt.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de Ocorrências */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-brand-600" />
                <span>Ocorrências Vinculadas ao Morador</span>
              </h4>
              {selectedUserHistory.occurrences.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                  Nenhuma ocorrência registrada por ou contra este morador.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedUserHistory.occurrences.map((occ) => (
                    <div key={occ.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{occ.type} • {occ.location}</div>
                        <div className="text-[11px] text-slate-500">{occ.description}</div>
                        <div className="text-[10px] text-brand-600 font-medium mt-0.5">Status: {occ.status.toUpperCase()}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(occ.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedUserHistory(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Apartamento */}
      {showCreateAptModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateApartment} className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-elevated animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">Cadastrar Novo Apartamento</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Número da Unidade</label>
                <input
                  type="text"
                  value={newAptNumber}
                  onChange={(e) => setNewAptNumber(e.target.value)}
                  placeholder="Ex: 401 ou Cobertura A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Andar</label>
                <input
                  type="number"
                  value={newAptFloor}
                  onChange={(e) => setNewAptFloor(Number(e.target.value))}
                  min={1}
                  max={50}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  required
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-brand-600" />
                <span>Definir Limites de Decibéis (dB SPL) desta Unidade:</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Limite Diurno (dB)</label>
                  <input
                    type="number"
                    value={newAptDayDb}
                    onChange={(e) => setNewAptDayDb(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center text-emerald-700 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Limite Noturno (dB)</label>
                  <input
                    type="number"
                    value={newAptNightDb}
                    onChange={(e) => setNewAptNightDb(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center text-amber-700 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Alerta Crítico (dB)</label>
                  <input
                    type="number"
                    value={newAptCritDb}
                    onChange={(e) => setNewAptCritDb(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center text-rose-700 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateAptModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 transition font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition"
              >
                Criar Apartamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Edição de Limites */}
      {editingAptThresholds && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveThresholds} className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-elevated animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Limites dB — Apto {editingAptThresholds.number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAptThresholds(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ajuste as tolerâncias sonoras para esta unidade residencial. O motor de alertas utilizará esses limites para classificar as medições.
            </p>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-700 font-medium">Diurno (dB)</label>
                <input
                  type="number"
                  value={editDayDb}
                  onChange={(e) => setEditDayDb(Number(e.target.value))}
                  min={30}
                  max={120}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-center text-emerald-700 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-700 font-medium">Noturno (dB)</label>
                <input
                  type="number"
                  value={editNightDb}
                  onChange={(e) => setEditNightDb(Number(e.target.value))}
                  min={30}
                  max={120}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-center text-amber-700 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-700 font-medium">Crítico (dB)</label>
                <input
                  type="number"
                  value={editCritDb}
                  onChange={(e) => setEditCritDb(Number(e.target.value))}
                  min={30}
                  max={120}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-center text-rose-700 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAptThresholds(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 transition font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition"
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
