import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorVariant?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'gold';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorVariant = 'indigo',
  trend,
}) => {
  const colorStyles = {
    indigo: {
      bg: 'from-indigo-600/10 to-indigo-900/20 border-indigo-500/20 hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/20 text-indigo-400',
      glow: 'shadow-indigo-glow',
    },
    emerald: {
      bg: 'from-emerald-600/10 to-emerald-900/20 border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]',
    },
    amber: {
      bg: 'from-amber-600/10 to-amber-900/20 border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/20 text-amber-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',
    },
    rose: {
      bg: 'from-rose-600/10 to-rose-900/20 border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/20 text-rose-400',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]',
    },
    gold: {
      bg: 'from-amber-500/10 to-gold-600/20 border-gold-500/20 hover:border-gold-500/40',
      iconBg: 'bg-gold-500/20 text-gold-400',
      glow: 'shadow-gold-glow',
    },
  };

  const currentStyle = colorStyles[colorVariant];

  return (
    <div className={`p-5 rounded-3xl bg-gradient-to-br ${currentStyle.bg} border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${currentStyle.glow}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <h3 className="text-2xl lg:text-3xl font-extrabold text-white mt-1 tracking-tight">{value}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-1 font-medium">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend.isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {trend.value}
              </span>
              <span className="text-[10px] text-slate-400">vs last week</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl ${currentStyle.iconBg} flex items-center justify-center border border-white/10 shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
