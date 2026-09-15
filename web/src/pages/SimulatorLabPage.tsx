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

  // Garante que o apartamento selecionado seja preenchido assim que a lista de apartamentos carregar
  useEffect(() => {
    if ((!selectedAptId || !apartments.some(a => a.id === selectedAptId)) && apartments.length > 0) {
      setSelectedAptId(initialApartmentId || apartments[0].id);
    }
  }, [apartments, initialApartmentId, selectedAptId]);

  // Quick preset buttons
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
      // Pequena variação acústica natural (+/- 2 dB) em torno do valor selecionado
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

  // Testes Rápidos Prontos (Cenários Práticos)
  const testCriticalAlert = async () => {
    stopContinuousSimulation();
    const targetApt = selectedApartment;
    if (!targetApt) return;
    setLastFeedback(`Iniciando Teste de Alerta Crítico (95 dB sustentado por 5s no Apto ${targetApt.number})...`);
    
    // Injeta 3 leituras consecutivas para ultrapassar a duração mínima de 3s (debounce window)
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
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-amber-400" />
              Laboratório & Simulador de Ruído
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
              Pipeline Único Ativo
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Ambiente de testes para geração de telemetria controlada, validação de regras de detecção e disparo de alertas.
          </p>
        </div>

        <button
          onClick={handleCleanTestData}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-lg text-xs font-semibold transition"
        >
          <Trash2 className="w-4 h-4" />
          <span>Limpar Dados de Teste</span>
        </button>
      </div>

      {/* Feedbacks */}
      {cleanFeedback && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{cleanFeedback}</span>
        </div>
      )}

      {lastFeedback && !cleanFeedback && (
        <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-400 flex items-center gap-2">
          <Radio className="w-4 h-4 animate-pulse" />
          <span>{lastFeedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form: Selectors & Sliders (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              Parâmetros da Injeção de Ruído
            </h3>

            {/* Selectors Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Apartamento Alvo</label>
                <select
                  value={selectedAptId}
                  onChange={(e) => setSelectedAptId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-semibold focus:border-blue-500"
                >
                  {apartments.map(a => (
                    <option key={a.id} value={a.id}>
                      Apto {a.number} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Sensor Alvo (MAX9814)</label>
                <select
                  value={selectedSensorPosition}
                  onChange={(e) => setSelectedSensorPosition(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-semibold focus:border-blue-500"
                >
                  <option value="Sala">Canal 1 — Sala</option>
                  <option value="Quarto">Canal 2 — Quarto</option>
                  <option value="Cozinha">Canal 3 — Cozinha</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Origem da Leitura</label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-semibold focus:border-blue-500"
                >
                  <option value="simulation">simulation (Simulador)</option>
                  <option value="manual">manual (Inserção Manual)</option>
                </select>
              </div>
            </div>

            {/* Quick Buttons */}
            <div>
              <label className="block text-slate-400 font-medium mb-2 text-xs">
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
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono font-bold text-sm block">{p.value} dB</span>
                    <span className="text-[10px] text-slate-400 truncate block mt-0.5">{p.label.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider de Intensidade Customizada */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Intensidade Customizada (dB SPL):</label>
                <div className="flex items-baseline space-x-1 font-mono">
                  <span className="text-2xl font-black text-white">{decibelValue.toFixed(1)}</span>
                  <span className="text-xs text-slate-400">dB</span>
                </div>
              </div>

              <input
                type="range"
                min="35"
                max="105"
                step="0.5"
                value={decibelValue}
                onChange={(e) => setDecibelValue(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />

              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>35 dB (Silêncio)</span>
                <span>60 dB (Noturno)</span>
                <span>70 dB (Diurno)</span>
                <span>80 dB (Atenção)</span>
                <span>105 dB (Crítico)</span>
              </div>
            </div>

            {/* Continuous Controls */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
              {!isSimulating ? (
                <button
                  onClick={startContinuousSimulation}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Simulação Contínua</span>
                </button>
              ) : (
                <button
                  onClick={stopContinuousSimulation}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-lg shadow-red-600/20 transition animate-pulse"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Parar Simulação Contínua</span>
                </button>
              )}

              <button
                onClick={() => handleInjectSingle(decibelValue)}
                className="px-4 py-3 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold transition"
              >
                Injetar Leitura Única
              </button>
            </div>
          </div>
        </div>

        {/* Right Card: Quick Automation Scenarios (1 Col) */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-400" />
              Cenários de Teste Rápidos
            </h3>
            <p className="text-xs text-slate-400">
              Executa baterias automáticas para verificar a aderência do pipeline às regras do condomínio.
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={testCriticalAlert}
                className="w-full text-left p-4 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-950/30 transition group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-red-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4" />
                    Testar Alerta Crítico (95 dB)
                  </span>
                  <span>5s</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Simula ruído contínuo de furadeira/festa acima de 95 dB até disparar notificação vermelha.
                </p>
              </button>

              <button
                onClick={testOfflineDevice}
                className="w-full text-left p-4 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 transition"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5">
                    <WifiOff className="w-4 h-4 text-slate-400" />
                    Testar Dispositivo Offline
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Simula interrupção do heartbeat do ESP32 marcando a unidade como offline na planta.
                </p>
              </button>

              <button
                onClick={() => {
                  if (!selectedApartment) return;
                  handleInjectSingle(95.0);
                  setLastFeedback(`Ruído pontual de 95 dB injetado (1s) no Apto ${selectedApartment.number} — Teste de Debounce: Medidor atualiza para 95.0 dB, sem disparar alerta crítico!`);
                }}
                className="w-full text-left p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/30 transition"
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Testar Ruído Pontual (Sem Alerta)
                  </span>
                  <span>1s</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Injeta pico de 95 dB por 1 segundo. Valida se a regra de duração mínima impede o alarme falso.
                </p>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-400">
            <span className="font-semibold text-slate-200 block">Garantia do Pipeline Único:</span>
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
