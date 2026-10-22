import { activePolicy } from '../lib/noisePolicy';
import React, { useState } from 'react';
import { Bell, Clock, Wifi, Building, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Alert, NoisePolicy } from '../types/database.types';

interface HeaderProps {
  alerts: Alert[];
  policies: NoisePolicy[];
  onSelectApartment?: (apartmentId: string) => void;
  onClearAlerts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ alerts, policies, onSelectApartment }) => {
  const { isDemoMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);

  const [now, setNow] = useState(new Date());
  React.useEffect(() => { const timer = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(timer); }, []);
  const policy = activePolicy(policies, now);
  const isNight = policy ? policy.start_time > policy.end_time : false;
  const currentPolicyName = policy?.name || 'Sem política ativa';
  const currentThreshold = policy ? 'Modal: ' + policy.critical_threshold_db + ' dB' : 'Configure os períodos';

  const unreadAlerts = alerts.filter(a => !a.read);

  return (
    <header className="h-16 w-full shrink-0 bg-white border-b border-slate-200/80 px-6 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-subtle">
      
      {/* Title & Policy info */}
      <div className="flex items-center space-x-6 min-w-0">
        <div className="shrink-0">
          <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
            <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Residencial dBSound • Bloco Central</span>
          </h2>
          <p className="text-[11px] text-slate-500 whitespace-nowrap">Gestão Acústica e Monitoramento em Tempo Real</p>
        </div>

        <div className="h-5 w-px bg-slate-200 hidden lg:block shrink-0"></div>

        {/* Current Policy Pill */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
          {isNight ? (
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className="text-slate-500">Vigência Geral:</span>
          <span className="text-slate-800 font-medium">{currentPolicyName}</span>
          <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold text-[10px]">
            {currentThreshold}
          </span>
        </div>
      </div>

      {/* Status & Notifications */}
      <div className="flex items-center space-x-2.5">
        
        {/* Dark/Light Mode Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition shadow-subtle flex items-center gap-1.5 cursor-pointer"
          title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
          <span className="text-[11px] font-semibold hidden xl:inline">
            {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
          </span>
        </button>

        {isDemoMode ? (
          <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Modo Local / Simulador</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium">
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase Cloud Conectado</span>
          </div>
        )}

        {/* Alert Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlertDropdown(!showAlertDropdown)}
            className="relative p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition shadow-subtle cursor-pointer"
            title="Alertas do Sistema"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-elevated border border-slate-200 overflow-hidden z-50 animate-fadeIn">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Alertas em Tempo Real ({unreadAlerts.length})
                </span>
                <span className="text-[10px] text-slate-400">Recentes</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Nenhum alerta recente registrado.
                  </div>
                ) : (
                  alerts.slice(0, 10).map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => {
                        onSelectApartment?.(alt.apartment_id);
                        setShowAlertDropdown(false);
                      }}
                      className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition ${
                        !alt.read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800">Apto {alt.apartment_number || '101'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(alt.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-2 text-[11px]">{alt.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
