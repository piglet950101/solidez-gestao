'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';
import { pagarProLabore } from '@/actions/pro-labore';
import { formatBRL } from '@/lib/format';

export function ProLaborePagarDialog({ id, valorPrevisto }: { id: string; valorPrevisto: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [valor, setValor] = React.useState(valorPrevisto);
  const [pending, startTransition] = React.useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await pagarProLabore(id, valor);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Pró-labore marcado como pago.');
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Marcar pago</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar pró-labore como pago</DialogTitle>
          <DialogDescription>
            Valor previsto: <strong className="font-mono">{formatBRL(valorPrevisto)}</strong>. Ajuste se foi pago um valor diferente
            (ex: obra estava no vermelho e sócio reduziu).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField label="Valor efetivamente pago" name="valor_pago" type="number" step="0.01" inputMode="decimal" required value={valor || ''} onChange={(e) => setValor(Number(e.target.value))} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" variant="accent" disabled={pending || valor <= 0}>
              {pending ? 'Salvando…' : 'Confirmar pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
