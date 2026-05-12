'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { criarEmpreitada } from '@/actions/empreitadas';

interface Opt { id: string; nome: string }

export function NovaEmpreitadaForm({ obras, cabecas }: { obras: Opt[]; cabecas: Opt[] }) {
  const router = useRouter();
  const [obraId, setObraId] = React.useState(obras[0]!.id);
  const [cabecaId, setCabecaId] = React.useState(cabecas[0]?.id ?? '');
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cabecaId) {
      toast.error('Selecione um cabeça responsável.');
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set('obra_id', obraId);
    fd.set('cabeca_funcionario_id', cabecaId);
    startTransition(async () => {
      const res = await criarEmpreitada(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Empreitada cadastrada.');
        router.push('/empreitadas');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Obra" name="obra_id" required>
          <Select value={obraId} onValueChange={setObraId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Cabeça responsável" name="cabeca_funcionario_id" required>
          {cabecas.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-amber-700">Nenhum funcionário marcado como cabeça de empreitada ainda.</p>
              <Link
                href="/funcionarios"
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Marca um funcionário como "Cabeça de empreitada" em /funcionarios →
              </Link>
            </div>
          ) : (
            <Select value={cabecaId} onValueChange={setCabecaId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {cabecas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </Field>
        <TextField label="Descrição do serviço" name="descricao" required placeholder="Ex: Laje 3 do Select, ferragens 2º pavimento" className="md:col-span-2" />
        <TextField label="Valor total fechado" name="valor_total" type="number" step="0.01" inputMode="decimal" required />
        <TextField label="Data de início" name="data_inicio" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>

      <TextareaField label="Observações" name="observacoes" rows={2} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending || cabecas.length === 0}>
          {pending ? 'Salvando…' : 'Cadastrar empreitada'}
        </Button>
      </div>
    </form>
  );
}
