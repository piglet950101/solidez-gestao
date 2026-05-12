'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, CurrencyField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { registrarVeiculoCusto } from '@/actions/veiculos';

export function VeiculoCustoForm({ veiculoId }: { veiculoId: string }) {
  const router = useRouter();
  const [tipo, setTipo] = React.useState<'combustivel' | 'manutencao' | 'documentacao' | 'financiamento' | 'seguro' | 'outros'>('combustivel');
  const [valor, setValor] = React.useState<number>(0);
  const [pending, startTransition] = React.useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('veiculo_id', veiculoId);
    fd.set('tipo', tipo);
    startTransition(async () => {
      const res = await registrarVeiculoCusto(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Custo registrado.');
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Tipo" name="tipo" required>
        <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="combustivel">Combustível</SelectItem>
            <SelectItem value="manutencao">Manutenção</SelectItem>
            <SelectItem value="documentacao">Documentação</SelectItem>
            <SelectItem value="financiamento">Financiamento</SelectItem>
            <SelectItem value="seguro">Seguro</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <TextField label="Data" name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      <CurrencyField label="Valor" name="valor" required value={valor} onChange={setValor} />
      <TextField label="KM" name="km" type="number" />
      <TextField label="Descrição" name="descricao" />
      <Button type="submit" variant="accent" disabled={pending} block>
        {pending ? 'Salvando…' : 'Registrar custo'}
      </Button>
    </form>
  );
}
