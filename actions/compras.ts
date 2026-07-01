'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { calcularRateio, type RateioModo, type RateioInputObra } from '@/lib/rateio';
import type { Json } from '@/types/database';
import { optionalUuid, optionalString } from '@/lib/zod-helpers';

const NovaCompraSchema = z.object({
  empresa_id: z.string().uuid(),
  fornecedor_id: optionalUuid,
  categoria_id: optionalUuid,
  descricao: z.string().min(3).max(200),
  valor_total: z.coerce.number().positive(),
  data_compra: z.coerce.date(),
  rateio_modo: z.enum(['igual', 'percentual', 'valor', 'quantidade']),
  quem_pagou: z.enum(['empresa', 'socio', 'funcionario']),
  pago_por_socio_id: optionalUuid,
  pago_por_funcionario_id: optionalUuid,
  formato_pagamento: optionalString,
  observacoes: optionalString,
  veiculo_id: optionalUuid,
  funcionario_id: optionalUuid,
  fase_funcionario: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.enum(['admissional', 'recorrente', 'demissional']).nullable().optional(),
  ),
  alocacoes_json: z.string(),
  parcelas_json: z.string(),
  itens_json: z.string().optional(),
  // V2: tipo da despesa (espelha categorias.tipo_despesa, mas pode vir explícito do form)
  tipo_despesa: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.enum(['individual_obra', 'administrativa', 'estoque']).nullable().optional(),
  ),
});

const CompraItensSchema = z.array(
  z.object({
    item_id: z.string().uuid(),
    quantidade: z.coerce.number().positive(),
    valor_unitario: z.coerce.number().nonnegative(),
    observacao: optionalString,
  }),
);

const AlocacoesSchema = z.array(
  z.object({
    obra_id: z.string().uuid(),
    percentual: z.coerce.number().optional(),
    valor: z.coerce.number().optional(),
    quantidade: z.coerce.number().optional(),
  }),
);
const ParcelasSchema = z.array(
  z.object({
    data_vencimento: z.string(),
    valor: z.coerce.number().positive(),
  }),
);

