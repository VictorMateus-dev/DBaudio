import React from 'react';
import { Apartment } from '../types/database.types';
import { Volume2, WifiOff, ChevronRight, Activity } from 'lucide-react';

interface FloorPlanGridProps {
  apartments: Apartment[];
  onSelectApartment: (apartment: Apartment) => void;
  selectedApartmentId?: string;
}

export const FloorPlanGrid: React.FC<FloorPlanGridProps> = ({
  apartments,
  onSelectApartment,
  selectedApartmentId,
}) => {
  // Organizar apartamentos por andar (3º andar, 2º andar, 1º andar)
  const floors = [3, 2, 1];

  const getStatusBorder = (status?: string) => {
    switch (status) {
      case 'critical':
        return 'border-red-500 bg-red-950/20 shadow-lg shadow-red-500/10 critical-pulse';
      case 'warning':
        return 'border-amber-500/80 bg-amber-950/20';
      case 'offline':
        return 'border-slate-800 bg-slate-900/40 opacity-70';
      default:
        return 'border-slate-800 bg-slate-900/80 hover:border-blue-500/50';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'critical':
        return <span className="flex items-center gap-1 text-[11px] font-bold text-red-400">🔴 Ruído Elevado</span>;
      case 'warning':
        return <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400">🟡 Atenção</span>;
      case 'offline':
        return <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">⚫ Offline</span>;
      default:
        return <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">🟢 Normal</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Legenda Explicativa */}
      <div className="flex flex-wrap items-center gap-6 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs">
        <span className="font-semibold text-slate-300">Legenda da Planta:</span>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>🟢 Normal (&lt; 60/70 dB)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span>🟡 Atenção (Aproximando do limite)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          <span>🔴 Ruído Elevado (Acima do limite)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
          <span>⚫ Offline / Sem telemetria</span>
        </div>
      </div>

      {/* Grid Organizado por Andar */}
      <div className="space-y-4">
        {floors.map((floor) => {
          const floorApartments = apartments.filter(a => a.floor === floor || a.number.startsWith(String(floor)));
          
          return (
            <div key={floor} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  {floor}º Andar — Bloco A
                </span>
                <span className="text-xs text-slate-500">
                  {floorApartments.length} Unidades
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {floorApartments.map((apt) => {
                  const isSelected = selectedApartmentId === apt.id;
                  const isOffline = apt.status === 'offline';
                  const dbVal = apt.current_db || 0;
                  const percent = Math.min(100, Math.max(0, ((dbVal - 30) / (100 - 30)) * 100));

                  return (
                    <div
                      key={apt.id}
                      onClick={() => onSelectApartment(apt)}
                      className={`relative p-5 rounded-xl border transition-all cursor-pointer ${getStatusBorder(apt.status)} ${
                        isSelected ? 'ring-2 ring-blue-500 shadow-xl' : 'hover:scale-[1.01]'
                      }`}
                    >
                      {/* Top Header of Card */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-lg text-white font-mono tracking-tight">
                            Apto {apt.number}
                          </span>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>

                      {/* Noise Meter Display */}
                      <div className="my-3">
                        {isOffline ? (
                          <div className="flex items-center space-x-2 text-slate-500 py-2">
                            <WifiOff className="w-5 h-5" />
                            <span className="text-xs font-medium">Dispositivo desconectado</span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline justify-between mb-1.5">
                              <span className="text-2xl font-black text-white font-mono">
                                {dbVal.toFixed(1)} <span className="text-xs font-normal text-slate-400">dB</span>
                              </span>
                              <span className="text-xs text-slate-400">
                                Pico: <strong className="text-slate-200 font-mono">{apt.peak_db?.toFixed(1) || '--'} dB</strong>
                              </span>
                            </div>

                            {/* Progress bar representing sound level */}
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  apt.status === 'critical'
                                    ? 'bg-red-500'
                                    : apt.status === 'warning'
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action trigger */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Activity className="w-3.5 h-3.5 text-blue-400" />
                          3 sensores ativos
                        </span>
                        <span className="flex items-center text-blue-400 font-medium group-hover:translate-x-0.5 transition">
                          Ver detalhes <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
