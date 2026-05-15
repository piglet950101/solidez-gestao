'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { optionalUuid, optionalString, emptyToNull } from '@/lib/zod-helpers';

const optionalNumber = z.preprocess(emptyToNull, z.coerce.number().nullable().optional());
const optionalInt = z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional());

const Schema = z.object({
  placa: z.string().min(5).max(10),
  modelo: z.string().min(1).max(80),
  marca: optionalString,
  ano: z.preprocess(emptyToNull, z.coerce.number().int().min(1900).max(2100).nullable().optional()),
  cor: optionalString,
  tipo_propriedade: z.enum(['proprio_cnpj', 'parceria_cpf']),
  proprietario_nome: optionalString,
  proprietario_documento: optionalString,
  empresa_id: optionalUuid,
  status: z.enum(['ativo', 'manutencao', 'inativo', 'vendido']).optional(),
  doc_vencimento: optionalString,
  ultima_troca_oleo_data: optionalString,
  ultima_troca_oleo_km: optionalInt,
  km_atual: optionalInt,
  intervalo_oleo_km: optionalInt,
  financiamento_ativo: z.coerce.boolean().optional(),
  financiamento_parcela: optionalNumber,
  financiamento_parcelas_restantes: optionalInt,
  observacoes: optionalString,
});

function cleanEmpty<T extends Record<string, unknown>>(o: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === '' || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export async function criarVeiculo(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('veiculos')
    .insert(cleanEmpty(parsed.data) as never)
    .select('id')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/veiculos');
  return { id: data.id };
}

export async function atualizarVeiculo(id: string, formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('veiculos')
    .update(cleanEmpty(parsed.data) as never)
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/veiculos');
  revalidatePath(`/veiculos/${id}`);
  return { id };
}

const CustoSchema = z.object({
  veiculo_id: z.string().uuid(),
  tipo: z.enum(['combustivel', 'manutencao', 'documentacao', 'financiamento', 'seguro', 'outros']),
  data: z.coerce.date(),
  valor: z.coerce.number().positive(),
  km: optionalInt,
  descricao: optionalString,
});

export async function registrarVeiculoCusto(formData: FormData) {
  const parsed = CustoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase.from('veiculo_custos').insert({
    ...parsed.data,
    data: parsed.data.data.toISOString().slice(0, 10),
  });
  if (error) return { error: error.message };
  revalidatePath(`/veiculos/${parsed.data.veiculo_id}`);
  return {};
}

/**
 * Returns the obra(s) currently allocated to a given veículo on a given date.
 * Reads veiculo_alocacoes (period-based) and is used to pre-fill compra rateio
 * when a veículo is selected on /compras/nova.
 */
export async function obrasAtuaisDoVeiculo(
  veiculo_id: string,
  data: string = new Date().toISOString().slice(0, 10),
): Promise<{ obra_id: string; percentual: number; obra_nome: string }[]> {
  const supabase = await createClient();
  const { data: alocs } = await supabase
    .from('veiculo_alocacoes')
    .select('obra_id, percentual, periodo_inicio, periodo_fim, obras(nome)')
    .eq('veiculo_id', veiculo_id)
    .lte('periodo_inicio', data)
    .or(`periodo_fim.is.null,periodo_fim.gte.${data}`);
  return (alocs ?? []).map((a) => ({
    obra_id: a.obra_id,
    percentual: Number(a.percentual),
    obra_nome: (a as unknown as { obras?: { nome: string } }).obras?.nome ?? '—',
  }));
}

const TransferirSchema = z.object({
  nova_obra_id: z.string().uuid(),
  data_transferencia: z.string(),
  observacao: optionalString,
});

/**
 * Transferir veículo para outra obra: chama fn_transferir_veiculo que encerra
 * alocações ativas no dia anterior e cria uma nova alocação 100% na obra
 * destino a partir da data informada.
 */
export async function transferirVeiculo(veiculo_id: string, formData: FormData) {
  const parsed = TransferirSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Dados inválidos.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc('fn_transferir_veiculo', {
    p_veiculo_id: veiculo_id,
    p_nova_obra_id: parsed.data.nova_obra_id,
    p_data_transferencia: parsed.data.data_transferencia,
    p_observacao: parsed.data.observacao ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath('/veiculos');
  revalidatePath(`/veiculos/${veiculo_id}`);
  return {};
}
