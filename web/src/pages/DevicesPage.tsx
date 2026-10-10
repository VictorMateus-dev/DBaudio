import React, { useState } from 'react';
import { Device } from '../types/database.types';
import { Cpu, Wifi, WifiOff, AlertCircle, RefreshCw, CheckCircle2, Shield } from 'lucide-react';

interface DevicesPageProps {
  devices: Device[];
  onRefresh?: () => void;
}

export const DevicesPage: React.FC<DevicesPageProps> = ({ devices, onRefresh }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [pingingDeviceId, setPingingDeviceId] = useState<string | null>(null);

  const handlePingDevice = (deviceId: string) => {
    setPingingDeviceId(deviceId);
    setTimeout(() => {
      setPingingDeviceId(null);
    }, 1200);
  };

  const filteredDevices = devices.filter(d => {
    if (filterStatus === 'all') return true;
    return d.status === filterStatus;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventário de Dispositivos ESP32</h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerenciamento e monitoramento do hardware de telemetria acústica por microcontrolador.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
            {['all', 'online', 'offline', 'maintenance'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg font-medium capitalize transition ${
                  filterStatus === s ? 'bg-white text-brand-600 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s === 'maintenance' ? 'Manutenção' : s === 'all' ? 'Todos' : s}
              </button>
            ))}
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Banner de Segurança */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-700">
        <Shield className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900 block mb-0.5">Segurança de Comunicação Hardware:</span>
          <span>
            Cada microcontrolador ESP32 comunica-se exclusivamente através do endpoint seguro 
            <code className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-brand-700 font-mono ml-1">rpc/ingest_reading</code> com 
            <strong className="text-slate-900"> device_uid</strong> e chave de identificação de hardware. Nenhuma Service Role Key é gravada na memória flash do microcontrolador.
          </span>
        </div>
      </div>

      {/* Tabela de Dispositivos */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] uppercase font-semibold text-slate-600 tracking-wider">
              <tr>
                <th className="py-4 px-6">Identificação Hardware</th>
                <th className="py-4 px-6">Unidade Associada</th>
                <th className="py-4 px-6">Status Operacional</th>
                <th className="py-4 px-6">Sensores (MAX9814)</th>
                <th className="py-4 px-6">Firmware</th>
                <th className="py-4 px-6">Último Heartbeat</th>
                <th className="py-4 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDevices.map(dev => {
                const isPinging = pingingDeviceId === dev.id;
                return (
                  <tr key={dev.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-brand-600">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-900 block">{dev.device_uid}</span>
                          <span className="text-[11px] text-slate-500">{dev.name}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-semibold text-slate-800">
                      Apartamento {dev.apartment_number}
                    </td>

                    <td className="py-4 px-6">
                      {dev.status === 'online' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Online
                        </span>
                      ) : dev.status === 'maintenance' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Manutenção
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <WifiOff className="w-3 h-3 text-slate-400" />
                          Offline
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1 font-mono text-[11px]">
                        <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700" title="Canal 1: Sala">Ch1:Sala</span>
                        <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700" title="Canal 2: Quarto">Ch2:Quarto</span>
                        <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700" title="Canal 3: Cozinha">Ch3:Cozinha</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono text-slate-600">
                      v{dev.firmware_version}
                    </td>

                    <td className="py-4 px-6 text-slate-500">
                      {dev.status === 'online' ? 'Há 5 segundos' : 'Há 3 horas'}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handlePingDevice(dev.id)}
                        disabled={isPinging || dev.status === 'offline'}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-40 shadow-sm text-xs font-medium"
                      >
                        {isPinging ? 'Testando...' : 'Diagnóstico'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
