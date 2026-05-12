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
  alocacoes_json: z.string(),
  parcelas_json: z.string(),
});

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
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
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
  const { data, error } = await supabase.rpc('fn_criar_compra', {
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
    p_foto_nota_url: null,
    p_alocacoes: alocacoesCalc as unknown as Json,
    p_parcelas: parcelasInput as unknown as Json,
  });

  if (error) return { error: error.message };
  revalidatePath('/compras');
  revalidatePath('/');
  return { id: data as string };
}

export async function atualizarCompraBasico(
  id: string,
  data: { data_compra: string; descricao: string; observacoes: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('compras')
    .update({
      data_compra: data.data_compra,
      descricao: data.descricao,
      observacoes: data.observacoes ?? null,
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
