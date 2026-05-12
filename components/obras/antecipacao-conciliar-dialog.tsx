'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/ui/form-field';
import { conciliarAntecipacao } from '@/actions/medicoes';
import { formatBRL, formatDate } from '@/lib/format';

interface MedicaoOpt { id: string; num_medicao: number; valor_liquido: number; data_emissao: string; num_nota_fiscal: string | null }
interface Props {
  antecipacaoId: string;
  valor: number;
  data: string;
  medicoes: MedicaoOpt[];
}

export function AntecipacaoConciliarDialog({ antecipacaoId, valor, data, medicoes }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [medicaoId, setMedicaoId] = React.useState<string>('');
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!medicaoId) {
      toast.error('Selecione a medição.');
      return;
    }
    startTransition(async () => {
      const res = await conciliarAntecipacao(antecipacaoId, medicaoId);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Antecipação conciliada.');
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Conciliar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conciliar antecipação com medição</DialogTitle>
          <DialogDescription>
            {formatBRL(valor)} recebido em {formatDate(data)} · escolha a medição em que esse adiantamento deve ser abatido.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Medição" name="medicao_id" required>
            <Select value={medicaoId} onValueChange={setMedicaoId}>
              <SelectTrigger><SelectValue placeholder="Escolha a medição…" /></SelectTrigger>
              <SelectContent>
                {medicoes.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-brand-500">Sem medições nessa obra ainda.</div>
                ) : (
                  medicoes.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      #{m.num_medicao} · {formatDate(m.data_emissao)} · {formatBRL(m.valor_liquido)}
                      {m.num_nota_fiscal ? ` · NF ${m.num_nota_fiscal}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" variant="accent" disabled={pending || !medicaoId}>
              {pending ? 'Salvando…' : 'Conciliar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
