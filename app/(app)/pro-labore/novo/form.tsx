'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, CurrencyField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cadastrarProLabore } from '@/actions/pro-labore';

interface Opt { id: string; nome: string }

export function NovoProLaboreForm({ socios, obras }: { socios: Opt[]; obras: Opt[] }) {
  const router = useRouter();
  const [socioId, setSocioId] = React.useState(socios[0]!.id);
  const [obraId, setObraId] = React.useState(obras[0]!.id);
  const [valor, setValor] = React.useState<number>(0);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('socio_id', socioId);
    fd.set('obra_id', obraId);
    startTransition(async () => {
      const res = await cadastrarProLabore(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Pró-labore cadastrado.');
        router.push('/pro-labore');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Sócio" name="socio_id" required>
          <Select value={socioId} onValueChange={setSocioId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {socios.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Obra" name="obra_id" required>
          <Select value={obraId} onValueChange={setObraId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Mês de referência" name="mes_referencia" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} />
        <CurrencyField label="Valor previsto" name="valor_definido" required value={valor} onChange={setValor} />
      </div>
      <TextareaField label="Observações" name="observacoes" rows={2} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>{pending ? 'Salvando…' : 'Cadastrar'}</Button>
      </div>
    </form>
  );
}
