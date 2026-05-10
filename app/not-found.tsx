import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="space-y-3 text-center">
        <p className="text-6xl font-bold gradient-brand-text">404</p>
        <h1 className="text-2xl font-bold text-brand-900">Página não encontrada</h1>
        <p className="text-sm text-brand-600">O link que você seguiu não existe ou foi movido.</p>
        <Button asChild variant="accent">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
