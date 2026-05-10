'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md space-y-3 text-center">
        <p className="text-5xl font-bold gradient-brand-text">erro</p>
        <h1 className="text-xl font-bold text-brand-900">Algo quebrou no caminho</h1>
        <p className="text-sm text-brand-600">{error.message}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={reset}>
            Tentar novamente
          </Button>
          <Button variant="accent" asChild>
            <Link href="/">Início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