export async function criarCompra(formData: FormData): Promise<{ id?: string; error?: string }> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = NovaCompraSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join('.') || 'campo';
    return { error: `Erro de validação em "${field}": ${issue?.message ?? 'inválido'}` };
  }
  const { alocacoes_json, parcelas_json, ...rest } = parsed.data;

  let alocacoesInput: RateioInputObra[];
  let parcelasInput: { data_vencimento: string; valor: number }[];
  try {
    alocacoesInput = AlocacoesSchema.parse(JSON.parse(alocacoes_json));
    parcelasInput = ParcelasSchema.parse(JSON.parse(parcelas_json));
  } catch (e) {
    return { error: 'Estrutura de alocações ou parcelas inválida.' };
  }

  // V2: compras de estoque podem não ter alocações — custo flui via saída do estoque.
  // Pra essas, exige que tenham linhas de item (senão o custo desaparece).
  const tipoDespesa = parsed.data.tipo_despesa ?? null;
  if (tipoDespesa !== 'estoque' && alocacoesInput.length === 0) {
    return { error: 'Adicione pelo menos uma obra para o rateio.' };
  }
  if (parcelasInput.length === 0) return { error: 'Adicione pelo menos uma parcela.' };

  // Optional: detalhamento por linhas de item. Quando vier, soma deve bater
  // com o valor_total da compra (tolerância R$ 0,05).
  let itensInput: { item_id: string; quantidade: number; valor_unitario: number; observacao?: string | null }[] = [];
  if (parsed.data.itens_json && parsed.data.itens_json !== '[]') {
    try {
      itensInput = CompraItensSchema.parse(JSON.parse(parsed.data.itens_json));
    } catch {
      return { error: 'Estrutura de itens da compra inválida.' };
    }
    if (itensInput.length > 0) {
      const somaItens = itensInput.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0);
      if (Math.abs(somaItens - rest.valor_total) > 0.05) {
        return { error: `Soma das linhas (R$ ${somaItens.toFixed(2)}) difere do valor total (R$ ${rest.valor_total.toFixed(2)}).` };
      }
    }
  }
  // V2: compras de estoque PRECISAM ter linhas (senão custo desaparece)
  if (tipoDespesa === 'estoque' && itensInput.length === 0) {
    return { error: 'Compra de estoque precisa de pelo menos uma linha de item (qtd × valor unitário).' };
  }

  let alocacoesCalc: Awaited<ReturnType<typeof calcularRateio>> | { obra_id: string; valor_alocado: number; percentual_alocado: number | null; qtd_alocada: number | null }[];
  if (tipoDespesa === 'estoque' && alocacoesInput.length === 0) {
    alocacoesCalc = [];
  } else {
    try {
      alocacoesCalc = calcularRateio(rest.rateio_modo as RateioModo, rest.valor_total, alocacoesInput);
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro no rateio.' };
    }
    const totalAlocado = alocacoesCalc.reduce((s, a) => s + a.valor_alocado, 0);
    if (Math.abs(totalAlocado - rest.valor_total) > 0.05) {
      return { error: `Soma do rateio (R$ ${totalAlocado.toFixed(2)}) difere do total (R$ ${rest.valor_total.toFixed(2)}).` };
    }
  }
  const totalParcelas = parcelasInput.reduce((s, p) => s + p.valor, 0);
  if (Math.abs(totalParcelas - rest.valor_total) > 0.05) {
    return { error: `Soma das parcelas (R$ ${totalParcelas.toFixed(2)}) difere do total (R$ ${rest.valor_total.toFixed(2)}).` };
  }

  const supabase = await createClient();
  const rpcParams = {
    p_empresa_id: rest.empresa_id,
    p_fornecedor_id: rest.fornecedor_id ?? null,
    p_categoria_id: rest.categoria_id ?? null,
    p_descricao: rest.descricao,
    p_valor_total: rest.valor_total,
    p_data_compra: rest.data_compra.toISOString().slice(0, 10),
    p_rateio_modo: rest.rateio_modo,
    p_quem_pagou: rest.quem_pagou,
    p_pago_por_socio_id: rest.pago_por_socio_id ?? null,
    p_pago_por_funcionario_id: rest.pago_por_funcionario_id ?? null,
    p_formato_pagamento: rest.formato_pagamento ?? null,
    p_foto_nota_url: null as string | null,
    p_alocacoes: alocacoesCalc as unknown as Json,
    p_parcelas: parcelasInput as unknown as Json,
    // Only pass p_veiculo_id when set — keeps backward compatibility with the
    // 14-arg fn_criar_compra signature for deploys done before the
    // 20260515000001 migration is applied.
    ...(rest.veiculo_id ? { p_veiculo_id: rest.veiculo_id } : {}),
    // funcionario_id + fase_funcionario need to be passed together (DB has a
    // CHECK constraint via fn_criar_compra raising on partial input).
    ...(rest.funcionario_id && rest.fase_funcionario
      ? { p_funcionario_id: rest.funcionario_id, p_fase_funcionario: rest.fase_funcionario }
      : {}),
    ...(tipoDespesa ? { p_tipo_despesa: tipoDespesa } : {}),
  };
  const { data, error } = await supabase.rpc('fn_criar_compra', rpcParams);

  if (error) return { error: error.message };

  // Persiste as linhas de item se houver — trigger fn_aplicar_compra_item
  // atualiza saldo e cria itens_movimentacoes automaticamente.
  if (itensInput.length > 0) {
    const rows = itensInput.map((i) => ({
      compra_id: data as string,
      item_id: i.item_id,
      quantidade: i.quantidade,
      valor_unitario: i.valor_unitario,
      observacao: i.observacao ?? null,
    }));
    const { error: itensErr } = await supabase.from('compra_itens').insert(rows);
    if (itensErr) {
      // Best-effort: log the error but compra já está criada com o financeiro correto.
      // Em produção, isso poderia ser uma transação — mas vamos optar por logar
      // e seguir, já que valor_total/parcelas/alocações estão corretos.
      console.error('Falha ao gravar linhas de item:', itensErr.message);
    }
  }

  revalidatePath('/compras');
  revalidatePath('/itens');
  revalidatePath('/estoque');
  revalidatePath('/');
  return { id: data as string };
}

