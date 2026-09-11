import React, { useState } from 'react';
import { Bell, Shield, Clock, Wifi, AlertCircle, CheckCircle } from 'lucide-react';
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

  // Determinar política vigente atual (horário de Brasília)
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 22 || hour < 7;
  const currentPolicyName = isNight ? 'Noturna (Lei do Silêncio)' : 'Diurna Comercial';
  const currentThreshold = isNight ? '60 dB' : '70 dB';

  const unreadAlerts = alerts.filter(a => !a.read);

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Condominium details & Active Policy */}
      <div className="flex items-center space-x-6">
        <div>
          <h2 className="text-sm font-semibold text-white">Residencial dBSound — Bloco A</h2>
          <p className="text-xs text-slate-400">Av. das Nações Inteligentes, 1000</p>
        </div>

        <div className="h-6 w-px bg-slate-800 hidden md:block"></div>

        {/* Current Active Noise Policy Pill */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">Vigência:</span>
          <span className="text-slate-200 font-medium">{currentPolicyName}</span>
          <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">
            Máx {currentThreshold}
          </span>
        </div>
      </div>

      {/* Right status items: Connection mode & Notification Center */}
      <div className="flex items-center space-x-4">
        {/* Environment Status Badge */}
        {isDemoMode ? (
          <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Modo Local / Laboratório</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium">
            <Wifi className="w-3.5 h-3.5" />
            <span>Supabase Realtime Conectado</span>
          </div>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAlertDropdown(!showAlertDropdown)}
            className="relative p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <Bell className="w-5 h-5" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Alertas em Tempo Real ({unreadAlerts.length})
                </span>
                <span className="text-[11px] text-slate-400">Histórico Recente</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Nenhum alerta recente registrado.
                  </div>
                ) : (
                  alerts.map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => {
                        onSelectApartment?.(alt.apartment_id);
                        setShowAlertDropdown(false);
                      }}
                      className={`p-3 text-xs hover:bg-slate-800/80 cursor-pointer transition ${
                        !alt.read ? 'bg-slate-800/40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold flex items-center gap-1 ${
                          alt.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          {alt.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(alt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{alt.message}</p>
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
