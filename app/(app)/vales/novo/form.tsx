'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { lancarVale } from '@/actions/folha';

interface Opt { id: string; nome: string }

export function NovoValeForm({ funcionarios, obras }: { funcionarios: Opt[]; obras: Opt[] }) {
  const router = useRouter();
  const [funcId, setFuncId] = React.useState(funcionarios[0]!.id);
  const [obraId, setObraId] = React.useState<string | ''>('');
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('funcionario_id', funcId);
    if (obraId) fd.set('obra_id', obraId);
    startTransition(async () => {
      const res = await lancarVale(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Vale lançado.');
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
              {funcionarios.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Obra (opcional)" name="obra_id">
          <Select value={obraId} onValueChange={(v) => setObraId(v === '__none__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Sem obra atribuída" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— sem obra —</SelectItem>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Data" name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        <TextField label="Valor" name="valor" type="number" step="0.01" inputMode="decimal" required />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : 'Lançar vale'}
        </Button>
      </div>
    </form>
  );
}
