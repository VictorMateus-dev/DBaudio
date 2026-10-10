import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'slate';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  trend,
}) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200/60',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200/60',
    amber: 'text-amber-600 bg-amber-50 border-amber-200/60',
    red: 'text-rose-600 bg-rose-50 border-rose-200/60',
    purple: 'text-indigo-600 bg-indigo-50 border-indigo-200/60',
    slate: 'text-slate-500 bg-slate-50 border-slate-200/80',
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle hover:border-slate-300 hover:shadow-card transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`p-2 rounded-lg border ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{value}</span>
        {trend && <span className="text-[11px] font-semibold text-emerald-600">{trend}</span>}
      </div>
      {subtitle && <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
};
