import React, { useState } from 'react';
import { Bell, Clock, Wifi, Sparkles, Building } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '../types/database.types';

interface HeaderProps {
  alerts: Alert[];
  onSelectApartment?: (apartmentId: string) => void;
  onClearAlerts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ alerts, onSelectApartment }) => {
  const { isDemoMode } = useAuth();
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);

  // Determinar política vigente atual
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 22 || hour < 7;
  const currentPolicyName = isNight ? 'Noturna (Lei do Silêncio)' : 'Diurna Comercial';
  const currentThreshold = isNight ? '60 dB' : '70 dB';

  const unreadAlerts = alerts.filter(a => !a.read);

  return (
    <header className="h-16 w-full shrink-0 bg-space-950/80 backdrop-blur-xl border-b border-white/5 px-6 md:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Condominium details & Active Policy */}
      <div className="flex items-center space-x-6 min-w-0">
        <div className="shrink-0">
          <h2 className="text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
            <Building className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>Residencial dBSound • Bloco Central</span>
          </h2>
          <p className="text-[11px] text-slate-400 whitespace-nowrap">Gestão Acústica e Monitoramento em Tempo Real</p>
        </div>

        <div className="h-5 w-px bg-white/10 hidden lg:block shrink-0"></div>

        {/* Current Active Noise Policy Pill */}
        <div className="hidden md:flex items-center space-x-2 bg-space-900/90 px-3 py-1.5 rounded-full border border-white/10 text-xs">
          <Clock className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-slate-400">Vigência Geral:</span>
          <span className="text-slate-200 font-medium">{currentPolicyName}</span>
          <span className="bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-mono font-bold text-[10px]">
            {currentThreshold}
          </span>
        </div>
      </div>

      {/* Right status items: Connection mode & Notification Center */}
      <div className="flex items-center space-x-3">
        {/* Environment Status Badge */}
        {isDemoMode ? (
          <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Modo Local / Simulador</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full text-xs font-medium">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Cloud Conectado</span>
          </div>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAlertDropdown(!showAlertDropdown)}
            className="relative p-2.5 rounded-xl bg-space-900/90 text-slate-300 hover:text-white border border-white/10 hover:border-violet-500/30 transition shadow-sm"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertDropdown && (
            <div className="absolute right-0 mt-2 w-80 vault-card rounded-2xl shadow-glass-card overflow-hidden z-50 animate-fadeIn">
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-space-900/90">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Alertas em Tempo Real ({unreadAlerts.length})
                </span>
                <span className="text-[10px] text-slate-400">Recentes</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
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
                      className={`p-3 text-xs hover:bg-white/[0.04] cursor-pointer transition ${
                        !alt.read ? 'bg-violet-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">Apto {alt.apartment_number || '101'}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(alt.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 line-clamp-2 text-[11px]">{alt.message}</p>
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
