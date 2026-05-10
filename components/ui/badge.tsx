import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-brand-100 text-brand-700',
        green: 'bg-emerald-100 text-emerald-800',
        amber: 'bg-amber-100 text-amber-800',
        red: 'bg-red-100 text-red-700',
        accent: 'bg-accent-100 text-accent-800',
        brand: 'bg-brand-700 text-white',
        outline: 'border border-brand-200 bg-white text-brand-700',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function StatusDot({ severidade }: { severidade: 'verde' | 'amarelo' | 'vermelho' }) {
  const color = severidade === 'verde' ? 'bg-emerald-500' : severidade === 'amarelo' ? 'bg-amber-500' : 'bg-red-500';
  return <span className={cn('inline-block size-2.5 rounded-full', color)} aria-hidden />;
}
