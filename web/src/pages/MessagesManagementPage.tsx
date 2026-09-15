import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Filter, 
  Building2, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  User,
  Sparkles
} from 'lucide-react';
import { Conversation, ConversationMessage, Apartment, Occurrence } from '../types/database.types';
import { DataService, localStore } from '../lib/dataService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface MessagesManagementPageProps {
  onRefresh?: () => void;
}

export const MessagesManagementPage: React.FC<MessagesManagementPageProps> = ({ onRefresh }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const selectedConversationIdRef = React.useRef<string | null>(null);
  const isInitialMountRef = React.useRef<boolean>(true);

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'preventivo' | 'ocorrencia' | 'unread'>('all');
  const [apartments, setApartments] = useState<Apartment[]>([]);

  const loadConversations = React.useCallback(async () => {
    const [convs, apts] = await Promise.all([
      DataService.getConversations(),
      DataService.getApartments()
    ]);
    setConversations(convs);
    setApartments(apts);

    const currentId = selectedConversationIdRef.current;
    if (currentId) {
      const existing = convs.find(c => c.id === currentId);
      if (existing) {
        const msgs = await DataService.getMessages(currentId);
        setMessages(msgs);
        return;
      }
    }

    // Auto-seleciona a primeira conversa SOMENTE na montagem inicial se nada estiver selecionado
    if (isInitialMountRef.current && convs.length > 0) {
      isInitialMountRef.current = false;
      const firstId = convs[0].id;
      selectedConversationIdRef.current = firstId;
      setSelectedConversationId(firstId);
      console.log('SELECTED CONVERSATION (INITIAL):', firstId);
      console.log('FETCHING MESSAGES FOR:', firstId);
      const msgs = await DataService.getMessages(firstId);
      setMessages(msgs);
      await DataService.markMessagesAsRead(firstId, user?.id);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
    const unsubLocal = localStore.subscribe(() => {
      loadConversations();
    });

    // Subscrição unificada em tempo real (Supabase Realtime + BroadcastChannel local)
    const unsubRealtime = DataService.subscribeToChatRealtime((event) => {
      if (event.type === 'INSERT' && event.message) {
        const newMsg = event.message;
        console.log('[CHAT REALTIME] evento recebido: INSERT');
        console.log('message_id:', newMsg.id);
        console.log('conversation_id:', newMsg.conversation_id);
        console.log('sender_id:', newMsg.sender_id);

        const currentActiveId = selectedConversationIdRef.current;
        if (newMsg.conversation_id === currentActiveId) {
          // Se pertence à conversa aberta, adiciona com deduplicação por ID
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Se for do morador, marca como lida
          if (newMsg.sender_id !== user?.id) {
            DataService.markMessagesAsRead(newMsg.conversation_id, user?.id);
          }
        } else {
          // Se pertence a outra conversa: NUNCA muda a conversa selecionada!
          // Apenas atualiza a lista de conversas e preview
          loadConversations();
        }
      } else if (event.type === 'UPDATE' && event.message) {
        const updatedMsg = event.message;
        console.log('[CHAT REALTIME] evento recebido: UPDATE');
        console.log('message_id:', updatedMsg.id);
        console.log('conversation_id:', updatedMsg.conversation_id);

        const currentActiveId = selectedConversationIdRef.current;
        if (updatedMsg.conversation_id === currentActiveId) {
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
        }
      } else if (event.type === 'READ_RECEIPT' && event.conversation_id) {
        const currentActiveId = selectedConversationIdRef.current;
        if (event.conversation_id === currentActiveId) {
          setMessages(prev => prev.map(m => (!m.read_at && m.sender_id === user?.id) ? { ...m, read: true, read_at: event.read_at || new Date().toISOString() } : m));
        }
      }
    });

    return () => {
      unsubLocal();
      unsubRealtime();
    };
  }, [loadConversations, user?.id]);

  const handleSelectConversation = async (convId: string) => {
    console.log('CLICKED CONVERSATION:', convId);
    selectedConversationIdRef.current = convId;
    setSelectedConversationId(convId);
    console.log('SELECTED CONVERSATION:', convId);
    console.log('FETCHING MESSAGES FOR:', convId);

    const msgs = await DataService.getMessages(convId);
    setMessages(msgs);
    console.log('RENDERING CONVERSATION:', convId);

    await DataService.markMessagesAsRead(convId, user?.id);
    if (onRefresh) onRefresh();
  };

  const activeConversation = conversations.find(c => c.id === selectedConversationId) || null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConversation || isSending) return;

    setIsSending(true);
    try {
      const msg = await DataService.sendMessage({
        conversation_id: activeConversation.id,
        sender_id: user?.id || 'aaaa1111-0000-0000-0000-000000000001',
        recipient_id: activeConversation.created_by || activeConversation.apartment_id,
        sender_name: user?.full_name || 'Síndico Geral',
        sender_role: 'syndic',
        content: newMessageText.trim(),
        message: newMessageText.trim(),
      });
      setMessages(prev => [...prev, msg]);
      setNewMessageText('');
      const updatedConvs = await DataService.getConversations();
      setConversations(updatedConvs);
      if (onRefresh) onRefresh();
    } finally {
      setIsSending(false);
    }
  };

  // Filtragem de conversas
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      (conv.apartment_number && conv.apartment_number.includes(searchQuery)) ||
      (conv.subject && conv.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (conv.last_message && conv.last_message.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'preventivo') return conv.type === 'preventivo';
    if (filterType === 'ocorrencia') return conv.type === 'ocorrencia';
    if (filterType === 'unread') return (conv.unread_count || 0) > 0;
    return true;
  });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    return new Date(isoString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Central de Mensagens & Conversas
            </h1>
            {totalUnread > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                <span>{totalUnread} não lida(s)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Comunicação bidirecional direta com moradores. Acompanhe contatos preventivos de ruído e orientações sobre ocorrências em andamento.
          </p>
        </div>
      </div>

      {/* Main Split Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Conversation List */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar unidade ou mensagem..."
              className="w-full bg-space-900/90 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-space-900/80 p-1 rounded-xl border border-white/5 text-[11px]">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'preventivo', label: '🔴 Preventivas' },
              { id: 'ocorrencia', label: '🟢 Ocorrências' },
              { id: 'unread', label: 'Não Lidas' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`flex-1 py-1.5 rounded-lg font-medium transition text-center ${
                  filterType === tab.id
                    ? 'bg-violet-600 text-white font-bold shadow-glow-purple'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conversation Cards Scroll */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs vault-card rounded-2xl">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.id === selectedConversationId;
                const hasUnread = (conv.unread_count || 0) > 0;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-space-900 border-violet-500 shadow-glow-purple'
                        : 'bg-space-900/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-violet-400" />
                        <span className="font-bold text-white text-xs">
                          Apto {conv.apartment_number || '101'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          conv.type === 'preventivo'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        }`}>
                          {conv.type === 'preventivo' ? '🔴 Preventivo' : '🟢 Ocorrência'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hasUnread && (
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {getRelativeTime(conv.updated_at || conv.created_at)}
                        </span>
                      </div>
                    </div>

                    <h5 className="font-semibold text-slate-200 text-xs truncate mb-1">
                      {conv.subject}
                    </h5>

                    {conv.last_message && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {conv.last_message}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Active Chat Window */}
        <div className="lg:col-span-2">
          {activeConversation ? (
            <div className="vault-card rounded-3xl p-6 space-y-4 flex flex-col h-[740px] animate-fadeIn border border-white/10">
              {/* Top Bar of Active Conversation */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-glow-purple">
                    {activeConversation.apartment_number ? `A${activeConversation.apartment_number}` : 'DB'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">
                        Apartamento {activeConversation.apartment_number}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        activeConversation.type === 'preventivo'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      }`}>
                        {activeConversation.type === 'preventivo' ? '🔴 Contato Preventivo' : '🟢 Ocorrência Vinculada'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {activeConversation.subject}
                    </p>
                  </div>
                </div>

                {activeConversation.occurrence_id && (
                  <button
                    type="button"
                    onClick={() => navigate('/sindico/ocorrencias')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-violet-300 text-xs font-semibold transition"
                  >
                    <span>Ver Ocorrência</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Informative Banner */}
              <div className={`p-3 rounded-2xl text-[11px] leading-relaxed flex items-center gap-2.5 ${
                activeConversation.type === 'preventivo'
                  ? 'bg-amber-950/30 border border-amber-500/30 text-amber-300'
                  : 'bg-violet-950/30 border border-violet-500/30 text-violet-300'
              }`}>
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {activeConversation.type === 'preventivo'
                    ? '🛡️ Este contato preventivo foi disparado pelo monitoramento contínuo de ruído. Nenhuma ocorrência ou penalidade formal foi registrada contra a unidade.'
                    : '⚖️ Este chat está vinculado formalmente a uma ocorrência registrada. O sigilo do denunciante original permanece 100% blindado.'}
                </span>
              </div>

              {/* Quick Template Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <span className="text-slate-500 text-[10px] shrink-0 font-bold uppercase">Respostas Rápidas:</span>
                {[
                  'Solicitamos moderação no volume do som conforme o regimento interno.',
                  'Detectamos ruído sonoro elevado nesta unidade. Favor adequar o volume.',
                  'Recebemos seu retorno. Agradecemos a colaboração com a vizinhança.'
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNewMessageText(tpl)}
                    className="px-2.5 py-1 rounded-lg bg-space-900 border border-white/10 hover:border-violet-500/50 text-slate-300 hover:text-white shrink-0 transition"
                  >
                    {tpl.slice(0, 32)}...
                  </button>
                ))}
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 rounded-2xl bg-space-950/70 border border-white/5">
                {messages.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    Nenhuma mensagem registrada nesta conversa ainda.
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = user?.id ? msg.sender_id === user.id : msg.sender_role === 'syndic';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400">
                          <span className={`font-bold ${isMe ? 'text-violet-300' : 'text-blue-400'}`}>
                            {isMe ? 'Você (Síndico Geral)' : (msg.sender_name || `Morador Apto ${activeConversation.apartment_number}`)}
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

              {/* Reply Form */}
              <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-white/10">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={e => setNewMessageText(e.target.value)}
                  placeholder="Digite sua mensagem para o morador desta unidade..."
                  className="flex-1 bg-space-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  disabled={isSending || !newMessageText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 text-white font-bold text-xs shadow-glow-purple transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Enviando...' : 'Enviar'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="vault-card rounded-3xl p-16 text-center text-slate-500 text-xs h-[740px] flex flex-col items-center justify-center space-y-2">
              <MessageSquare className="w-12 h-12 text-slate-600" />
              <p className="text-white font-bold text-sm">Nenhuma conversa selecionada</p>
              <p className="text-slate-400 text-xs max-w-sm">
                Selecione uma conversa na lista ao lado para acompanhar o histórico completo e responder ao morador.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
