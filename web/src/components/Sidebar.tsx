import React from 'react';
import { 
  LayoutDashboard, 
  Grid3X3, 
  AlertTriangle, 
  Cpu, 
  Sliders, 
  FlaskConical, 
  Volume2, 
  ShieldCheck, 
  UserCircle 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export type NavTab = 'overview' | 'floorplan' | 'occurrences' | 'devices' | 'policies' | 'simulator';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openAlertsCount: number;
  openOccurrencesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  openAlertsCount,
  openOccurrencesCount,
}) => {
  const { role, switchRole, user } = useAuth();

  const navItems = [
    { id: 'overview' as NavTab, label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'floorplan' as NavTab, label: 'Planta das Unidades', icon: Grid3X3 },
    { id: 'occurrences' as NavTab, label: 'Ocorrências', icon: AlertTriangle, badge: openOccurrencesCount },
    { id: 'devices' as NavTab, label: 'Dispositivos ESP32', icon: Cpu },
    { id: 'policies' as NavTab, label: 'Políticas de Ruído', icon: Sliders },
    { id: 'simulator' as NavTab, label: 'Laboratório & Testes', icon: FlaskConical, highlight: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Logo & Brand */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              dBSound
              <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Pro</span>
            </h1>
            <p className="text-xs text-slate-400">Monitoramento Inteligente</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : item.highlight
                    ? 'text-amber-400 hover:bg-amber-500/10 border border-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile & Role Switcher */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 mb-3">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
              <UserCircle className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-[11px] text-slate-400 capitalize">{role === 'admin' ? 'Síndico / Admin' : 'Morador Apto 101'}</p>
            </div>
          </div>
          
          {/* Quick Role Toggle for testing RLS & views */}
          <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg text-[11px]">
            <button
              onClick={() => switchRole('admin')}
              className={`py-1 rounded font-medium transition ${
                role === 'admin' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Síndico
            </button>
            <button
              onClick={() => switchRole('resident')}
              className={`py-1 rounded font-medium transition ${
                role === 'resident' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Morador
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Telemetria Ativa</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">v1.2.0</span>
        </div>
      </div>
    </aside>
  );
};
