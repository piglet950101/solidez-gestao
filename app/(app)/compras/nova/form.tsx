'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CurrencyField, Field, TextField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RateioForm } from '@/components/compras/rateio-form';
import { ParcelasEditor } from '@/components/compras/parcelas-editor';
import { FornecedorQuickAddDialog } from '@/components/fornecedores/quick-add-dialog';
import { criarCompra } from '@/actions/compras';
import { gerarParcelas, type RateioInputObra, type RateioModo } from '@/lib/rateio';
import { FORMATOS_PAGAMENTO } from '@/lib/formato-pagamento';
import { isSubtipoVeiculo } from '@/lib/categoria-subtipos';

interface Option {
  id: string;
  nome: string;
  empresa_id?: string;
}

interface CategoriaOption {
  id: string;
  nome: string;
  subtipo?: string | null;
}

interface VeiculoOption {
  id: string;
  placa: string;
  modelo: string;
}

interface VeiculoAlocacaoRow {
  veiculo_id: string;
  obra_id: string;
  percentual: number;
  periodo_inicio: string;
  periodo_fim: string | null;
}

interface NovaCompraFormProps {
  empresas: Option[];
  obras: Option[];
  fornecedores: Option[];
  categorias: CategoriaOption[];
  socios: Option[];
  veiculos: VeiculoOption[];
  veiculoAlocacoes: VeiculoAlocacaoRow[];
}

