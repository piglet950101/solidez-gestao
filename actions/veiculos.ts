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
