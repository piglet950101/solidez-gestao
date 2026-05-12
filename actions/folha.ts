'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const NovoLancamentoSchema = z.object({
  funcionario_id: z.string().uuid(),
  obra_id: z.string().uuid(),
  empresa_id: z.string().uuid(),
  mes_referencia: z.coerce.date(),
  dias_9h: z.coerce.number().min(0).default(0),
  dias_8h: z.coerce.number().min(0).default(0),
  horas_extras: z.coerce.number().min(0).default(0),
  horas_faltantes: z.coerce.number().min(0).default(0),
  valor_extras: z.coerce.number().min(0).default(0),
  valor_horas: z.coerce.number().min(0).default(0),
  valor_salario_fixo: z.coerce.number().min(0).default(0),
  valor_outros_descontos: z.coerce.number().min(0).default(0),
  valor_em_especie: z.coerce.number().min(0).default(0),
});

export async function lancarFolha(formData: FormData) {
  const parsed = NovoLancamentoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  const liquido =
    parsed.data.valor_horas +
    parsed.data.valor_salario_fixo +
    parsed.data.valor_extras -
    parsed.data.valor_outros_descontos;

  const supabase = await createClient();
  const { error } = await supabase.from('lancamentos_folha').upsert(
    {
      ...parsed.data,
      mes_referencia: parsed.data.mes_referencia.toISOString().slice(0, 10),
      valor_liquido: liquido,
    },
    { onConflict: 'funcionario_id,obra_id,mes_referencia' },
  );
  if (error) return { error: error.message };
  revalidatePath('/folha');
  return {};
}

export async function fecharFolha(funcionarioId: string, obraId: string, mesReferencia: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('fn_fechar_folha', {
    p_funcionario_id: funcionarioId,
    p_obra_id: obraId,
    p_mes_referencia: mesReferencia,
  });
  if (error) return { error: error.message };
  revalidatePath('/folha');
  return {};
}

const ValeSchema = z.object({
  funcionario_id: z.string().uuid(),
  obra_id: z.string().uuid().nullable().optional(),
  data: z.coerce.date(),
  valor: z.coerce.number().positive(),
});

export async function atualizarVale(id: string, formData: FormData) {
  const parsed = ValeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('vales')
    .update({
      ...parsed.data,
      data: parsed.data.data.toISOString().slice(0, 10),
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/vales');
  return {};
}

export async function excluirVale(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('vales').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/vales');
  return {};
}

export async function lancarVale(formData: FormData) {
  const parsed = ValeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase.from('vales').insert({
    ...parsed.data,
    data: parsed.data.data.toISOString().slice(0, 10),
  });
  if (error) return { error: error.message };
  revalidatePath('/vales');
  return {};
}

const ComissaoSchema = z.object({
  funcionario_id: z.string().uuid(),
  obra_id: z.string().uuid(),
  mes_referencia: z.coerce.date(),
  valor: z.coerce.number().positive(),
  descricao: z.string().max(200).nullable().optional(),
});

export async function registrarComissao(formData: FormData) {
  const parsed = ComissaoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase.from('funcionario_comissoes').insert({
    ...parsed.data,
    mes_referencia: parsed.data.mes_referencia.toISOString().slice(0, 10),
  });
  if (error) return { error: error.message };
  revalidatePath('/folha');
  return {};
}
