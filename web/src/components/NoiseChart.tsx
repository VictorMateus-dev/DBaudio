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
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Curva de Intensidade Sonora</h3>
          <p className="text-xs text-slate-400">Telemetria contínua em dB SPL ponderado A</p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-amber-500"></span>
            <span className="text-slate-400">Limite Diurno ({warningThreshold} dB)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-red-500"></span>
            <span className="text-slate-400">Crítico ({criticalThreshold} dB)</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="noiseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              axisLine={{ stroke: '#334155' }} 
            />
            <YAxis 
              domain={[30, 100]} 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}dB`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#f8fafc',
              }}
              formatter={(value: any) => [`${value} dB`, 'Nível de Ruído']}
              labelFormatter={(label) => `Horário: ${label}`}
            />
            <ReferenceLine 
              y={warningThreshold} 
              stroke="#f59e0b" 
              strokeDasharray="3 3" 
              strokeWidth={1.5}
            />
            <ReferenceLine 
              y={criticalThreshold} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="decibel"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#noiseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
