'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';
import { registrarPagamento } from '@/actions/empreitadas';

export function PagamentoForm({ empreitadaId, sugerido }: { empreitadaId: string; sugerido: number }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('empreitada_id', empreitadaId);
    startTransition(async () => {
      const res = await registrarPagamento(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Pagamento registrado.');
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <TextField label="Data" name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      <TextField label="Valor" name="valor" type="number" step="0.01" inputMode="decimal" required defaultValue={sugerido > 0 ? sugerido.toFixed(2) : ''} />
      <Button type="submit" variant="accent" disabled={pending} block>
        {pending ? 'Salvando…' : 'Registrar pagamento'}
      </Button>
    </form>
  );
}
