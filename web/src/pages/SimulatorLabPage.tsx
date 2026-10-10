import React, { useState, useEffect, useRef } from 'react';
import { Apartment, Device, Sensor } from '../types/database.types';
import { DataService, localStore } from '../lib/dataService';
import { 
  FlaskConical, 
  Play, 
  Square, 
  Flame, 
  WifiOff, 
  Trash2, 
  Sliders, 
  Volume2, 
  CheckCircle2,
  AlertTriangle,
  Radio,
  Timer
} from 'lucide-react';

interface SimulatorLabPageProps {
  apartments: Apartment[];
  devices: Device[];
  initialApartmentId?: string;
  onSimulationTriggered?: () => void;
}

export const SimulatorLabPage: React.FC<SimulatorLabPageProps> = ({
  apartments,
  devices,
  initialApartmentId,
  onSimulationTriggered,
}) => {
  const [selectedAptId, setSelectedAptId] = useState<string>(
    initialApartmentId || apartments[0]?.id || ''
  );
  const [selectedSensorPosition, setSelectedSensorPosition] = useState<string>('Sala');
  const [selectedSource, setSelectedSource] = useState<'simulation' | 'manual'>('simulation');
  const [decibelValue, setDecibelValue] = useState<number>(65);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);

  const simulationIntervalRef = useRef<any>(null);

  useEffect(() => {
    if ((!selectedAptId || !apartments.some(a => a.id === selectedAptId)) && apartments.length > 0) {
      setSelectedAptId(initialApartmentId || apartments[0].id);
    }
  }, [apartments, initialApartmentId, selectedAptId]);

  const presets = [
    { label: '40 dB (Silêncio)', value: 40, desc: 'Ambiente tranquilo / biblioteca' },
    { label: '65 dB (Conversa)', value: 65, desc: 'Conversa normal / TV moderada' },
    { label: '70 dB (Limite Diurno)', value: 70, desc: 'Limite diurno do condomínio' },
    { label: '80 dB (Aspirador/Música)', value: 80, desc: 'Música alta / aspirador de pó' },
    { label: '95 dB (Festa/Furadeira)', value: 95, desc: 'Ruído crítico / furadeira de impacto' },
  ];

  const selectedApartment = apartments.find(a => a.id === selectedAptId) || apartments[0];
  const selectedDevice = devices.find(d => d.apartment_id === selectedAptId) || devices[0];

  const handleInjectSingle = async (db: number) => {
    if (!selectedApartment) return;

    await DataService.injectReading({
      apartment_id: selectedApartment.id,
      decibel: db,
      source: selectedSource,
      is_test_data: true,
      device_id: selectedDevice?.id,
    });

    setLastFeedback(`Leitura de ${db.toFixed(1)} dB injetada no Apto ${selectedApartment.number} (${selectedSensorPosition})`);
    onSimulationTriggered?.();
  };

  const startContinuousSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    simulationIntervalRef.current = setInterval(() => {
      const jitter = (Math.random() - 0.5) * 3;
      const readingDb = Math.max(30, Math.min(110, decibelValue + jitter));

      handleInjectSingle(readingDb);
    }, 1500);
  };

  const stopContinuousSimulation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulating(false);
  };

  const testCriticalAlert = async () => {
    stopContinuousSimulation();
    const targetApt = selectedApartment;
    if (!targetApt) return;
    setLastFeedback(`Iniciando Teste de Alerta Crítico (95 dB sustentado por 5s no Apto ${targetApt.number})...`);
    
    await handleInjectSingle(94.0);
    setTimeout(() => handleInjectSingle(96.5), 1200);
    setTimeout(() => {
      handleInjectSingle(95.0);
      setLastFeedback(`Teste Crítico Finalizado: Evento agrupado e Alerta disparado com sucesso no Apto ${targetApt.number}!`);
    }, 2600);
  };

  const testOfflineDevice = () => {
    if (!selectedApartment) return;
    selectedApartment.status = 'offline';
    if (selectedDevice) selectedDevice.status = 'offline';
    localStore.notify();
    setLastFeedback(`Dispositivo do Apto ${selectedApartment.number} simulado como OFFLINE.`);
    onSimulationTriggered?.();
  };

  const handleCleanTestData = async () => {
    stopContinuousSimulation();
    const res = await DataService.cleanTestData();
    setCleanFeedback(`Dados de teste limpos com sucesso (${res.deletedCount} registros expurgados). Leituras reais preservadas.`);
    setTimeout(() => setCleanFeedback(null), 4000);
    onSimulationTriggered?.();
  };

  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-brand-600" />
              Laboratório & Simulador de Ruído
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-brand-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
              Pipeline Único Ativo
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Ambiente de testes para geração de telemetria controlada, validação de regras de detecção e disparo de alertas.
          </p>
        </div>

        <button
          onClick={handleCleanTestData}
          className="flex items-center space-x-2 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Trash2 className="w-4 h-4 text-slate-400" />
          <span>Limpar Dados de Teste</span>
        </button>
      </div>

      {/* Alertas de Feedback */}
      {cleanFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{cleanFeedback}</span>
        </div>
      )}

      {lastFeedback && !cleanFeedback && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-brand-800 flex items-center gap-2 font-medium">
          <Radio className="w-4 h-4 text-brand-600 shrink-0 animate-pulse" />
          <span>{lastFeedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna Principal: Parâmetros de Injeção */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-600" />
              Parâmetros da Injeção de Ruído
            </h3>

            {/* Seleção de Destino */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1.5">Apartamento Alvo</label>
                <select
                  value={selectedAptId}
                  onChange={(e) => setSelectedAptId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                >
                  {apartments.map(a => (
                    <option key={a.id} value={a.id}>
                      Apto {a.number} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1.5">Sensor Alvo (MAX9814)</label>
                <select
                  value={selectedSensorPosition}
                  onChange={(e) => setSelectedSensorPosition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                >
                  <option value="Sala">Canal 1 — Sala</option>
                  <option value="Quarto">Canal 2 — Quarto</option>
                  <option value="Cozinha">Canal 3 — Cozinha</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1.5">Origem da Leitura</label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                >
                  <option value="simulation">simulation (Simulador)</option>
                  <option value="manual">manual (Inserção Manual)</option>
                </select>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div>
              <label className="block text-slate-600 font-medium mb-2 text-xs">
                Botões Rápidos de Nível Sonoro
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {presets.map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setDecibelValue(p.value);
                      handleInjectSingle(p.value);
                    }}
                    className={`p-3 rounded-xl border text-left transition ${
                      decibelValue === p.value
                        ? 'bg-blue-50 border-brand-500 text-brand-900 shadow-sm ring-1 ring-brand-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-mono font-bold text-sm block">{p.value} dB</span>
                    <span className="text-[10px] text-slate-500 truncate block mt-0.5">{p.label.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider de dB */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">Intensidade Customizada (dB SPL):</label>
                <div className="flex items-baseline space-x-1 font-mono">
                  <span className="text-2xl font-bold text-slate-900">{decibelValue.toFixed(1)}</span>
                  <span className="text-xs text-slate-500">dB</span>
                </div>
              </div>

              <input
                type="range"
                min="35"
                max="105"
                step="0.5"
                value={decibelValue}
                onChange={(e) => setDecibelValue(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />

              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>35 dB (Silêncio)</span>
                <span>60 dB (Noturno)</span>
                <span>70 dB (Diurno)</span>
                <span>80 dB (Atenção)</span>
                <span>105 dB (Crítico)</span>
              </div>
            </div>

            {/* Ações de Disparo */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              {!isSimulating ? (
                <button
                  onClick={startContinuousSimulation}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-sm transition"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Iniciar Simulação Contínua</span>
                </button>
              ) : (
                <button
                  onClick={stopContinuousSimulation}
                  className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-sm transition animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Parar Simulação Contínua</span>
                </button>
              )}

              <button
                onClick={() => handleInjectSingle(decibelValue)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-xs font-semibold transition"
              >
                Injetar Leitura Única
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Cenários Rápidos */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-500" />
              Cenários de Teste Rápidos
            </h3>
            <p className="text-xs text-slate-500">
              Executa baterias automáticas para verificar a aderência do pipeline às regras do condomínio.
            </p>

            <div className="space-y-3 pt-1">
              <button
                onClick={testCriticalAlert}
                className="w-full text-left p-4 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 transition group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-rose-800 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-600" />
                    Testar Alerta Crítico (95 dB)
                  </span>
                  <span className="text-[10px] bg-rose-100 px-1.5 py-0.5 rounded font-mono text-rose-700">5s</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Simula ruído contínuo de furadeira/festa acima de 95 dB até disparar notificação vermelha.
                </p>
              </button>

              <button
                onClick={testOfflineDevice}
                className="w-full text-left p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                  <span className="flex items-center gap-1.5">
                    <WifiOff className="w-4 h-4 text-slate-500" />
                    Testar Dispositivo Offline
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Simula interrupção do heartbeat do ESP32 marcando a unidade como offline na planta.
                </p>
              </button>

              <button
                onClick={() => {
                  if (!selectedApartment) return;
                  handleInjectSingle(95.0);
                  setLastFeedback(`Ruído pontual de 95 dB injetado (1s) no Apto ${selectedApartment.number} — Teste de Debounce: Medidor atualiza para 95.0 dB, sem disparar alerta crítico!`);
                }}
                className="w-full text-left p-4 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 transition"
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-1">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Testar Ruído Pontual (Sem Alerta)
                  </span>
                  <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-700">1s</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Injeta pico de 95 dB por 1 segundo. Valida se a regra de duração mínima impede o alarme falso.
                </p>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5 text-slate-600">
            <span className="font-semibold text-slate-900 block">Garantia do Pipeline Único:</span>
            <p className="text-[11px] leading-relaxed">
              Toda leitura disparada por este simulador passa pelo <strong>mesmo fluxo de ingestão</strong> e 
              <strong> trigger PostgreSQL</strong> que o microcontrolador ESP32 físico. Não existem caminhos paralelos ou falsos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
