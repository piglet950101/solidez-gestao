'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextField, TextareaField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { criarCustoFixo } from '@/actions/custos-fixos';

interface Empresa { id: string; nome: string }
interface Obra { id: string; nome: string; empresa_id: string }
interface Categoria { id: string; nome: string }

export function NovoCustoFixoForm({ empresas, obras, categorias }: { empresas: Empresa[]; obras: Obra[]; categorias: Categoria[] }) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = React.useState(empresas[0]!.id);
  const [categoriaId, setCategoriaId] = React.useState<string>('__none__');
  const [alocacoes, setAlocacoes] = React.useState<{ obra_id: string; percentual: number }[]>([]);
  const [pending, startTransition] = React.useTransition();

  const obrasEmpresa = obras.filter((o) => o.empresa_id === empresaId);
  const totalPct = alocacoes.reduce((s, a) => s + (a.percentual || 0), 0);
  const ok = Math.abs(totalPct - 100) < 0.01;

  React.useEffect(() => {
    setAlocacoes([]);
  }, [empresaId]);

  function addObra() {
    const usadas = new Set(alocacoes.map((a) => a.obra_id));
    const livre = obrasEmpresa.find((o) => !usadas.has(o.id));
    if (!livre) return;
    setAlocacoes([...alocacoes, { obra_id: livre.id, percentual: 0 }]);
  }
  function upd(i: number, patch: Partial<{ obra_id: string; percentual: number }>) {
    setAlocacoes(alocacoes.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function del(i: number) {
    setAlocacoes(alocacoes.filter((_, idx) => idx !== i));
  }
  function dividirIgual() {
    if (obrasEmpresa.length === 0) return;
    const por = Number((100 / obrasEmpresa.length).toFixed(2));
    const sobra = Number((100 - por * obrasEmpresa.length).toFixed(2));
    setAlocacoes(obrasEmpresa.map((o, i) => ({ obra_id: o.id, percentual: i === 0 ? por + sobra : por })));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ok) {
      toast.error(`Soma dos percentuais (${totalPct.toFixed(2)}%) deve ser exatamente 100%.`);
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set('empresa_id', empresaId);
    if (categoriaId !== '__none__') fd.set('categoria_id', categoriaId);
    fd.set('alocacoes_json', JSON.stringify(alocacoes));
    startTransition(async () => {
      const res = await criarCustoFixo(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Custo fixo cadastrado.');
        router.push('/custos-fixos');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <TextField label="Descrição" name="descricao" required placeholder="Contabilidade, Seguro do trabalho, etc." />
        <TextField label="Valor mensal" name="valor_mensal" type="number" step="0.01" required />
        <TextField label="Dia de vencimento" name="dia_vencimento" type="number" min={1} max={31} placeholder="Ex: 5" />
        <Field label="Categoria" name="categoria_id">
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— sem categoria —</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Início da vigência" name="vigencia_inicio" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Endereçamento por obra</h3>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={dividirIgual}>Dividir igual</Button>
            <span className={ok ? 'text-emerald-700 font-mono text-sm' : 'text-red-700 font-mono text-sm'}>
              Soma: {totalPct.toFixed(2)}%
            </span>
          </div>
        </div>
        <p className="text-xs text-brand-500">
          Endereçe explicitamente — sem rateio uniforme automático. Ex: contabilidade que só cai na obra em parceria.
        </p>
        {alocacoes.map((a, i) => (
          <div key={i} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-8">
              <Field label={i === 0 ? 'Obra' : ''} name={`obra_${i}`}>
                <Select value={a.obra_id} onValueChange={(v) => upd(i, { obra_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {obrasEmpresa.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="col-span-3">
              <Field label={i === 0 ? '%' : ''} name={`pct_${i}`}>
                <Input
                  type="number"
                  step="0.01"
                  value={a.percentual || ''}
                  onChange={(e) => upd(i, { percentual: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => del(i)}>
              <Trash2 className="size-4 text-red-500" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addObra}>
          <Plus className="size-4" /> Adicionar obra
        </Button>
      </section>

      <TextareaField label="Observações" name="observacoes" rows={2} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : 'Cadastrar custo fixo'}
        </Button>
      </div>
    </form>
  );
}
