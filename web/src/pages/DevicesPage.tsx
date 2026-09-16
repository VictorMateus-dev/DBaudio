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
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Inventário de Dispositivos ESP32</h1>
          <p className="text-sm text-slate-400">
            Gerenciamento e monitoramento do hardware de telemetria acústica por microcontrolador.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            {['all', 'online', 'offline', 'maintenance'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded font-medium capitalize transition ${
                  filterStatus === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s === 'maintenance' ? 'Manutenção' : s}
              </button>
            ))}
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-300">
        <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white block mb-0.5">Segurança de Comunicação Hardware:</span>
          <span>
            Cada microcontrolador ESP32 comunica-se exclusivamente através do endpoint seguro 
            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 ml-1">rpc/ingest_reading</code> com 
            <strong className="text-white"> device_uid</strong> e chave de identificação de hardware. Nenhuma Service Role Key é gravada na memória flash do microcontrolador.
          </span>
        </div>
      </div>

      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
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
            <tbody className="divide-y divide-slate-800/60">
              {filteredDevices.map(dev => {
                const isPinging = pingingDeviceId === dev.id;
                return (
                  <tr key={dev.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-slate-800 text-blue-400">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-white block">{dev.device_uid}</span>
                          <span className="text-[11px] text-slate-500">{dev.name}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono font-semibold text-white">
                      Apartamento {dev.apartment_number}
                    </td>

                    <td className="py-4 px-6">
                      {dev.status === 'online' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Online
                        </span>
                      ) : dev.status === 'maintenance' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3 h-3" />
                          Manutenção
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          <WifiOff className="w-3 h-3" />
                          Offline
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1 font-mono text-[11px]">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-400" title="Canal 1: Sala">Ch1:Sala</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-400" title="Canal 2: Quarto">Ch2:Quarto</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-400" title="Canal 3: Cozinha">Ch3:Cozinha</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono text-slate-300">
                      v{dev.firmware_version}
                    </td>

                    <td className="py-4 px-6 text-slate-400">
                      {dev.status === 'online' ? 'Há 5 segundos' : 'Há 3 horas'}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handlePingDevice(dev.id)}
                        disabled={isPinging || dev.status === 'offline'}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-40"
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