export function NovaCompraForm({ empresas, obras, fornecedores, categorias, socios, veiculos, veiculoAlocacoes }: NovaCompraFormProps) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = React.useState(empresas[0]?.id ?? '');
  const [valorTotal, setValorTotal] = React.useState(0);
  const [modoRateio, setModoRateio] = React.useState<RateioModo>('igual');
  const [alocacoes, setAlocacoes] = React.useState<RateioInputObra[]>([]);
  const [parcelas, setParcelas] = React.useState<{ data_vencimento: string; valor: number }[]>(() =>
    gerarParcelas(0, 1, new Date(), 30),
  );
  const [quemPagou, setQuemPagou] = React.useState<'empresa' | 'socio' | 'funcionario'>('empresa');
  const [pagoSocio, setPagoSocio] = React.useState<string>('');
  const [formatoPagamento, setFormatoPagamento] = React.useState<string>('');
  const [categoriaId, setCategoriaId] = React.useState<string>('');
  const [veiculoId, setVeiculoId] = React.useState<string>('');
  // Local list of fornecedores so a quick-add can append without page reload
  const [fornecedoresList, setFornecedoresList] = React.useState(fornecedores);
  const [fornecedorId, setFornecedorId] = React.useState<string>('');
  // Radix Select fires onValueChange('') spuriously when the controlled value
  // changes to an id whose <SelectItem> wasn't in the previous render — which
  // happens right after the quick-add dialog appends a new fornecedor and sets
  // fornecedorId in the same batch. That spurious call wipes the freshly-set
  // FK. So we track real user interaction (dropdown opens) and treat the
  // Select's state as authoritative only after that. Until then, the dialog
  // ref is the source of truth.
  const dialogSetFornIdRef = React.useRef<string>('');
  const userPickedFornRef = React.useRef<boolean>(false);
  const [pending, startTransition] = React.useTransition();

  const obrasDaEmpresa = obras.filter((o) => o.empresa_id === empresaId);

  const categoriaSelecionada = categorias.find((c) => c.id === categoriaId);
  const categoriaExigeVeiculo = isSubtipoVeiculo(categoriaSelecionada?.subtipo ?? null);

  // Current allocations of the selected veículo (today). Used to auto-fill rateio.
  const alocsDoVeiculoAtual = React.useMemo(() => {
    if (!veiculoId) return [] as VeiculoAlocacaoRow[];
    return veiculoAlocacoes.filter((a) => a.veiculo_id === veiculoId);
  }, [veiculoId, veiculoAlocacoes]);

  React.useEffect(() => {
    setParcelas((prev) => prev.map((p, i) => ({ ...p, valor: i === 0 ? valorTotal : 0 })));
  }, [valorTotal]);

  // When user picks a veículo, pre-fill the rateio with the obra(s) currently
  // allocated to it. User can still edit after — Débora's request was to
  // "automatically lançar o custo na obra do veículo", with manual override
  // as a safety net.
  React.useEffect(() => {
    if (!veiculoId || alocsDoVeiculoAtual.length === 0) return;
    // Map veículo's allocations into rateio "percentual" mode entries.
    setModoRateio('percentual');
    setAlocacoes(
      alocsDoVeiculoAtual.map((a) => ({ obra_id: a.obra_id, percentual: Number(a.percentual) })),
    );
  }, [veiculoId, alocsDoVeiculoAtual]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('empresa_id', empresaId);
    fd.set('valor_total', String(valorTotal));
    fd.set('rateio_modo', modoRateio);
    fd.set('alocacoes_json', JSON.stringify(alocacoes));
    fd.set('parcelas_json', JSON.stringify(parcelas));
    fd.set('quem_pagou', quemPagou);
    if (quemPagou === 'socio') fd.set('pago_por_socio_id', pagoSocio);
    else fd.delete('pago_por_socio_id');
    fd.delete('pago_por_funcionario_id');
    if (formatoPagamento) fd.set('formato_pagamento', formatoPagamento);
    else fd.delete('formato_pagamento');
    if (categoriaId) fd.set('categoria_id', categoriaId);
    else fd.delete('categoria_id');
    if (veiculoId) fd.set('veiculo_id', veiculoId);
    else fd.delete('veiculo_id');
    if (categoriaExigeVeiculo && !veiculoId) {
      toast.error('Categoria de veículo: selecione o veículo antes de salvar.');
      return;
    }
    // If the user explicitly opened the Select after the dialog, trust state.
    // Otherwise the dialog-set ref is the only reliable source (Radix Select
    // clobbers fornecedorId state to '' via a spurious onValueChange).
    const fornId = userPickedFornRef.current ? fornecedorId : (fornecedorId || dialogSetFornIdRef.current);
    if (fornId) fd.set('fornecedor_id', fornId);
    else fd.delete('fornecedor_id');

    // Defensive cleanup: strip any value from optional-uuid fields that isn't
    // a real uuid (e.g. Radix Select placeholders like '__none__', leftover
    // empty strings, etc). Prevents Zod's "Invalid uuid" rejection on the
    // server when a stray non-uuid sneaks into the FormData.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const field of ['fornecedor_id', 'categoria_id', 'pago_por_socio_id', 'pago_por_funcionario_id', 'veiculo_id']) {
      const v = fd.get(field);
      if (typeof v !== 'string' || !UUID_RE.test(v)) fd.delete(field);
    }
    if (!UUID_RE.test(empresaId)) {
      toast.error('Selecione uma empresa.');
      return;
    }

    startTransition(async () => {
      const result = await criarCompra(fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Compra registrada');
        router.push('/compras');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Empresa" name="empresa_id" required>
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <TextField label="Data da compra" name="data_compra" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />

        <TextField label="Descrição" name="descricao" required maxLength={140} placeholder="Ex.: 100 luvas + EPI · NF 12345" className="md:col-span-2" />

        <CurrencyField label="Valor total" name="valor_total" required value={valorTotal} onChange={setValorTotal} />

        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select
            value={categoriaId || '__none__'}
            onValueChange={(v) => setCategoriaId(v === '__none__' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="(opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— sem categoria —</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoriaExigeVeiculo ? (
            <p className="text-xs text-brand-600">
              Esta categoria é de veículo — selecione o veículo abaixo. O custo cai automaticamente na obra do veículo.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>
            Veículo{categoriaExigeVeiculo ? <span className="ml-1 text-red-600">*</span> : null}
          </Label>
          <Select
            value={veiculoId || '__none__'}
            onValueChange={(v) => setVeiculoId(v === '__none__' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={categoriaExigeVeiculo ? 'Obrigatório' : '(opcional)'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— sem veículo —</SelectItem>
              {veiculos.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.placa} · {v.modelo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {veiculoId && alocsDoVeiculoAtual.length === 0 ? (
            <p className="text-xs text-amber-700">
              Atenção: este veículo não está vinculado a nenhuma obra hoje. Vincule em Veículos antes ou edite o rateio manualmente.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>Fornecedor</Label>
          <input type="hidden" name="fornecedor_id" value={fornecedorId} />
          <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1">
              <Select
                value={fornecedorId || '__none__'}
                onOpenChange={(open) => { if (open) userPickedFornRef.current = true; }}
                onValueChange={(v) => setFornecedorId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— sem fornecedor —</SelectItem>
                  {fornecedoresList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FornecedorQuickAddDialog
              onCreated={(novo) => {
                setFornecedoresList((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
                setFornecedorId(novo.id);
                // Record the dialog's pick in a ref Radix Select can't clobber.
                dialogSetFornIdRef.current = novo.id;
                // Reset the "user picked" flag — the dialog just chose for them.
                userPickedFornRef.current = false;
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Quem pagou</Label>
          <Select value={quemPagou} onValueChange={(v) => setQuemPagou(v as typeof quemPagou)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="empresa">Empresa (CNPJ)</SelectItem>
              <SelectItem value="socio">Sócio do bolso (gera reembolso)</SelectItem>
              <SelectItem value="funcionario">Funcionário (gera reembolso)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Forma de pagamento</Label>
          <Select
            value={formatoPagamento || '__none__'}
            onValueChange={(v) => setFormatoPagamento(v === '__none__' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="(opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— não informado —</SelectItem>
              {FORMATOS_PAGAMENTO.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {quemPagou === 'socio' && (
          <div className="space-y-1.5">
            <Label>Sócio que pagou</Label>
            <Select value={pagoSocio} onValueChange={setPagoSocio}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {socios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Rateio entre obras</h3>
        <RateioForm
          obras={obrasDaEmpresa}
          valorTotal={valorTotal}
          modo={modoRateio}
          onModoChange={setModoRateio}
          alocacoes={alocacoes}
          onChange={setAlocacoes}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Parcelamento</h3>
        <ParcelasEditor valorTotal={valorTotal} parcelas={parcelas} onChange={setParcelas} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" name="observacoes" maxLength={500} />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : 'Registrar compra'}
        </Button>
      </div>
    </form>
  );
}
