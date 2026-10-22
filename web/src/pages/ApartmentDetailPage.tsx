import React, { useState } from 'react';
import { Apartment, Device, Sensor, Occurrence, Alert } from '../types/database.types';
import { NoiseLevelBadge } from '../components/NoiseLevelBadge';
import { NoiseChart } from '../components/NoiseChart';
import { 
  ArrowLeft, 
  Cpu, 
  Activity, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Sliders,
  Volume2,
} from 'lucide-react';

interface ApartmentDetailPageProps {
  apartment: Apartment;
  device?: Device;
  sensors: Sensor[];
  occurrences: Occurrence[];
  alerts: Alert[];
  onBack: () => void;
  onOpenSimulator: (aptId: string) => void;
}

export const ApartmentDetailPage: React.FC<ApartmentDetailPageProps> = ({
  apartment,
  device,
  sensors,
  occurrences,
  alerts,
  onBack,
  onOpenSimulator,
}) => {
  const [selectedSensorChannel, setSelectedSensorChannel] = useState<number>(1);

  const currentDb = apartment.current_db || 45.0;
  const sensorReadings: Record<number, number> = {
    1: currentDb,
    2: Math.max(35, currentDb - 4.2),
    3: Math.max(35, currentDb - 7.5),
  };

  const aptOccurrences = occurrences.filter(
    o => o.apartment_id === apartment.id || o.location.includes(apartment.number)
  );

  const aptAlerts = alerts.filter(a => a.apartment_id === apartment.id);

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      
      {/* Top Action Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-900 transition group w-fit font-medium"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
          <span>Voltar para Planta</span>
        </button>

        <div className="flex items-center space-x-3">

          <button
            onClick={() => onOpenSimulator(apartment.id)}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-subtle transition"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Simular Ruído Nesta Unidade</span>
          </button>
        </div>
      </div>

      {/* Hero Unit Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-subtle relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
                Apartamento {apartment.number}
              </h1>
              <NoiseLevelBadge status={apartment.status} decibel={apartment.current_db} size="lg" />
            </div>
            <p className="text-sm text-slate-500">
              Bloco Principal • {apartment.floor || 1}º Andar • Unidade Residencial
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="text-center px-4">
              <span className="text-[11px] text-slate-500 block uppercase font-bold">Nível Atual</span>
              <span className="text-2xl font-bold text-slate-900 font-mono">{currentDb.toFixed(1)} <span className="text-xs text-slate-500">dB</span></span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center px-4">
              <span className="text-[11px] text-slate-500 block uppercase font-bold">Pico Registrado</span>
              <span className="text-2xl font-bold text-amber-700 font-mono">{apartment.peak_db?.toFixed(1) || '--'} <span className="text-xs text-slate-500">dB</span></span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center px-4">
              <span className="text-[11px] text-slate-500 block uppercase font-bold">Média 24h</span>
              <span className="text-2xl font-bold text-blue-700 font-mono">{apartment.avg_db?.toFixed(1) || '46.0'} <span className="text-xs text-slate-500">dB</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Hardware & Sensor Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Hardware Status */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-4 shadow-subtle">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-900">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>Hardware ESP32 Associado</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Device UID</span>
              <span className="font-mono text-slate-900 font-medium">{device?.device_uid || 'ESP32-APT-' + apartment.number}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Status</span>
              <span className={`font-semibold capitalize ${
                apartment.status === 'offline' ? 'text-slate-400' : 'text-emerald-700'
              }`}>
                {apartment.status === 'offline' ? 'Offline' : 'Online / Conectado'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Firmware</span>
              <span className="font-mono text-slate-700">{device?.firmware_version || '1.2.0'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Último Heartbeat</span>
              <span className="text-slate-700">Há poucos segundos</span>
            </div>
          </div>
        </div>

        {/* MAX9814 Sensor Channels */}
        <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 space-y-4 shadow-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-900">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Canais dos Sensores MAX9814</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">3 canais calibrados</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { channel: 1, name: 'Sensor 1 — Sala', pos: 'Sala Principal' },
              { channel: 2, name: 'Sensor 2 — Quarto', pos: 'Quarto Casal' },
              { channel: 3, name: 'Sensor 3 — Cozinha', pos: 'Cozinha / Área' },
            ].map(s => {
              const val = sensorReadings[s.channel];
              const isSelected = selectedSensorChannel === s.channel;
              return (
                <div
                  key={s.channel}
                  onClick={() => setSelectedSensorChannel(s.channel)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected ? 'bg-blue-50/60 border-blue-400 shadow-subtle' : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                    {s.pos}
                  </span>
                  <div className="flex items-baseline space-x-1 mb-2">
                    <span className="text-2xl font-bold text-slate-900 font-mono">{val.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">dB</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] text-emerald-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Canal {s.channel} Ativo</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Noise Chart */}
      <NoiseChart
        data={[
          { time: '17:00', decibel: Math.max(35, currentDb - 8) },
          { time: '18:00', decibel: Math.max(35, currentDb - 4) },
          { time: '19:00', decibel: Math.max(35, currentDb - 2) },
          { time: '20:00', decibel: currentDb },
          { time: '21:00', decibel: Math.max(35, currentDb - 5) },
          { time: '22:00', decibel: currentDb },
        ]}
      />

      {/* Bottom Grid: Alerts & Occurrences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Alerts for unit */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-4 shadow-subtle">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            Alertas Emitidos para esta Unidade ({aptAlerts.length})
          </h3>
          {aptAlerts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Nenhum alerta recente para esta unidade.</p>
          ) : (
            <div className="space-y-2.5">
              {aptAlerts.map(a => (
                <div key={a.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs">
                  <div className="flex justify-between font-semibold text-slate-800 mb-1">
                    <span>{a.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(a.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Occurrences for unit */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-4 shadow-subtle">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Ocorrências Vinculadas ({aptOccurrences.length})
          </h3>
          {aptOccurrences.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Nenhuma ocorrência registrada para esta unidade.</p>
          ) : (
            <div className="space-y-2.5">
              {aptOccurrences.map(o => (
                <div key={o.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs">
                  <div className="flex justify-between font-semibold text-slate-800 mb-1">
                    <span>{o.type}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">{o.status}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mb-2 leading-relaxed">{o.description}</p>
                  <span className="text-[10px] text-slate-400 font-mono">{new Date(o.occurred_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
