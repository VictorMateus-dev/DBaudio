import React from 'react';
import { Apartment } from '../types/database.types';
import { WifiOff, ChevronRight, Activity, Sun, Moon } from 'lucide-react';

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
  const detectedFloors = Array.from(new Set(apartments.map(a => a.floor || 1))).sort((a, b) => b - a);
  const floors = detectedFloors.length > 0 ? detectedFloors : [1];

  const getStatusBorder = (status?: string) => {
    switch (status) {
      case 'critical':
        return 'border-rose-300 bg-rose-50/40 hover:border-rose-400';
      case 'warning':
        return 'border-amber-300 bg-amber-50/40 hover:border-amber-400';
      case 'offline':
        return 'border-slate-200 bg-slate-50/80 opacity-75';
      default:
        return 'border-slate-200 bg-white hover:border-slate-300';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Ruído Elevado
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Atenção
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Normal
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 bg-white border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 shadow-subtle">
        <span className="font-semibold text-slate-800">Legenda da Planta:</span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Normal (&lt; 60/70 dB)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Atenção (Próximo ao limite)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Ruído Elevado (Acima do limite)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
          <span>Offline / Sem telemetria</span>
        </div>
      </div>

      {/* Floors & Units */}
      <div className="space-y-5">
        {floors.map((floor) => {
          const floorApartments = apartments.filter(a => a.floor === floor || a.number.startsWith(String(floor)));
          
          return (
            <div key={floor} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {floor}º Andar — Bloco Principal
                </span>
                <span className="text-xs text-slate-400 font-medium">
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
                      className={`relative p-4 rounded-xl border transition-all cursor-pointer shadow-subtle ${getStatusBorder(apt.status)} ${
                        isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-card'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-base text-slate-900 font-mono tracking-tight">
                          Apto {apt.number}
                        </span>
                        {getStatusBadge(apt.status)}
                      </div>

                      {/* Decibel Metric & Progress Bar */}
                      <div className="my-3">
                        {isOffline ? (
                          <div className="flex items-center space-x-2 text-slate-400 py-2">
                            <WifiOff className="w-4 h-4" />
                            <span className="text-xs font-medium">Dispositivo desconectado</span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline justify-between mb-1.5">
                              <span className="text-2xl font-bold text-slate-900 font-mono">
                                {dbVal.toFixed(1)} <span className="text-xs font-normal text-slate-500">dB</span>
                              </span>
                              <span className="text-xs text-slate-500">
                                Pico: <strong className="text-slate-700 font-mono">{apt.peak_db?.toFixed(1) || '--'} dB</strong>
                              </span>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  apt.status === 'critical'
                                    ? 'bg-rose-500'
                                    : apt.status === 'warning'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Activity className="w-3.5 h-3.5 text-slate-400" />
                            <span>Limites:</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-600 flex items-center gap-1.5">
                            <span className="flex items-center gap-0.5">
                              <Sun className="w-3 h-3 text-amber-500" />
                              {apt.custom_day_threshold_db ?? 70} dB
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Moon className="w-3 h-3 text-indigo-500" />
                              {apt.custom_night_threshold_db ?? 60} dB
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-slate-400 text-[10px]">3 sensores calibrados</span>

                          <span className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition ml-auto">
                            Inspecionar <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </span>
                        </div>
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
