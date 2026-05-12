'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { criarObra } from '@/actions/obras';

interface Option { id: string; nome: string }

export function NovaObraForm({ empresas, socios }: { empresas: Option[]; socios: Option[] }) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = React.useState(empresas[0]!.id);
  const [tipo, setTipo] = React.useState<'regular' | 'curto_prazo'>('regular');
  const [comPermuta, setComPermuta] = React.useState(false);
  const [sociosLinhas, setSociosLinhas] = React.useState<{ socio_id: string; percentual: number }[]>([
    { socio_id: socios[0]?.id ?? '', percentual: 100 },
  ]);
  const [pending, startTransition] = React.useTransition();

  const totalPct = sociosLinhas.reduce((s, r) => s + (r.percentual || 0), 0);

  function addSocio() {
    const usados = new Set(sociosLinhas.map((s) => s.socio_id));
    const livre = socios.find((s) => !usados.has(s.id));
    setSociosLinhas([...sociosLinhas, { socio_id: livre?.id ?? '', percentual: 0 }]);
  }
  function updSocio(i: number, patch: Partial<{ socio_id: string; percentual: number }>) {
    setSociosLinhas(sociosLinhas.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function delSocio(i: number) {
    setSociosLinhas(sociosLinhas.filter((_, idx) => idx !== i));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (Math.abs(totalPct - 100) > 0.01) {
      toast.error(`Sócios devem somar 100% (atual: ${totalPct.toFixed(2)}%)`);
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set('empresa_id', empresaId);
    fd.set('tipo', tipo);
    fd.set('com_permuta', String(comPermuta));
    fd.set('socios_json', JSON.stringify(sociosLinhas));
    startTransition(async () => {
      const res = await criarObra(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Obra cadastrada.');
        router.push('/obras');
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
        <TextField label="Nome da obra" name="nome" required />
        <TextField label="Código interno (opcional)" name="codigo" />
        <Field label="Tipo" name="tipo">
          <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="curto_prazo">Curto prazo</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Data de início" name="data_inicio" type="date" />
        <TextField label="Data de fim prevista" name="data_fim_prevista" type="date" />
        <TextField label="Endereço" name="endereco" className="md:col-span-2" />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={comPermuta} onChange={(e) => setComPermuta(e.target.checked)} className="size-4 accent-brand-700" />
          <span>Obra com permuta (ex: The One, Enseada)</span>
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Sócios e percentuais</h3>
          <div className={Math.abs(totalPct - 100) < 0.01 ? 'text-emerald-700 font-mono text-sm' : 'text-red-700 font-mono text-sm'}>
            Soma: {totalPct.toFixed(2)}%
          </div>
        </div>
        {sociosLinhas.map((row, i) => (
          <div key={i} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-8">
              <Field label={i === 0 ? 'Sócio' : ''} name={`socio_${i}`}>
                <Select value={row.socio_id} onValueChange={(v) => updSocio(i, { socio_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {socios.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="col-span-3">
              <Field label={i === 0 ? '%' : ''} name={`pct_${i}`}>
                <Input type="number" step="0.01" value={row.percentual} onChange={(e) => updSocio(i, { percentual: Number(e.target.value) })} />
              </Field>
            </div>
            <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => delSocio(i)}>
              <Trash2 className="size-4 text-red-500" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addSocio}>
          <Plus className="size-4" /> Adicionar sócio
        </Button>
      </section>

      <TextareaField label="Observações" name="observacoes" rows={3} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : 'Cadastrar obra'}
        </Button>
      </div>
    </form>
  );
}
