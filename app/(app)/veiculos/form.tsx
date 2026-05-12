'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextField, TextareaField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { criarVeiculo, atualizarVeiculo } from '@/actions/veiculos';
import type { Veiculo } from '@/types/database';

interface Empresa { id: string; nome: string }

export function VeiculoForm({ veiculo, empresas }: { veiculo?: Veiculo; empresas: Empresa[] }) {
  const router = useRouter();
  const [tipoPropr, setTipoPropr] = React.useState<Veiculo['tipo_propriedade']>(veiculo?.tipo_propriedade ?? 'proprio_cnpj');
  const [status, setStatus] = React.useState<Veiculo['status']>(veiculo?.status ?? 'ativo');
  const [empresaId, setEmpresaId] = React.useState<string>(veiculo?.empresa_id ?? '__none__');
  const [finAtivo, setFinAtivo] = React.useState(veiculo?.financiamento_ativo ?? false);
  const [pending, startTransition] = React.useTransition();
  const isEdit = Boolean(veiculo?.id);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('tipo_propriedade', tipoPropr);
    fd.set('status', status);
    fd.set('financiamento_ativo', String(finAtivo));
    if (empresaId !== '__none__') fd.set('empresa_id', empresaId);
    else fd.delete('empresa_id');

    startTransition(async () => {
      const res = isEdit ? await atualizarVeiculo(veiculo!.id, fd) : await criarVeiculo(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success(isEdit ? 'Veículo atualizado.' : 'Veículo cadastrado.');
        router.push('/veiculos');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Identificação</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TextField label="Placa" name="placa" required defaultValue={veiculo?.placa ?? ''} placeholder="ABC-1D23" />
          <TextField label="Modelo" name="modelo" required defaultValue={veiculo?.modelo ?? ''} />
          <TextField label="Marca" name="marca" defaultValue={veiculo?.marca ?? ''} />
          <TextField label="Ano" name="ano" type="number" defaultValue={veiculo?.ano ?? ''} />
          <TextField label="Cor" name="cor" defaultValue={veiculo?.cor ?? ''} />
          <Field label="Status" name="status">
            <Select value={status} onValueChange={(v) => setStatus(v as Veiculo['status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="manutencao">Em manutenção</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="vendido">Vendido</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Propriedade</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Tipo de propriedade" name="tipo_propriedade" required>
            <Select value={tipoPropr} onValueChange={(v) => setTipoPropr(v as Veiculo['tipo_propriedade'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="proprio_cnpj">Próprio (CNPJ)</SelectItem>
                <SelectItem value="parceria_cpf">Parceria (CPF)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Empresa (se próprio)" name="empresa_id">
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— sem vínculo —</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <TextField label="Nome do proprietário" name="proprietario_nome" defaultValue={veiculo?.proprietario_nome ?? ''} hint="Quando for parceria CPF" />
          <TextField label="CPF/CNPJ do proprietário" name="proprietario_documento" defaultValue={veiculo?.proprietario_documento ?? ''} className="md:col-span-2" />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Documentação e óleo</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TextField label="Vencimento do CRLV" name="doc_vencimento" type="date" defaultValue={veiculo?.doc_vencimento ?? ''} />
          <TextField label="Última troca de óleo" name="ultima_troca_oleo_data" type="date" defaultValue={veiculo?.ultima_troca_oleo_data ?? ''} />
          <TextField label="KM na última troca" name="ultima_troca_oleo_km" type="number" defaultValue={veiculo?.ultima_troca_oleo_km ?? ''} />
          <TextField label="KM atual" name="km_atual" type="number" defaultValue={veiculo?.km_atual ?? ''} />
          <TextField label="Intervalo entre trocas (km)" name="intervalo_oleo_km" type="number" defaultValue={veiculo?.intervalo_oleo_km ?? 10000} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Financiamento</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={finAtivo} onChange={(e) => setFinAtivo(e.target.checked)} className="size-4 accent-brand-700" />
          <span>Veículo possui financiamento ativo</span>
        </label>
        {finAtivo && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField label="Valor da parcela" name="financiamento_parcela" type="number" step="0.01" defaultValue={veiculo?.financiamento_parcela ?? ''} />
            <TextField label="Parcelas restantes" name="financiamento_parcelas_restantes" type="number" defaultValue={veiculo?.financiamento_parcelas_restantes ?? ''} />
          </div>
        )}
      </section>

      <TextareaField label="Observações" name="observacoes" defaultValue={(veiculo as unknown as { observacoes?: string | null })?.observacoes ?? ''} rows={3} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Cadastrar veículo'}
        </Button>
      </div>
    </form>
  );
}
