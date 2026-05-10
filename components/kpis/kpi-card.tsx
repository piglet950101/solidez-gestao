import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/format';

interface KPICardProps {
  label: string;
  value: number;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warn';
  icon?: React.ReactNode;
  format?: (n: number) => string;
}

export function KPICard({ label, value, hint, tone = 'neutral', icon, format = formatBRL }: KPICardProps) {
  const toneClass = {
    neutral: 'text-brand-900',
    positive: 'text-emerald-700',
    negative: 'text-red-700',
    warn: 'text-amber-700',
  }[tone];

  return (
    <div className="rounded-[14px] border border-brand-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-500">{label}</div>
        {icon ? <div className="text-brand-400">{icon}</div> : null}
      </div>
      <div className={cn('mt-3 font-bold leading-none', 'text-3xl', toneClass)}>{format(value)}</div>
      {hint ? <div className="mt-2 text-xs text-brand-500">{hint}</div> : null}
    </div>
  );
}
