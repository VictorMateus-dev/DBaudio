import React, { useState } from 'react';
import { NoisePolicy } from '../types/database.types';
import { DataService } from '../lib/dataService';
import { Sliders, Sun, Moon, Clock, Save, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface PoliciesPageProps {
  policies: NoisePolicy[];
  onRefresh: () => void;
}

export const PoliciesPage: React.FC<PoliciesPageProps> = ({ policies, onRefresh }) => {
  const [editablePolicies, setEditablePolicies] = useState<NoisePolicy[]>(policies);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleValueChange = (id: string, field: keyof NoisePolicy, value: any) => {
    setEditablePolicies(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = async () => {
    for (const p of editablePolicies) {
      await DataService.updatePolicy(p);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    onRefresh();
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Políticas de Ruído e Limiares Acústicos</h1>
          <p className="text-sm text-slate-400">
            Configuração dos limites decibélicos (dB SPL) por período, duração mínima e tempo de cooldown.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg text-xs shadow-md transition"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Alterações</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>Políticas atualizadas com sucesso! Os novos limiares já estão em vigor no pipeline.</span>
        </div>
      )}

      {/* Policies Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {editablePolicies.map((pol) => {
          const isNight = pol.name.toLowerCase().includes('noturna');
          return (
            <div key={pol.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${
                    isNight ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {isNight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{pol.name}</h3>
                    <p className="text-xs text-slate-400">
                      Horário: <strong className="text-slate-200">{pol.start_time} às {pol.end_time}</strong>
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  Ativa
                </span>
              </div>

              {/* Threshold inputs */}
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between mb-1.5 font-medium">
                    <span className="text-slate-300">Limiar de Atenção (Warning)</span>
                    <span className="font-mono text-amber-400 font-bold">{pol.warning_threshold_db} dB</span>
                  </div>
                  <input
                    type="range"
                    min="45"
                    max="85"
                    value={pol.warning_threshold_db}
                    onChange={(e) => handleValueChange(pol.id, 'warning_threshold_db', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Leituras acima deste valor disparam advertência informativa.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5 font-medium">
                    <span className="text-slate-300">Limiar Crítico (Critical Alert)</span>
                    <span className="font-mono text-red-400 font-bold">{pol.critical_threshold_db} dB</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="105"
                    value={pol.critical_threshold_db}
                    onChange={(e) => handleValueChange(pol.id, 'critical_threshold_db', Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Aciona alerta vermelho de alta severidade no condomínio.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Duração Mínima (s)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={pol.min_duration_seconds}
                      onChange={(e) => handleValueChange(pol.id, 'min_duration_seconds', Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Evita falsos alarmes de ruídos pontuais (palmas, queda de objetos).</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Cooldown de Alerta (s)</label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={pol.cooldown_seconds}
                      onChange={(e) => handleValueChange(pol.id, 'cooldown_seconds', Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">Tempo de espera antes de reenviar alerta para o mesmo episódio.</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
