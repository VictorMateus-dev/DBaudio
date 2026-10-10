import React from 'react';
import { 
  LayoutDashboard, 
  Grid3X3, 
  AlertTriangle, 
  Cpu, 
  Sliders, 
  FlaskConical, 
  Volume2, 
  Users,
  LogOut,
  UserCheck,
  MessageSquare,
  Activity,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export type NavTab = 'overview' | 'floorplan' | 'residents' | 'occurrences' | 'messages' | 'devices' | 'policies' | 'simulator';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openAlertsCount: number;
  openOccurrencesCount: number;
  pendingResidentsCount?: number;
  unreadMessagesCount?: number;
  onClose?: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeColor?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  openAlertsCount,
  openOccurrencesCount,
  pendingResidentsCount = 0,
  unreadMessagesCount = 0,
  onClose,
}) => {
  const { role, user, logout } = useAuth();

  const navGroups: NavGroup[] = [
    {
      title: 'MONITORAMENTO',
      items: [
        { id: 'overview', label: 'Painel Geral', icon: LayoutDashboard },
        { id: 'floorplan', label: 'Planta das Unidades', icon: Grid3X3 },
      ]
    },
    {
      title: 'GESTÃO & CONVIVÊNCIA',
      items: [
        { 
          id: 'occurrences', 
          label: 'Ocorrências', 
          icon: AlertTriangle, 
          badge: openOccurrencesCount, 
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
        },
        { 
          id: 'residents', 
          label: 'Moradores & Unidades', 
          icon: Users, 
          badge: pendingResidentsCount, 
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
        },
        { 
          id: 'messages', 
          label: 'Central de Mensagens', 
          icon: MessageSquare, 
          badge: unreadMessagesCount, 
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
        },
      ]
    },
    {
      title: 'CONFIGURAÇÕES',
      items: [
        { id: 'devices', label: 'Dispositivos ESP32', icon: Cpu },
        { id: 'policies', label: 'Políticas de Ruído', icon: Sliders },
        { id: 'simulator', label: 'Laboratório & Testes', icon: FlaskConical },
      ]
    }
  ];

  return (
    <aside className="w-full lg:w-[260px] h-full shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between z-10 select-none">
      <div className="flex-1 overflow-y-auto">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                dBSound
                <span className="text-[10px] font-semibold text-blue-400 bg-blue-950/60 border border-blue-800 px-1.5 py-0.2 rounded">
                  PRO
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Monitoramento Acústico</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav className="p-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onClose) onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold border ${item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 mb-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'DB'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Síndico Geral'}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {role === 'admin' ? 'Administrador' : user?.apartment_number ? `Apto ${user.apartment_number}` : 'Morador'}
                </p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sair da Conta"
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/morador/inicio';
              }}
              className="w-full py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-medium transition flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Ver Visão do Morador</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px]">Telemetria Nuvem Ativa</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">v2.5</span>
        </div>
      </div>
    </aside>
  );
};
