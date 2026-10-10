import React from 'react';

interface NoiseLevelBadgeProps {
  status?: 'normal' | 'warning' | 'critical' | 'offline';
  decibel?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const NoiseLevelBadge: React.FC<NoiseLevelBadgeProps> = ({
  status = 'normal',
  decibel,
  size = 'md',
}) => {
  const config = {
    normal: {
      label: 'Normal',
      dotColor: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    warning: {
      label: 'Atenção',
      dotColor: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    critical: {
      label: 'Ruído Elevado',
      dotColor: 'bg-rose-500',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    offline: {
      label: 'Offline',
      dotColor: 'bg-slate-400',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    },
  };

  const current = config[status];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${current.badgeClass} ${sizeClasses[size]}`}>
      <span className={`w-2 h-2 rounded-full ${current.dotColor}`}></span>
      <span>{current.label}</span>
      {decibel !== undefined && status !== 'offline' && (
        <span className="font-mono font-bold ml-1 opacity-90">{decibel.toFixed(0)} dB</span>
      )}
    </span>
  );
};
