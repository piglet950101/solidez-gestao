'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, CurrencyField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { lancarImposto } from '@/actions/imposto';

interface Opt { id: string; nome: string }

export function NovoImpostoForm({ empresas }: { empresas: Opt[] }) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = React.useState(empresas[0]!.id);
  const [valorTotal, setValorTotal] = React.useState<number>(0);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('empresa_id', empresaId);
    startTransition(async () => {
      const res = await lancarImposto(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Imposto registrado · aguardando rateio do contador.');
        router.push('/impostos');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Empresa" name="empresa_id" required>
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Mês de referência" name="mes_referencia" type="month" required
          defaultValue={new Date().toISOString().slice(0, 7)} />
        <CurrencyField label="Valor total do boleto" name="valor_total" required value={valorTotal} onChange={setValorTotal} />
        <TextField label="Data de vencimento" name="data_vencimento" type="date" />
        <TextField label="Número do boleto" name="num_boleto" className="md:col-span-2" />
      </div>

      <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold">Etapa 1 de 2</p>
        <p className="mt-1 text-xs">Esse imposto fica como <strong>pendente de rateio</strong> até o contador detalhar quanto cai em cada obra. Quando ele mandar o detalhe, você abre o registro e distribui os valores.</p>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : 'Registrar imposto'}
        </Button>
      </div>
    </form>
  );
}
