'use client';
import * as React from 'react';
import Link from 'next/link';
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
import { ItemQuickAddDialog } from '@/components/itens/quick-add-dialog';
import { criarCompra, sugerirRateioAuto } from '@/actions/compras';
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

interface FuncionarioOption {
  id: string;
  nome: string;
  obra_admissao_id: string | null;
  obra_atual_id: string | null;
  obra_demissao_id: string | null;
}

interface ItemOption {
  id: string;
  nome: string;
  unidade: string;
  valor_medio: number | null;
}

type FaseFuncionario = 'admissional' | 'recorrente' | 'demissional';
type CompraItemLine = { item_id: string; quantidade: number; valor_unitario: number; observacao?: string };

interface NovaCompraFormProps {
  empresas: Option[];
  obras: Option[];
  fornecedores: Option[];
  categorias: CategoriaOption[];
  socios: Option[];
  veiculos: VeiculoOption[];
  veiculoAlocacoes: VeiculoAlocacaoRow[];
  funcionarios: FuncionarioOption[];
  itens: ItemOption[];
}

export function NovaCompraForm({ empresas, obras, fornecedores, categorias, socios, veiculos, veiculoAlocacoes, funcionarios, itens }: NovaCompraFormProps) {
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
  const [funcionarioId, setFuncionarioId] = React.useState<string>('');
  const [faseFuncionario, setFaseFuncionario] = React.useState<FaseFuncionario>('recorrente');
  const [linhasItens, setLinhasItens] = React.useState<CompraItemLine[]>([]);
  // Local copy of itens so a quick-add dialog can append without page reload.
  const [itensList, setItensList] = React.useState<ItemOption[]>(itens);
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

  // When user picks a funcionário + fase, resolve the obra according to the
  // apropriação rule (admissional → obra de origem, recorrente → obra atual,
  // demissional → última obra) and pre-fill the rateio 100% on it.
  const funcionarioSelecionado = funcionarios.find((f) => f.id === funcionarioId);
  const obraResolvidaParaFunc = React.useMemo<string | null>(() => {
    if (!funcionarioSelecionado) return null;
    if (faseFuncionario === 'admissional') return funcionarioSelecionado.obra_admissao_id;
    if (faseFuncionario === 'demissional') return funcionarioSelecionado.obra_demissao_id ?? funcionarioSelecionado.obra_atual_id;
    return funcionarioSelecionado.obra_atual_id ?? funcionarioSelecionado.obra_admissao_id;
  }, [funcionarioSelecionado, faseFuncionario]);

  React.useEffect(() => {
    if (!funcionarioId || !obraResolvidaParaFunc) return;
    setModoRateio('percentual');
    setAlocacoes([{ obra_id: obraResolvidaParaFunc, percentual: 100 }]);
  }, [funcionarioId, obraResolvidaParaFunc]);

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
    // Item lines (opcional)
    fd.set('itens_json', JSON.stringify(linhasItens));
    if (linhasItens.length > 0) {
      const soma = linhasItens.reduce((s, l) => s + (Number(l.quantidade) || 0) * (Number(l.valor_unitario) || 0), 0);
      if (Math.abs(soma - valorTotal) > 0.05) {
        toast.error(`Soma das linhas (R$ ${soma.toFixed(2)}) difere do valor total (R$ ${valorTotal.toFixed(2)}). Ajuste antes de salvar.`);
        return;
      }
      const linhaInvalida = linhasItens.find((l) => !l.item_id || l.quantidade <= 0);
      if (linhaInvalida) {
        toast.error('Linhas de item: selecione o item e informe quantidade > 0 em todas as linhas.');
        return;
      }
    }
    // funcionário + fase: precisam vir juntos (DB exige consistência)
    if (funcionarioId) {
      fd.set('funcionario_id', funcionarioId);
      fd.set('fase_funcionario', faseFuncionario);
      if (!obraResolvidaParaFunc) {
        toast.error('Funcionário sem obra na fase escolhida — vincule-o a uma obra antes ou ajuste o rateio manualmente.');
        return;
      }
    } else {
      fd.delete('funcionario_id');
      fd.delete('fase_funcionario');
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
    for (const field of ['fornecedor_id', 'categoria_id', 'pago_por_socio_id', 'pago_por_funcionario_id', 'veiculo_id', 'funcionario_id']) {
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

  // === Itens da nota — bloco extraído pra ser renderizado entre Categoria e o resto dos campos
  const itensDaNotaBlock = (
    <div className="space-y-2 rounded-[14px] border border-brand-100 bg-brand-50/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Itens da nota — quantidade × valor unitário</h3>
        <div className="text-xs text-brand-500">
          Soma das linhas: <span className={Math.abs(linhasItens.reduce((s, l) => s + l.quantidade * l.valor_unitario, 0) - valorTotal) <= 0.05 && linhasItens.length > 0 ? 'font-mono font-semibold text-emerald-700' : 'font-mono text-brand-700'}>
            R$ {linhasItens.reduce((s, l) => s + l.quantidade * l.valor_unitario, 0).toFixed(2)}
          </span>
          <span className="ml-2 text-brand-500">/ R$ {valorTotal.toFixed(2)}</span>
        </div>
      </div>
      <p className="text-xs text-brand-600">
        Detalhe linha por linha quando a NF tem múltiplos itens. Ao salvar, cada item entra no estoque automaticamente com seu custo unitário.
        Se preferir uma compra sem detalhamento (ex.: serviço), deixe em branco.
      </p>
      {(() => {
        const cat = categorias.find((c) => c.id === categoriaId);
        const ehMaterialOuEpi = cat && (cat.nome === 'EPI' || cat.nome === 'Material' || cat.subtipo === null && /EPI|material/i.test(cat.nome));
        if (ehMaterialOuEpi && linhasItens.length === 0 && valorTotal > 0) {
          return (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <strong>Categoria {cat.nome}:</strong> recomendado detalhar a compra por item (qtd × valor unitário) pra alimentar o estoque automaticamente.
              Use "+ Adicionar linha" abaixo. Sem detalhamento, o estoque não atualiza.
            </p>
          );
        }
        return null;
      })()}
      {linhasItens.map((linha, idx) => {
        const itemSel = itensList.find((i) => i.id === linha.item_id);
        return (
          <div key={idx} className="space-y-1 rounded-md border border-brand-100 bg-white p-2">
            <div className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-5">
                <Label className="text-xs">{idx === 0 ? 'Item' : ''}</Label>
                <div className="flex items-stretch gap-2">
                  <div className="min-w-0 flex-1">
                    <Select
                      value={linha.item_id || '__none__'}
                      onValueChange={(v) => {
                        const novo = v === '__none__' ? '' : v;
                        const it = itensList.find((i) => i.id === novo);
                        setLinhasItens(linhasItens.map((l, i) => i === idx ? { ...l, item_id: novo, valor_unitario: l.valor_unitario || (it?.valor_medio ?? 0) } : l));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— selecione —</SelectItem>
                        {itensList.map((it) => (
                          <SelectItem key={it.id} value={it.id}>
                            {it.nome} ({it.unidade})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ItemQuickAddDialog
                    onCreated={(novo) => {
                      setItensList((prev) => [...prev, { ...novo, valor_medio: null }].sort((a, b) => a.nome.localeCompare(b.nome)));
                      setLinhasItens(linhasItens.map((l, i) => i === idx ? { ...l, item_id: novo.id } : l));
                    }}
                  />
                </div>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">{idx === 0 ? `Qtd${itemSel ? ` (${itemSel.unidade})` : ''}` : ''}</Label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={linha.quantidade || ''}
                  onChange={(e) => setLinhasItens(linhasItens.map((l, i) => i === idx ? { ...l, quantidade: Number(e.target.value) } : l))}
                  className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">{idx === 0 ? 'Valor unitário (R$)' : ''}</Label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={linha.valor_unitario || ''}
                  onChange={(e) => setLinhasItens(linhasItens.map((l, i) => i === idx ? { ...l, valor_unitario: Number(e.target.value) } : l))}
                  className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 font-mono text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="col-span-1"
                onClick={() => setLinhasItens(linhasItens.filter((_, i) => i !== idx))}
                aria-label="Remover linha"
              >
                ✕
              </Button>
            </div>
            <div>
              <Label className="text-xs text-brand-500">Como veio na NF (opcional)</Label>
              <input
                type="text"
                value={linha.observacao ?? ''}
                onChange={(e) => setLinhasItens(linhasItens.map((l, i) => i === idx ? { ...l, observacao: e.target.value } : l))}
                placeholder='Ex.: "DISCO CORTE INOX TYROLIT 4.1/2" — preserva a descrição exata do fornecedor pra rastreabilidade'
                className="block w-full rounded-md border border-brand-100 bg-brand-50/40 px-3 py-1.5 text-xs"
              />
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setLinhasItens([...linhasItens, { item_id: '', quantidade: 1, valor_unitario: 0 }])}
      >
        + Adicionar linha
      </Button>
      {itensList.length === 0 ? (
        <p className="text-xs text-amber-700">
          Nenhum item cadastrado ainda. Use o botão "+" ao lado do Select pra cadastrar rápido, ou cadastre completos em <Link href="/itens/novo" className="underline">/itens/novo</Link>.
        </p>
      ) : null}
    </div>
  );

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
      </div>

      {itensDaNotaBlock}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <div className="space-y-2 rounded-[14px] border border-brand-100 bg-brand-50/30 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Despesa de funcionário (opcional)</h3>
        <p className="text-xs text-brand-600">
          Marque quando a despesa é vinculada a um colaborador — o rateio é pré-preenchido conforme a obra dele na fase escolhida
          (admissional → obra de origem, recorrente → obra atual, demissional → última obra).
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Funcionário</Label>
            <Select
              value={funcionarioId || '__none__'}
              onValueChange={(v) => setFuncionarioId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="(não vinculada a funcionário)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— não vinculada —</SelectItem>
                {funcionarios.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {funcionarioId ? (
            <div className="space-y-1.5">
              <Label>Fase do custo</Label>
              <Select value={faseFuncionario} onValueChange={(v) => setFaseFuncionario(v as FaseFuncionario)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admissional">Admissional — fica na obra de origem</SelectItem>
                  <SelectItem value="recorrente">Recorrente — segue a obra atual</SelectItem>
                  <SelectItem value="demissional">Demissional — fica na última obra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        {funcionarioId && !obraResolvidaParaFunc ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            O funcionário escolhido ainda não tem obra na fase selecionada. Vincule-o a uma obra primeiro (em /funcionarios)
            ou ajuste o rateio manualmente abaixo.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Rateio entre obras</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-brand-500">Preencher automático:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                const res = await sugerirRateioAuto(empresaId, 'igual_obras_ativas', undefined);
                if (res.error) return toast.error(res.error);
                setModoRateio('percentual');
                setAlocacoes((res.alocacoes ?? []).map((a) => ({ obra_id: a.obra_id, percentual: a.percentual })));
                toast.success('Rateio dividido igualmente entre obras ativas.');
              }}
            >
              Igual
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                const res = await sugerirRateioAuto(empresaId, 'proporcional_funcionarios', undefined);
                if (res.error) return toast.error(res.error);
                setModoRateio('percentual');
                setAlocacoes((res.alocacoes ?? []).map((a) => ({ obra_id: a.obra_id, percentual: a.percentual })));
                toast.success('Rateio proporcional ao nº de funcionários por obra.');
              }}
            >
              Por funcionários
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                const dataCompra = (document.querySelector('input[name="data_compra"]') as HTMLInputElement | null)?.value;
                const res = await sugerirRateioAuto(empresaId, 'proporcional_faturamento', dataCompra);
                if (res.error) return toast.error(res.error);
                setModoRateio('percentual');
                setAlocacoes((res.alocacoes ?? []).map((a) => ({ obra_id: a.obra_id, percentual: a.percentual })));
                toast.success('Rateio proporcional ao faturamento do mês.');
              }}
            >
              Por faturamento
            </Button>
          </div>
        </div>
        <p className="text-xs text-brand-500">
          Use os botões acima pra preencher o rateio automaticamente quando o custo é indireto
          (sindicato, EPI, uniforme, medicina do trabalho, administrativo). Você ainda pode ajustar os percentuais manualmente depois.
        </p>
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
