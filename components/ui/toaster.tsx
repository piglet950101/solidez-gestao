'use client';
import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'group rounded-[12px] border border-brand-100 bg-white text-brand-900 shadow-pop',
          title: 'font-semibold',
          description: 'text-brand-600 text-xs',
          success: '!border-emerald-200',
          error: '!border-red-200',
        },
      }}
    />
  );
}
