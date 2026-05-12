'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, CurrencyField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { lancarFolha } from '@/actions/folha';
import { formatBRL } from '@/lib/format';

interface FuncOpt { id: string; nome: string; tipo_contrato: string; salario_hora: number | null; salario_mes: number | null }
interface ObraOpt { id: string; nome: string; empresa_id: string }

export function NovaFolhaForm({ funcionarios, obras }: { funcionarios: FuncOpt[]; obras: ObraOpt[] }) {
  const router = useRouter();
  const [funcId, setFuncId] = React.useState(funcionarios[0]!.id);
  const [obraId, setObraId] = React.useState(obras[0]!.id);
  const [dias9, setDias9] = React.useState(0);
  const [dias8, setDias8] = React.useState(0);
  const [extras, setExtras] = React.useState(0);
  const [faltas, setFaltas] = React.useState(0);
  const [valorHoras, setValorHoras] = React.useState(0);
  const [valorFixo, setValorFixo] = React.useState(0);
  const [valorExtras, setValorExtras] = React.useState(0);
  const [outros, setOutros] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  const func = funcionarios.find((f) => f.id === funcId);
  const empresaId = obras.find((o) => o.id === obraId)?.empresa_id;

  React.useEffect(() => {
    if (!func) return;
    if (func.tipo_contrato === 'horista' && func.salario_hora) {
      const totalHoras = dias9 * 9 + dias8 * 8 + extras - faltas;
      setValorHoras(Math.max(0, totalHoras * func.salario_hora));
    }
    if ((func.tipo_contrato === 'clt' || func.tipo_contrato === 'temporario') && func.salario_mes) {
      setValorFixo(func.salario_mes);
    }
  }, [func, dias9, dias8, extras, faltas]);

  const liquido = valorHoras + valorFixo + valorExtras - outros;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!empresaId) return;
    const fd = new FormData(e.currentTarget);
    fd.set('funcionario_id', funcId);
    fd.set('obra_id', obraId);
    fd.set('empresa_id', empresaId);
    fd.set('valor_horas', String(valorHoras));
    fd.set('valor_salario_fixo', String(valorFixo));
    fd.set('valor_extras', String(valorExtras));
    startTransition(async () => {
      const res = await lancarFolha(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Folha lançada.');
        router.push('/folha');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
        <Field label="Obra" name="obra_id" required>
          <Select value={obraId} onValueChange={setObraId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Mês de referência" name="mes_referencia" type="month" required
          defaultValue={new Date().toISOString().slice(0, 7)} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Horas trabalhadas</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <TextField label="Dias 9h" name="dias_9h" type="number" step="0.5" value={dias9 || ''} onChange={(e) => setDias9(Number(e.target.value))} />
          <TextField label="Dias 8h" name="dias_8h" type="number" step="0.5" value={dias8 || ''} onChange={(e) => setDias8(Number(e.target.value))} />
          <TextField label="Horas extras" name="horas_extras" type="number" step="0.5" value={extras || ''} onChange={(e) => setExtras(Number(e.target.value))} />
          <TextField label="Horas faltantes" name="horas_faltantes" type="number" step="0.5" value={faltas || ''} onChange={(e) => setFaltas(Number(e.target.value))} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Valores</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <CurrencyField label="Valor horas (auto)" name="valor_horas" value={valorHoras} onChange={setValorHoras} />
          <CurrencyField label="Salário fixo" name="valor_salario_fixo" value={valorFixo} onChange={setValorFixo} />
          <CurrencyField label="Outros extras" name="valor_extras" value={valorExtras} onChange={setValorExtras} />
          <CurrencyField label="Outros descontos" name="valor_outros_descontos" value={outros} onChange={setOutros} />
        </div>
        <div className="rounded-[10px] border border-brand-100 bg-brand-50 px-4 py-3 text-right">
          <span className="text-xs uppercase tracking-widest text-brand-600">Líquido (sem vales)</span>
          <div className="font-mono text-xl font-bold text-brand-900">{formatBRL(liquido)}</div>
          <p className="mt-1 text-[11px] text-brand-500">Vales abertos do funcionário são debitados automaticamente ao fechar.</p>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : 'Lançar folha'}
        </Button>
      </div>
    </form>
  );
}
