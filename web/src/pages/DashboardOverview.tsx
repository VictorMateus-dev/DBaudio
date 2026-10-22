import React from 'react';
import { StatCard } from '../components/StatCard';
import { ApartmentMap } from '../components/ApartmentMap';
import { NoiseChart } from '../components/NoiseChart';
import { Apartment, Alert, Occurrence, Device } from '../types/database.types';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  Flame, 
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface DashboardOverviewProps {
  apartments: Apartment[];
  devices: Device[];
  alerts: Alert[];
  occurrences: Occurrence[];
  onNavigateTab: (tab: NavTab) => void;
  onSelectApartment: (apartment: Apartment) => void;
  onRefresh: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  apartments,
  devices,
  alerts,
  occurrences,
  onNavigateTab,
  onSelectApartment,
  onRefresh,
}) => {
  const onlineDevicesCount = devices.filter(d => d.status === 'online').length;
  const offlineDevicesCount = devices.filter(d => d.status === 'offline').length;
  const openOccurrencesCount = occurrences.filter(o => o.status === 'aberta' || o.status === 'em análise').length;
  const criticalEventsCount = apartments.filter(a => a.status === 'critical').length;
  
  const highestPeak = Math.max(...apartments.map(a => a.peak_db || 0), 0);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Painel Geral</h1>
          <p className="text-sm text-slate-500">
            Indicadores, planta das unidades e acompanhamento acústico em uma única página.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-lg text-xs border border-slate-200 shadow-subtle transition"
          >
            <span>Abrir Simulador de Ruído</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Stat Cards KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Apartamentos"
          value={apartments.length}
          subtitle={`${apartments.length} unidades no painel`}
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

      <ApartmentMap apartments={apartments} onSelectApartment={onSelectApartment} onRefresh={onRefresh} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
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

        {/* Right 1 Col: Alerts & Occurrences */}
        <div className="space-y-6">
          
          {/* Recent Alerts Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Alertas Recentes
              </h3>
              <span className="text-xs text-slate-400 font-medium">{alerts.length} registros</span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nenhum ruído anômalo nas últimas horas.</p>
              ) : (
                alerts.map(alt => {
                  const targetApt = apartments.find(a => a.id === alt.apartment_id || a.number === alt.apartment_number);
                  const isCritical = alt.severity === 'critical';
                  return (
                    <div key={alt.id} className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                          Apto {alt.apartment_number || '101'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(alt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{alt.message}</p>

                      {targetApt && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-400">Telemetria elevada</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Occurrences Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Últimas Ocorrências
              </h3>
              <button
                onClick={() => onNavigateTab('occurrences')}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Gerenciar
              </button>
            </div>

            <div className="space-y-3">
              {occurrences.slice(0, 3).map(occ => (
                <div key={occ.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">{occ.type}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      occ.status === 'aberta' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      occ.status === 'em análise' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {occ.status}
                    </span>
                  </div>
                  <p className="text-slate-600 line-clamp-2 text-[11px] mb-2 leading-relaxed">{occ.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{occ.location}</span>
                    <span className="font-mono">{new Date(occ.occurred_at).toLocaleDateString()}</span>
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
