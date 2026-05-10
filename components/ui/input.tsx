import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-11 w-full rounded-[10px] border border-brand-200 bg-white px-3 text-sm text-brand-900 outline-none transition-colors',
        'placeholder:text-brand-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-200',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full rounded-[10px] border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 outline-none transition-colors',
        'placeholder:text-brand-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-200',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
