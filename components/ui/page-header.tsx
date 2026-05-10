import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1 border-b border-brand-100 pb-5 md:flex-row md:items-center md:justify-between', className)}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">{title}</h1>
        {description ? <p className="text-sm text-brand-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