export async function atualizarCompraBasico(
  id: string,
  data: {
    data_compra: string;
    descricao: string;
    observacoes: string | null;
    formato_pagamento?: string | null;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('compras')
    .update({
      data_compra: data.data_compra,
      descricao: data.descricao,
      observacoes: data.observacoes ?? null,
      formato_pagamento: data.formato_pagamento ?? null,
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/compras');
  revalidatePath(`/compras/${id}`);
  return {};
}

/**
 * Sugere alocações automáticas pra uma compra, segundo o modo escolhido:
 * - 'igual_obras_ativas': divide igualmente entre obras ativas da empresa
 * - 'proporcional_funcionarios': divide proporcionalmente ao nº de funcionários
 *   ativos vinculados a cada obra (obra_atual_id)
 * - 'proporcional_faturamento': divide proporcionalmente ao valor_liquido das
 *   medições do mês em cada obra (fallback: igual entre obras ativas)
 */
export async function sugerirRateioAuto(
  empresa_id: string,
  modo: 'igual_obras_ativas' | 'proporcional_funcionarios' | 'proporcional_faturamento',
  data_compra?: string,
): Promise<{ alocacoes?: { obra_id: string; percentual: number }[]; error?: string }> {
  const supabase = await createClient();
  const { data: obras } = await supabase
    .from('obras')
    .select('id, nome')
    .eq('empresa_id', empresa_id)
    .eq('status', 'ativa');
  if (!obras || obras.length === 0) {
    return { error: 'Sem obras ativas nesta empresa.' };
  }

  if (modo === 'igual_obras_ativas') {
    const n = obras.length;
    const pct = 100 / n;
    return {
      alocacoes: obras.map((o, i) => ({
        obra_id: o.id,
        // Joga o resíduo de arredondamento na primeira obra pra somar 100% exato
        percentual: i === 0 ? Number((pct + (100 - pct * n)).toFixed(4)) : Number(pct.toFixed(4)),
      })),
    };
  }

  if (modo === 'proporcional_funcionarios') {
    const obraIds = obras.map((o) => o.id);
    const { data: funcs } = await supabase
      .from('funcionarios')
      .select('id, obra_atual_id, status')
      .neq('status', 'desligado')
      .in('obra_atual_id', obraIds);
    const counts = new Map<string, number>();
    for (const f of funcs ?? []) {
      if (f.obra_atual_id) counts.set(f.obra_atual_id, (counts.get(f.obra_atual_id) ?? 0) + 1);
    }
    const total = Array.from(counts.values()).reduce((s, n) => s + n, 0);
    if (total === 0) {
      return { error: 'Nenhum funcionário ativo vinculado a obras desta empresa — vincule funcionários antes ou use outro modo.' };
    }
    const obrasComFunc = obras.filter((o) => (counts.get(o.id) ?? 0) > 0);
    return {
      alocacoes: obrasComFunc.map((o, i) => {
        const pct = ((counts.get(o.id) ?? 0) * 100) / total;
        const last = i === obrasComFunc.length - 1;
        // Joga o resíduo na última obra pra somar 100% exato (sem perder centavos)
        if (last) {
          const usados = obrasComFunc
            .slice(0, i)
            .reduce((s, oo) => s + Number((((counts.get(oo.id) ?? 0) * 100) / total).toFixed(4)), 0);
          return { obra_id: o.id, percentual: Number((100 - usados).toFixed(4)) };
        }
        return { obra_id: o.id, percentual: Number(pct.toFixed(4)) };
      }),
    };
  }

  // proporcional_faturamento
  const d = data_compra ? new Date(data_compra) : new Date();
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  const obraIds = obras.map((o) => o.id);
  const { data: medicoes } = await supabase
    .from('medicoes')
    .select('obra_id, valor_liquido')
    .in('obra_id', obraIds)
    .gte('data_emissao', monthStart)
    .lte('data_emissao', monthEnd);
  const faturamento = new Map<string, number>();
  for (const m of medicoes ?? []) faturamento.set(m.obra_id, (faturamento.get(m.obra_id) ?? 0) + Number(m.valor_liquido));
  const total = Array.from(faturamento.values()).reduce((s, n) => s + n, 0);
  if (total === 0) {
    // Fallback: rateio igual
    const n = obras.length;
    const pct = 100 / n;
    return {
      alocacoes: obras.map((o, i) => ({
        obra_id: o.id,
        percentual: i === 0 ? Number((pct + (100 - pct * n)).toFixed(4)) : Number(pct.toFixed(4)),
      })),
    };
  }
  const obrasComFat = obras.filter((o) => (faturamento.get(o.id) ?? 0) > 0);
  return {
    alocacoes: obrasComFat.map((o, i) => {
      const last = i === obrasComFat.length - 1;
      if (last) {
        const usados = obrasComFat
          .slice(0, i)
          .reduce((s, oo) => s + Number((((faturamento.get(oo.id) ?? 0) * 100) / total).toFixed(4)), 0);
        return { obra_id: o.id, percentual: Number((100 - usados).toFixed(4)) };
      }
      const pct = ((faturamento.get(o.id) ?? 0) * 100) / total;
      return { obra_id: o.id, percentual: Number(pct.toFixed(4)) };
    }),
  };
}

/**
 * V2: Sugere rateio administrativo proporcional entre obras ativas da empresa
 * (ou de todas as empreiteiras se a empresa for a matriz). Usado pelo form de
 * compra quando a categoria for marcada como "administrativa".
 */
export async function sugerirRateioAdministrativo(empresa_id: string): Promise<{
  alocacoes?: { obra_id: string; percentual: number }[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)('fn_sugerir_rateio_administrativo', { p_empresa_id: empresa_id });
  if (error) return { error: error.message };
  const rows = (data ?? []) as { obra_id: string; percentual: number }[];
  if (rows.length === 0) return { error: 'Sem obras ativas pra rateio administrativo.' };
  return { alocacoes: rows.map((r) => ({ obra_id: r.obra_id, percentual: Number(r.percentual) })) };
}

export async function excluirCompra(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('compras').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/compras');
  revalidatePath('/');
  return {};
}

/** Pagamento completo de uma parcela: data, forma, conta, observações e comprovante.
 *  Cada campo tem coluna própria em parcelas (forma_pagamento, pago_via_conta,
 *  comprovante_url); observacoes fica só com o texto livre do usuário. */
const RegistrarPagamentoSchema = z.object({
  data_pagamento: z.string().min(8),
  forma_pagamento: optionalString,
  pago_via_conta: optionalString,
  observacoes: optionalString,
  comprovante_path: optionalString,
});

export async function registrarPagamentoParcela(parcelaId: string, formData: FormData) {
  const parsed = RegistrarPagamentoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const { data_pagamento, forma_pagamento, pago_via_conta, observacoes, comprovante_path } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from('parcelas')
    .update({
      status: 'pago',
      data_pagamento,
      forma_pagamento: forma_pagamento ?? null,
      pago_via_conta: pago_via_conta ?? null,
      comprovante_url: comprovante_path ?? null,
      observacoes: observacoes ?? null,
    } as never)
    .eq('id', parcelaId);
  if (error) return { error: error.message };
  revalidatePath('/contas-a-pagar');
  revalidatePath('/compras');
  revalidatePath('/');
  return { ok: true };
}

/** Reverte um pagamento — devolve a parcela pra pendente e limpa os metadados. */
export async function reverterPagamentoParcela(parcelaId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('parcelas')
    .update({
      status: 'pendente',
      data_pagamento: null,
      forma_pagamento: null,
      pago_via_conta: null,
      comprovante_url: null,
    } as never)
    .eq('id', parcelaId);
  if (error) return { error: error.message };
  revalidatePath('/contas-a-pagar');
  revalidatePath('/compras');
  revalidatePath('/');
  return { ok: true };
}

/** Legacy: mantém compatibilidade com locais que chamavam pagarParcela só com data. */
export async function pagarParcela(parcelaId: string, dataPagamento: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('parcelas')
    .update({ status: 'pago', data_pagamento: dataPagamento })
    .eq('id', parcelaId);
  if (error) return { error: error.message };
  revalidatePath('/compras');
  revalidatePath('/');
  return {};
}
