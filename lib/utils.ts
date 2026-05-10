import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function assertDefined<T>(value: T | undefined | null, msg = 'Valor obrigatório'): T {
  if (value === undefined || value === null) throw new Error(msg);
  return value;
}

export function uniqueBy<T, K>(items: T[], key: (i: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}
