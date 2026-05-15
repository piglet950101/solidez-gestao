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
});

const CompraItensSchema = z.array(
  z.object({
    item_id: z.string().uuid(),
    quantidade: z.coerce.number().positive(),
    valor_unitario: z.coerce.number().nonnegative(),
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

  if (alocacoesInput.length === 0) return { error: 'Adicione pelo menos uma obra para o rateio.' };
  if (parcelasInput.length === 0) return { error: 'Adicione pelo menos uma parcela.' };

  // Optional: detalhamento por linhas de item. Quando vier, soma deve bater
  // com o valor_total da compra (tolerância R$ 0,05).
  let itensInput: { item_id: string; quantidade: number; valor_unitario: number }[] = [];
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

  let alocacoesCalc;
  try {
    alocacoesCalc = calcularRateio(rest.rateio_modo as RateioModo, rest.valor_total, alocacoesInput);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro no rateio.' };
  }
  const totalAlocado = alocacoesCalc.reduce((s, a) => s + a.valor_alocado, 0);
  if (Math.abs(totalAlocado - rest.valor_total) > 0.05) {
    return { error: `Soma do rateio (R$ ${totalAlocado.toFixed(2)}) difere do total (R$ ${rest.valor_total.toFixed(2)}).` };
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

export async function excluirCompra(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('compras').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/compras');
  revalidatePath('/');
  return {};
}

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
