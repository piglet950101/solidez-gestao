'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TextField, CurrencyField, Field } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { registrarRecebimento } from '@/actions/medicoes';
import { formatBRL } from '@/lib/format';

interface Props {
  medicaoId: string;
  medicaoLabel: string;
  valorLiquido: number;
  jaRecebido: number;
}

export function RecebimentoDialog({ medicaoId, medicaoLabel, valorLiquido, jaRecebido }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [tipo, setTipo] = React.useState<'dinheiro' | 'permuta'>('dinheiro');
  const saldo = valorLiquido - jaRecebido;
  const [valor, setValor] = React.useState<number>(saldo > 0 ? saldo : 0);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) setValor(saldo > 0 ? saldo : 0);
  }, [open, saldo]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('medicao_id', medicaoId);
    fd.set('tipo', tipo);
    startTransition(async () => {
      const res = await registrarRecebimento(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Recebimento registrado.');
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-3.5" /> Recebimento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar recebimento</DialogTitle>
          <DialogDescription>
            {medicaoLabel} · saldo a receber: <strong className="font-mono">{formatBRL(saldo)}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <CurrencyField label="Valor" name="valor" required value={valor} onChange={setValor} />
            <TextField label="Data" name="data_recebimento" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>

          <Field label="Tipo" name="tipo" required>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro (entra no caixa)</SelectItem>
                <SelectItem value="permuta">Permuta (★ não entra no caixa)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {tipo === 'permuta' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-600">Descrição da permuta</label>
              <Textarea name="descricao_permuta" rows={2} placeholder="Ex: 1 sala 802 · Edifício The One · valor R$ ..." required />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? 'Salvando…' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
