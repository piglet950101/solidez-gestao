import * as React from 'react';
import { cn } from '@/lib/utils';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-[14px] border border-brand-100 bg-white scrollbar-thin">
      <table ref={ref} className={cn('w-full text-sm', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

export const THead = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('bg-brand-50 text-left text-xs font-semibold uppercase tracking-wide text-brand-600', className)} {...props} />
);

export const TBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('divide-y divide-brand-50 [&>tr:hover]:bg-cream', className)} {...props} />
);

export const TR = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('', className)} {...props} />
);

export const TH = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('px-4 py-3 font-semibold first:pl-5 last:pr-5', className)} {...props} />
);

export const TD = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-3 align-middle text-brand-800 first:pl-5 last:pr-5', className)} {...props} />
);

export const TableEmpty = ({ children }: { children: React.ReactNode }) => (
  <tr>
    <td colSpan={99} className="px-5 py-10 text-center text-sm text-brand-500">
      {children}
    </td>
  </tr>
);
