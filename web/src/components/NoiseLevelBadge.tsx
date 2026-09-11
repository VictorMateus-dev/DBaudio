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
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    warning: {
      label: 'Atenção',
      dotColor: 'bg-amber-400',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    critical: {
      label: 'Ruído Elevado',
      dotColor: 'bg-red-500',
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse',
    },
    offline: {
      label: 'Offline',
      dotColor: 'bg-slate-500',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
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
