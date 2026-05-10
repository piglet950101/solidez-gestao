'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const NovaMedicaoSchema = z.object({
  obra_id: z.string().uuid(),
  etapa_id: z.string().uuid().nullable().optional(),
  num_medicao: z.coerce.number().int().positive(),
  descricao: z.string().max(200).nullable().optional(),
  valor_bruto: z.coerce.number().positive(),
  valor_liquido: z.coerce.number().positive(),
  percentual_imposto_estimado: z.coerce.number().min(0).max(100).nullable().optional(),
  data_emissao: z.coerce.date(),
  num_nota_fiscal: z.string().max(50).nullable().optional(),
});

export async function criarMedicao(formData: FormData) {
  const parsed = NovaMedicaoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('medicoes')
    .insert({
      ...parsed.data,
      data_emissao: parsed.data.data_emissao.toISOString().slice(0, 10),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/medicoes');
  revalidatePath(`/obras/${parsed.data.obra_id}`);
  return { id: data.id };
}

const RecebimentoSchema = z.object({
  medicao_id: z.string().uuid(),
  valor: z.coerce.number().positive(),
  data_recebimento: z.coerce.date(),
  tipo: z.enum(['dinheiro', 'permuta']),
  descricao_permuta: z.string().nullable().optional(),
});

export async function registrarRecebimento(formData: FormData) {
  const parsed = RecebimentoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  if (parsed.data.tipo === 'permuta' && !parsed.data.descricao_permuta) {
    return { error: 'Descreva o item recebido em permuta.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('recebimentos').insert({
    ...parsed.data,
    data_recebimento: parsed.data.data_recebimento.toISOString().slice(0, 10),
  });
  if (error) return { error: error.message };
  revalidatePath('/medicoes');
  return {};
}

const AntecipacaoSchema = z.object({
  obra_id: z.string().uuid(),
  data_recebimento: z.coerce.date(),
  valor: z.coerce.number().positive(),
});

export async function registrarAntecipacao(formData: FormData) {
  const parsed = AntecipacaoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase.from('antecipacoes').insert({
    ...parsed.data,
    data_recebimento: parsed.data.data_recebimento.toISOString().slice(0, 10),
  });
  if (error) return { error: error.message };
  revalidatePath(`/obras/${parsed.data.obra_id}`);
  return {};
}

export async function conciliarAntecipacao(antecipacaoId: string, medicaoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('fn_conciliar_antecipacao', {
    p_antecipacao_id: antecipacaoId,
    p_medicao_id: medicaoId,
  });
  if (error) return { error: error.message };
  revalidatePath('/medicoes');
  return {};
}
