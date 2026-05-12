'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, CurrencyField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { atualizarVale } from '@/actions/folha';
import type { Vale } from '@/types/database';

interface Opt { id: string; nome: string }

export function EditarValeForm({ vale, funcionarios, obras }: { vale: Vale; funcionarios: Opt[]; obras: Opt[] }) {
  const router = useRouter();
  const [funcId, setFuncId] = React.useState(vale.funcionario_id);
  const [obraId, setObraId] = React.useState<string>(vale.obra_id ?? '__none__');
  const [valor, setValor] = React.useState<number>(Number(vale.valor));
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('funcionario_id', funcId);
    if (obraId !== '__none__') fd.set('obra_id', obraId);
    else fd.delete('obra_id');
    startTransition(async () => {
      const res = await atualizarVale(vale.id, fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Vale atualizado.');
        router.push('/vales');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Funcionário" name="funcionario_id" required>
          <Select value={funcId} onValueChange={setFuncId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {funcionarios.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Obra (opcional)" name="obra_id">
          <Select value={obraId} onValueChange={(v) => setObraId(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— sem obra —</SelectItem>
              {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Data" name="data" type="date" required defaultValue={vale.data} />
        <CurrencyField label="Valor" name="valor" required value={valor} onChange={setValor} />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>{pending ? 'Salvando…' : 'Salvar alterações'}</Button>
      </div>
    </form>
  );
}
