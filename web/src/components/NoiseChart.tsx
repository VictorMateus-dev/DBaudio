import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';

interface ChartPoint {
  time: string;
  decibel: number;
}

interface NoiseChartProps {
  data: ChartPoint[];
  warningThreshold?: number;
  criticalThreshold?: number;
  height?: number;
}

export const NoiseChart: React.FC<NoiseChartProps> = ({
  data,
  warningThreshold = 70,
  criticalThreshold = 80,
  height = 240,
}) => {
  // Caso de dados vazios, gerar histórico demonstrativo suave
  const chartData = data.length > 0 ? data : [
    { time: '14:00', decibel: 44 },
    { time: '15:00', decibel: 48 },
    { time: '16:00', decibel: 52 },
    { time: '17:00', decibel: 49 },
    { time: '18:00', decibel: 63 },
    { time: '19:00', decibel: 58 },
    { time: '20:00', decibel: 72 },
    { time: '21:00', decibel: 55 },
    { time: '22:00', decibel: 45 },
    { time: '23:00', decibel: 42 },
  ];

  return (
    <div className="vault-card rounded-3xl p-6 shadow-glass-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span>Curva de Intensidade Sonora</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono">
              dB SPL Ponderado A
            </span>
          </h3>
          <p className="text-xs text-slate-400">Telemetria em tempo real com jitter acústico natural</p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-amber-400"></span>
            <span className="text-slate-400 text-[11px]">Aviso ({warningThreshold} dB)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-red-500"></span>
            <span className="text-slate-400 text-[11px]">Crítico ({criticalThreshold} dB)</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="vaultNoiseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#06060c" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }} 
            />
            <YAxis 
              domain={[30, 100]} 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
              tickFormatter={(v) => `${v}dB`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0a0b16',
                borderColor: 'rgba(139, 92, 246, 0.4)',
                borderRadius: '16px',
                fontSize: '12px',
                color: '#f8fafc',
                boxShadow: '0 0 25px rgba(139, 92, 246, 0.25)',
              }}
              formatter={(value: any) => [`${value} dB`, 'Nível Acústico']}
              labelFormatter={(label) => `Horário: ${label}`}
            />
            <ReferenceLine 
              y={warningThreshold} 
              stroke="#f59e0b" 
              strokeDasharray="4 4" 
              strokeWidth={1.5}
            />
            <ReferenceLine 
              y={criticalThreshold} 
              stroke="#ef4444" 
              strokeDasharray="4 4" 
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="decibel"
              stroke="#a855f7"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#vaultNoiseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
