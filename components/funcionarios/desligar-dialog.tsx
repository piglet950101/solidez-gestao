'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserMinus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/input';
import { desligarFuncionario } from '@/actions/funcionarios';

interface Props {
  funcionarioId: string;
  funcionarioNome: string;
  alreadyDesligado?: boolean;
}

export function DesligarFuncionarioDialog({ funcionarioId, funcionarioNome, alreadyDesligado }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState(new Date().toISOString().slice(0, 10));
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) {
      toast.error('Informe a data do desligamento.');
      return;
    }
    startTransition(async () => {
      const res = await desligarFuncionario(funcionarioId, data);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`${funcionarioNome} desligado em ${data.split('-').reverse().join('/')}`);
        setOpen(false);
        router.push('/funcionarios');
        router.refresh();
      }
    });
  }

  if (alreadyDesligado) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="danger">
          <UserMinus className="size-4" /> Desligar funcionário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desligar {funcionarioNome}</DialogTitle>
          <DialogDescription>
            Marca o funcionário como desligado a partir da data informada. Ele some das listas ativas, mas o
            histórico de folha, vales e empreitadas dele continua intacto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <TextField
            label="Data do desligamento"
            name="data_desligamento"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-brand-600">Motivo (opcional)</label>
            <Textarea name="motivo" rows={2} placeholder="Pediu a baixa · término de obra · etc." />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? 'Desligando…' : 'Confirmar desligamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
