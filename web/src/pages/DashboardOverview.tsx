import React from 'react';
import { StatCard } from '../components/StatCard';
import { FloorPlanGrid } from '../components/FloorPlanGrid';
import { NoiseChart } from '../components/NoiseChart';
import { Apartment, Alert, Occurrence, Device } from '../types/database.types';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  VolumeX, 
  Flame, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface DashboardOverviewProps {
  apartments: Apartment[];
  devices: Device[];
  alerts: Alert[];
  occurrences: Occurrence[];
  onNavigateTab: (tab: NavTab) => void;
  onSelectApartment: (apartment: Apartment) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  apartments,
  devices,
  alerts,
  occurrences,
  onNavigateTab,
  onSelectApartment,
}) => {
  const onlineDevicesCount = devices.filter(d => d.status === 'online').length;
  const offlineDevicesCount = devices.filter(d => d.status === 'offline').length;
  const openOccurrencesCount = occurrences.filter(o => o.status === 'aberta' || o.status === 'em análise').length;
  const criticalEventsCount = apartments.filter(a => a.status === 'critical').length;
  
  // Calcular maior pico registrado
  const highestPeak = Math.max(...apartments.map(a => a.peak_db || 0), 0);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Painel de Monitoramento Síndico</h1>
          <p className="text-sm text-slate-400">
            Visão consolidada em tempo real da acústica predial e ocorrências condominiais.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs shadow-lg shadow-amber-500/20 transition"
          >
            <span>Abrir Simulador de Ruído</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Apartamentos"
          value={apartments.length}
          subtitle="9 monitorados (Bloco A)"
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Dispositivos Online"
          value={onlineDevicesCount}
          subtitle="ESP32 transmitindo"
          icon={Wifi}
          color="emerald"
        />
        <StatCard
          title="Dispositivos Offline"
          value={offlineDevicesCount}
          subtitle="Sem sinal recente"
          icon={WifiOff}
          color={offlineDevicesCount > 0 ? 'slate' : 'emerald'}
        />
        <StatCard
          title="Ocorrências Abertas"
          value={openOccurrencesCount}
          subtitle="Requerem despacho"
          icon={AlertCircle}
          color={openOccurrencesCount > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Alertas Críticos"
          value={criticalEventsCount}
          subtitle="Neste momento"
          icon={Flame}
          color={criticalEventsCount > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          title="Maior Pico Hoje"
          value={`${highestPeak.toFixed(1)} dB`}
          subtitle="Registrado no Bloco A"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Main Grid: Floor Plan Preview & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Floor Plan (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Planta dos Apartamentos</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h2>
            <button
              onClick={() => onNavigateTab('floorplan')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              Ver mapa expandido <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <FloorPlanGrid
            apartments={apartments}
            onSelectApartment={onSelectApartment}
          />

          <NoiseChart
            data={[
              { time: '18:00', decibel: 48 },
              { time: '19:00', decibel: 55 },
              { time: '20:00', decibel: 72 },
              { time: '21:00', decibel: 68 },
              { time: '22:00', decibel: 84 },
              { time: '23:00', decibel: 52 },
              { time: '00:00', decibel: 44 },
            ]}
          />
        </div>

        {/* Live Event Feed & Active Occurrences (1 Col) */}
        <div className="space-y-6">
          {/* Alerts Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                Alertas Recentes
              </h3>
              <span className="text-xs text-slate-500">{alerts.length} registros</span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nenhum ruído anômalo nas últimas horas.</p>
              ) : (
                alerts.map(alt => (
                  <div key={alt.id} className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white flex items-center gap-1">
                        {alt.severity === 'critical' ? '🔴' : '🟡'} Apto {alt.apartment_number || '101'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300">{alt.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Occurrences Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Últimas Ocorrências
              </h3>
              <button
                onClick={() => onNavigateTab('occurrences')}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Gerenciar
              </button>
            </div>

            <div className="space-y-3">
              {occurrences.slice(0, 3).map(occ => (
                <div key={occ.id} className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">{occ.type}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      occ.status === 'aberta' ? 'bg-amber-500/20 text-amber-400' :
                      occ.status === 'em análise' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {occ.status}
                    </span>
                  </div>
                  <p className="text-slate-400 line-clamp-2 text-[11px] mb-2">{occ.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{occ.location}</span>
                    <span>{new Date(occ.occurred_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
