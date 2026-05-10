import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-brand-200 bg-white px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? <div className="text-brand-400">{icon}</div> : null}
      <h3 className="text-base font-semibold text-brand-800">{title}</h3>
      {description ? <p className="max-w-md text-sm text-brand-500">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
