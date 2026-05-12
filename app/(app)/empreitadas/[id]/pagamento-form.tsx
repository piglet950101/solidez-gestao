'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, CurrencyField } from '@/components/ui/form-field';
import { registrarPagamento } from '@/actions/empreitadas';

export function PagamentoForm({ empreitadaId, sugerido }: { empreitadaId: string; sugerido: number }) {
  const router = useRouter();
  const [valor, setValor] = React.useState<number>(sugerido > 0 ? sugerido : 0);
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
        setValor(0);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <TextField label="Data" name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      <CurrencyField label="Valor" name="valor" required value={valor} onChange={setValor} />
      <Button type="submit" variant="accent" disabled={pending} block>
        {pending ? 'Salvando…' : 'Registrar pagamento'}
      </Button>
    </form>
  );
}
