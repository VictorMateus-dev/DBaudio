import React, { useState, useEffect } from 'react';
import { Occurrence, OccurrenceComment } from '../types/database.types';
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
  Calendar
} from 'lucide-react';

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
  const [isNewOccurrenceModalOpen, setIsNewOccurrenceModalOpen] = useState(false);

  // Formulário de Nova Ocorrência
  const [newType, setNewType] = useState('Música Alta / Som Mecânico');
  const [newLocation, setNewLocation] = useState('Apartamento 202');
  const [newDescription, setNewDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    if (selectedOccurrence) {
      DataService.getComments(selectedOccurrence.id).then(setComments);
    }
  }, [selectedOccurrence]);

  const handleStatusChange = async (newStatus: Occurrence['status']) => {
    if (!selectedOccurrence) return;
    await DataService.updateOccurrenceStatus(selectedOccurrence.id, newStatus);
    setSelectedOccurrence({ ...selectedOccurrence, status: newStatus });
    onRefresh();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedOccurrence) return;

    const added = await DataService.addComment(
      selectedOccurrence.id,
      newCommentText.trim(),
      user?.full_name || 'Administrador'
    );
    setComments([...comments, added]);
    setNewCommentText('');
  };

  const handleCreateOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) return;

    const newOcc: Occurrence = {
      id: `occ-${Date.now()}`,
      condominium_id: user?.condominium_id || 'c1',
      reporter_id: isAnonymous ? undefined : user?.id,
      apartment_id: user?.apartment_id,
      type: newType,
      location: newLocation,
      description: newDescription.trim(),
      occurred_at: new Date().toISOString(),
      status: 'aberta',
      priority: 'media',
      anonymous: isAnonymous,
      reporter_name: isAnonymous ? 'Morador Anônimo' : (user?.full_name || 'Morador'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Inserir no store/Supabase
    localStore.occurrences.unshift(newOcc);
    localStore.notify();
    setIsNewOccurrenceModalOpen(false);
    setNewDescription('');
    setSelectedOccurrence(newOcc);
    onRefresh();
  };

  const filteredOccurrences = occurrences.filter(occ => {
    if (filterStatus === 'all') return true;
    return occ.status === filterStatus;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Gestão de Ocorrências e Denúncias</h1>
          <p className="text-sm text-slate-400">
            Acompanhamento formal de relatos com dados quantitativos auditáveis de ruído.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsNewOccurrenceModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Ocorrência</span>
          </button>
        </div>
      </div>

      {/* Main Split View: Left List, Right Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Occurrences List */}
        <div className="space-y-4">
          {/* Status Filters */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            {['all', 'aberta', 'em análise', 'resolvida'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex-1 py-1.5 rounded font-medium capitalize transition ${
                  filterStatus === s ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s === 'all' ? 'Todas' : s}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredOccurrences.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
                Nenhuma ocorrência encontrada neste filtro.
              </div>
            ) : (
              filteredOccurrences.map(occ => {
                const isSelected = selectedOccurrence?.id === occ.id;
                return (
                  <div
                    key={occ.id}
                    onClick={() => setSelectedOccurrence(occ)}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-blue-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-sm truncate">{occ.type}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        occ.status === 'aberta' ? 'bg-amber-500/20 text-amber-400' :
                        occ.status === 'em análise' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {occ.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{occ.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {occ.location}
                      </span>
                      <span>{new Date(occ.occurred_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Occurrence Details & Comments */}
        <div className="lg:col-span-2">
          {selectedOccurrence ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Header & Status Controller */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white">{selectedOccurrence.type}</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                      Prioridade {selectedOccurrence.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      {selectedOccurrence.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      {new Date(selectedOccurrence.occurred_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      {selectedOccurrence.reporter_name || 'Morador'}
                    </span>
                  </div>
                </div>

                {/* Status action buttons for Admin */}
                {role === 'admin' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStatusChange('em análise')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedOccurrence.status === 'em análise'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Em Análise
                    </button>
                    <button
                      onClick={() => handleStatusChange('resolvida')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedOccurrence.status === 'resolvida'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Resolvida
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs uppercase font-bold text-slate-400 mb-2">Relato do Morador</h4>
                <p className="text-sm text-slate-200 leading-relaxed">{selectedOccurrence.description}</p>
              </div>

              {/* MANDATORY PRIVACY DISCLAIMER */}
              <div className="flex items-start space-x-3 bg-blue-950/20 border border-blue-800/40 p-4 rounded-xl text-xs text-blue-300">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-blue-200">Aviso Legal de Privacidade e Proteção de Dados:</p>
                  <p className="text-blue-300/80 leading-relaxed">
                    Esta ocorrência utiliza estritamente dados quantitativos de decibéis (dB). O sistema dBSound
                    <strong> não grava, não transmite e não armazena áudio ou conversas de voz</strong>,
                    em conformidade com a LGPD e o sigilo condominial.
                  </p>
                </div>
              </div>

              {/* Comments & History Thread */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Histórico e Providências ({comments.length})
                </h4>

                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">Nenhum comentário ou despacho registrado ainda.</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/50 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-blue-400">{c.author_name || 'Administrador'}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{c.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Registrar despacho, orientação ou observação..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
              Selecione uma ocorrência para visualizar os detalhes.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Registrar Nova Ocorrência */}
      {isNewOccurrenceModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Registrar Nova Ocorrência
              </h3>
              <button
                onClick={() => setIsNewOccurrenceModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOccurrence} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tipo de Ocorrência</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-blue-500"
                >
                  <option value="Música Alta / Som Mecânico">Música Alta / Som Mecânico</option>
                  <option value="Reforma Fora do Horário Permitido">Reforma Fora do Horário Permitido</option>
                  <option value="Gritos / Festas Excessivas">Gritos / Festas Excessivas</option>
                  <option value="Ruído em Área Comum">Ruído em Área Comum (Salão, Piscina)</option>
                  <option value="Latidos / Animais Prolongados">Latidos / Animais Prolongados</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Local / Apartamento Infrator</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Ex: Apartamento 202, 2º Andar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Descrição Detalhada dos Fatos</label>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descreva o tipo de barulho, persistência e horário observado..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-blue-500 resize-none"
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="anonymousCheck"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="anonymousCheck" className="text-slate-300">
                  Registrar como <strong>Morador Anônimo</strong> (sua identidade não será visível)
                </label>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-800/30 rounded-lg text-[11px] text-blue-300">
                🔒 Esta ocorrência será correlacionada com a telemetria quantitativa do sistema (dB SPL). Áudios de voz nunca são gravados.
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewOccurrenceModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Confirmar Envio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
