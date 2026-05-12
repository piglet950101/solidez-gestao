'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { criarMedicao } from '@/actions/medicoes';

interface ObraOpt { id: string; nome: string; empresa_id: string; com_permuta: boolean; empresa_nome: string }
interface EtapaOpt { id: string; obra_id: string; nome: string }

export function NovaMedicaoForm({
  obras,
  etapas,
  obraInicial,
}: { obras: ObraOpt[]; etapas: EtapaOpt[]; obraInicial: string | null }) {
  const router = useRouter();
  const [obraId, setObraId] = React.useState(obraInicial ?? obras[0]!.id);
  const [valorBruto, setValorBruto] = React.useState(0);
  const [aliquota, setAliquota] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  const valorLiquido = Math.max(0, valorBruto - (valorBruto * aliquota) / 100);
  const etapasDaObra = etapas.filter((e) => e.obra_id === obraId);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('obra_id', obraId);
    fd.set('valor_bruto', String(valorBruto));
    fd.set('valor_liquido', String(valorLiquido));
    fd.set('percentual_imposto_estimado', String(aliquota));
    startTransition(async () => {
      const res = await criarMedicao(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Medição lançada.');
        router.push(`/obras/${obraId}`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Obra" name="obra_id" required>
          <Select value={obraId} onValueChange={setObraId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.empresa_nome} · {o.nome}{o.com_permuta ? ' ★' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {etapasDaObra.length > 0 && (
          <Field label="Etapa" name="etapa_id">
            <Select name="etapa_id">
              <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
              <SelectContent>
                {etapasDaObra.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <TextField label="Número da medição" name="num_medicao" type="number" min={1} required defaultValue={1} />
        <TextField label="Data de emissão" name="data_emissao" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        <TextField label="Número da nota fiscal" name="num_nota_fiscal" />
        <TextField label="Descrição" name="descricao" />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Valores</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TextField
            label="Valor bruto"
            name="valor_bruto"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={valorBruto || ''}
            onChange={(e) => setValorBruto(Number(e.target.value))}
            required
          />
          <TextField
            label="Alíquota estimada (%)"
            name="percentual_imposto_estimado"
            type="number"
            step="0.01"
            value={aliquota || ''}
            onChange={(e) => setAliquota(Number(e.target.value))}
            hint="Para provisão de imposto na obra"
          />
          <Field label="Valor líquido (calculado)" name="valor_liquido">
            <div className="flex h-11 items-center rounded-[10px] border border-brand-200 bg-brand-50 px-3 font-mono font-bold text-brand-900">
              {valorLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </Field>
        </div>
      </section>

      <TextareaField label="Observações" name="observacoes" rows={3} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : 'Registrar medição'}
        </Button>
      </div>
    </form>
  );
}
