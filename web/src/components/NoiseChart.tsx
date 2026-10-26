import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

interface ChartPoint {
  time: string;
  decibel: number | null;
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const chartData = data;

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Curva de Intensidade Sonora</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-medium">
              dB SPL
            </span>
          </h3>
          <p className="text-xs text-slate-500">Leituras registradas • lacunas indicam ausência de dados</p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-amber-500 rounded"></span>
            <span className="text-slate-600 text-[11px] font-medium">Atenção ({warningThreshold} dB)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-0.5 bg-rose-500 rounded"></span>
            <span className="text-slate-600 text-[11px] font-medium">Crítico ({criticalThreshold} dB)</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="saasNoiseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={isDark ? 0.4 : 0.25} />
                <stop offset="70%" stopColor="#3b82f6" stopOpacity={isDark ? 0.1 : 0.05} />
                <stop offset="100%" stopColor={isDark ? "#0f172a" : "#ffffff"} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
            <XAxis 
              dataKey="time" 
              stroke={isDark ? "#64748b" : "#94a3b8"} 
              fontSize={11} 
              tickLine={false} 
              axisLine={{ stroke: isDark ? "#1e293b" : "#e2e8f0" }} 
            />
            <YAxis 
              domain={[(min: number) => Math.min(30, min), (max: number) => Math.max(100, max, criticalThreshold)]} 
              stroke={isDark ? "#64748b" : "#94a3b8"} 
              fontSize={11} 
              tickLine={false} 
              axisLine={{ stroke: isDark ? "#1e293b" : "#e2e8f0" }}
              tickFormatter={(v) => `${v}dB`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                color: isDark ? '#f8fafc' : '#0f172a',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
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
              type="linear" connectNulls={false} isAnimationActive={false}
              dataKey="decibel"
              stroke="#2563eb"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#saasNoiseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
