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
  UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export type NavTab = 'overview' | 'floorplan' | 'residents' | 'occurrences' | 'devices' | 'policies' | 'simulator';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openAlertsCount: number;
  openOccurrencesCount: number;
  pendingResidentsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  openAlertsCount,
  openOccurrencesCount,
  pendingResidentsCount = 0,
}) => {
  const { role, switchRole, user, logout } = useAuth();

  const navItems = [
    { id: 'overview' as NavTab, label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'floorplan' as NavTab, label: 'Planta das Unidades', icon: Grid3X3 },
    { id: 'residents' as NavTab, label: 'Moradores & Unidades', icon: Users, badge: pendingResidentsCount, badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'occurrences' as NavTab, label: 'Ocorrências', icon: AlertTriangle, badge: openOccurrencesCount, badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30' },
    { id: 'devices' as NavTab, label: 'Dispositivos ESP32', icon: Cpu },
    { id: 'policies' as NavTab, label: 'Políticas de Ruído', icon: Sliders },
    { id: 'simulator' as NavTab, label: 'Laboratório & Testes', icon: FlaskConical, highlight: true },
  ];

  return (
    <aside className="w-64 bg-space-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col justify-between h-screen sticky top-0 z-30">
      <div>
        {/* Vaultflow Logo & Brand */}
        <div className="p-6 border-b border-white/5 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-glow-purple">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              dBSound
              <span className="text-[9px] uppercase font-bold tracking-widest bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full">
                SaaS
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Acoustic Intelligence</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-glow-purple'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-amber-500/10 border border-amber-500/20'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${item.badgeColor || 'bg-violet-500/20 text-violet-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile & Role Switcher */}
      <div className="p-4 border-t border-white/5 bg-space-950/60">
        <div className="vault-card rounded-2xl p-3 border-white/10 mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-glow-purple shrink-0">
                {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'DB'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Usuário'}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {role === 'admin' ? 'Síndico Geral' : user?.apartment_number ? `Apto ${user.apartment_number}` : 'Pendente'}
                </p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sair da Conta"
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-red-400 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Preview Morador Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/morador/inicio';
              }}
              className="w-full py-1.5 px-2 rounded-xl bg-space-900 hover:bg-violet-500/20 text-slate-300 hover:text-violet-200 border border-white/5 hover:border-violet-500/30 text-[11px] font-medium transition flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>Ver Visão do Morador</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 text-[10px]">Telemetria Nuvem</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">v2.0</span>
        </div>
      </div>
    </aside>
  );
};
