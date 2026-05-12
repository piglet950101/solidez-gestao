'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  placa: z.string().min(5).max(10),
  modelo: z.string().min(1).max(80),
  marca: z.string().max(50).optional().nullable(),
  ano: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  cor: z.string().max(30).optional().nullable(),
  tipo_propriedade: z.enum(['proprio_cnpj', 'parceria_cpf']),
  proprietario_nome: z.string().max(80).optional().nullable(),
  proprietario_documento: z.string().max(20).optional().nullable(),
  empresa_id: z.string().uuid().optional().nullable(),
  status: z.enum(['ativo', 'manutencao', 'inativo', 'vendido']).optional(),
  doc_vencimento: z.string().optional().nullable(),
  ultima_troca_oleo_data: z.string().optional().nullable(),
  ultima_troca_oleo_km: z.coerce.number().int().optional().nullable(),
  km_atual: z.coerce.number().int().optional().nullable(),
  intervalo_oleo_km: z.coerce.number().int().optional().nullable(),
  financiamento_ativo: z.coerce.boolean().optional(),
  financiamento_parcela: z.coerce.number().optional().nullable(),
  financiamento_parcelas_restantes: z.coerce.number().int().optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
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
  km: z.coerce.number().int().optional().nullable(),
  descricao: z.string().max(200).optional().nullable(),
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
