'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, CurrencyField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Funcionario } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface Props {
  funcionario?: Funcionario;
}

export function FuncionarioForm({ funcionario }: Props) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [tipo, setTipo] = React.useState<Funcionario['tipo_contrato']>(funcionario?.tipo_contrato ?? 'horista');
  const [status, setStatus] = React.useState<Funcionario['status']>(funcionario?.status ?? 'ativo');
  const [salarioHora, setSalarioHora] = React.useState<number>(funcionario?.salario_hora ?? 0);
  const [salarioMes, setSalarioMes] = React.useState<number>(funcionario?.salario_mes ?? 0);
  const [pending, startTransition] = React.useTransition();
  const isEdit = Boolean(funcionario?.id);

  // Período de experiência editável (45+45 padrão, mas Brasil permite outros splits)
  const initialDias1 = funcionario?.experiencia_dias_1 ?? 45;
  const initialDias2 = funcionario?.experiencia_dias_2 ?? 90;
  const PRESETS = [
    { label: '45 + 45 (padrão CLT)', d1: 45, d2: 90 },
    { label: '30 + 60', d1: 30, d2: 90 },
    { label: '60 + 30', d1: 60, d2: 90 },
    { label: '90 direto (sem split intermediário)', d1: 90, d2: 90 },
    { label: 'Sem período de experiência', d1: 0, d2: 0 },
  ];
  const matchIdx = PRESETS.findIndex((p) => p.d1 === initialDias1 && p.d2 === initialDias2);
  const [presetIdx, setPresetIdx] = React.useState<string>(matchIdx >= 0 ? String(matchIdx) : 'custom');
  const [dias1, setDias1] = React.useState(initialDias1);
  const [dias2, setDias2] = React.useState(initialDias2);

  function onPresetChange(v: string) {
    setPresetIdx(v);
    if (v === 'custom') return;
    const p = PRESETS[Number(v)];
    if (p) { setDias1(p.d1); setDias2(p.d2); }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      nome: String(fd.get('nome') ?? '').trim(),
      cpf: String(fd.get('cpf') ?? '').trim() || null,
      rg: String(fd.get('rg') ?? '').trim() || null,
      chave_pix: String(fd.get('chave_pix') ?? '').trim() || null,
      contato: String(fd.get('contato') ?? '').trim() || null,
      cargo: String(fd.get('cargo') ?? '').trim() || null,
      tipo_contrato: tipo,
      salario_hora: tipo === 'horista' ? Number(fd.get('salario_hora')) || null : null,
      salario_mes: tipo === 'clt' || tipo === 'temporario' ? Number(fd.get('salario_mes')) || null : null,
      status,
      data_admissao: String(fd.get('data_admissao') ?? '') || null,
      data_desligamento: String(fd.get('data_desligamento') ?? '') || null,
      registrado: fd.get('registrado') === 'on',
      tem_os_curso: fd.get('tem_os_curso') === 'on',
      os_curso_validade: String(fd.get('os_curso_validade') ?? '') || null,
      tamanho_sapato: String(fd.get('tamanho_sapato') ?? '').trim() || null,
      tamanho_camiseta: String(fd.get('tamanho_camiseta') ?? '').trim() || null,
      tamanho_calca: String(fd.get('tamanho_calca') ?? '').trim() || null,
      cabeca_de_empreitada: fd.get('cabeca_de_empreitada') === 'on',
      observacoes: String(fd.get('observacoes') ?? '').trim() || null,
      experiencia_dias_1: dias1 || null,
      experiencia_dias_2: dias2 || null,
    };

    if (!payload.nome || payload.nome.length < 2) {
      toast.error('Nome obrigatório.');
      return;
    }

    startTransition(async () => {
      const { error } = isEdit
        ? await supabase.from('funcionarios').update(payload).eq('id', funcionario!.id)
        : await supabase.from('funcionarios').insert(payload);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(isEdit ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
      router.push('/funcionarios');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="Nome completo" name="nome" defaultValue={funcionario?.nome ?? ''} required className="md:col-span-2" />
        <TextField label="CPF" name="cpf" defaultValue={funcionario?.cpf ?? ''} placeholder="000.000.000-00" />
        <TextField label="RG" name="rg" defaultValue={funcionario?.rg ?? ''} />
        <TextField label="Cargo" name="cargo" defaultValue={funcionario?.cargo ?? ''} placeholder="Carpinteiro, Pedreiro, Engenheiro..." />
        <TextField label="Contato" name="contato" defaultValue={funcionario?.contato ?? ''} placeholder="(48) 99999-9999" />
        <TextField label="Chave PIX" name="chave_pix" defaultValue={funcionario?.chave_pix ?? ''} className="md:col-span-2" hint="CPF, telefone, email ou chave aleatória" />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Contrato</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Tipo de contrato" name="tipo_contrato" required>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Funcionario['tipo_contrato'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="clt">CLT (mensalista)</SelectItem>
                <SelectItem value="horista">Horista</SelectItem>
                <SelectItem value="empreitada">Empreitada (medição)</SelectItem>
                <SelectItem value="temporario">Temporário</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {tipo === 'horista' && (
            <CurrencyField label="Salário por hora" name="salario_hora" value={salarioHora} onChange={setSalarioHora} />
          )}
          {(tipo === 'clt' || tipo === 'temporario') && (
            <CurrencyField label="Salário mensal" name="salario_mes" value={salarioMes} onChange={setSalarioMes} />
          )}
          <Field label="Status" name="status" required>
            <Select value={status} onValueChange={(v) => setStatus(v as Funcionario['status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="experiencia">Em experiência</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
                <SelectItem value="desligado">Desligado</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Data de admissão"
            name="data_admissao"
            type="date"
            defaultValue={funcionario?.data_admissao ?? ''}
            hint="Necessária pro alerta automático de fim de experiência"
          />
          <TextField label="Data de desligamento" name="data_desligamento" type="date" defaultValue={funcionario?.data_desligamento ?? ''} />
        </div>

        <div className="rounded-[12px] border border-brand-100 bg-brand-50/40 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-brand-600">Período de experiência</h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Modelo" name="experiencia_modo" className="md:col-span-3">
              <Select value={presetIdx} onValueChange={onPresetChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p, i) => (
                    <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {(presetIdx === 'custom' || dias2 > 0) && presetIdx !== String(PRESETS.length - 1) ? (
              <>
                <TextField
                  label="1ª etapa (dias)"
                  name="experiencia_dias_1"
                  type="number"
                  min={0}
                  max={dias2}
                  value={dias1 || ''}
                  onChange={(e) => { setDias1(Number(e.target.value)); setPresetIdx('custom'); }}
                  hint="Aviso amarelo dispara aqui"
                />
                <TextField
                  label="Total do contrato (dias)"
                  name="experiencia_dias_2"
                  type="number"
                  min={dias1}
                  value={dias2 || ''}
                  onChange={(e) => { setDias2(Number(e.target.value)); setPresetIdx('custom'); }}
                  hint="Aviso vermelho dispara aqui (decisão final)"
                />
                <div className="rounded-[8px] bg-white border border-brand-100 px-3 py-2 text-xs text-brand-600">
                  <strong>Resumo:</strong>
                  <div className="mt-1 font-mono text-brand-800">
                    {dias1} + {Math.max(0, dias2 - dias1)} = {dias2} dias
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="registrado" defaultChecked={funcionario?.registrado ?? false} className="size-4 accent-brand-700" />
            <span>Registrado (carteira assinada)</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cabeca_de_empreitada" defaultChecked={funcionario?.cabeca_de_empreitada ?? false} className="size-4 accent-brand-700" />
            <span>Cabeça de empreitada</span>
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">EPI e OS curso</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="col-span-1 flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="tem_os_curso" defaultChecked={funcionario?.tem_os_curso ?? false} className="size-4 accent-brand-700" />
            <span>Possui OS curso (NR-35, NR-18 etc.)</span>
          </label>
          <TextField label="Validade OS curso" name="os_curso_validade" type="date" defaultValue={funcionario?.os_curso_validade ?? ''} className="md:col-span-2" />
          <TextField label="Tamanho sapato" name="tamanho_sapato" defaultValue={funcionario?.tamanho_sapato ?? ''} />
          <TextField label="Tamanho camiseta" name="tamanho_camiseta" defaultValue={funcionario?.tamanho_camiseta ?? ''} />
          <TextField label="Tamanho calça" name="tamanho_calca" defaultValue={funcionario?.tamanho_calca ?? ''} className="md:col-span-2" />
        </div>
      </section>

      <TextareaField label="Observações" name="observacoes" defaultValue={funcionario?.observacoes ?? ''} rows={3} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Cadastrar funcionário'}
        </Button>
      </div>
    </form>
  );
}
