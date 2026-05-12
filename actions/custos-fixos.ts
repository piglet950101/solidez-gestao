'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  empresa_id: z.string().uuid(),
  descricao: z.string().min(2).max(120),
  categoria_id: z.string().uuid().optional().nullable(),
  valor_mensal: z.coerce.number().positive(),
  dia_vencimento: z.coerce.number().int().min(1).max(31).optional(),
  vigencia_inicio: z.coerce.date().optional(),
  observacoes: z.string().max(500).optional().nullable(),
  alocacoes_json: z.string(),
});

const AlocacoesSchema = z.array(
  z.object({ obra_id: z.string().uuid(), percentual: z.coerce.number().positive().max(100) }),
);

export async function criarCustoFixo(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };

  let alocs: { obra_id: string; percentual: number }[];
  try {
    alocs = AlocacoesSchema.parse(JSON.parse(parsed.data.alocacoes_json));
  } catch {
    return { error: 'Estrutura de alocações inválida.' };
  }
  if (alocs.length === 0) return { error: 'Endereçe o custo fixo a pelo menos uma obra.' };
  const total = alocs.reduce((s, a) => s + a.percentual, 0);
  if (Math.abs(total - 100) > 0.01) return { error: `Soma dos percentuais (${total.toFixed(2)}%) deve ser exatamente 100%.` };

  const supabase = await createClient();
  const { alocacoes_json, ...rest } = parsed.data;
  const { data, error } = await supabase
    .from('custos_fixos')
    .insert({
      empresa_id: rest.empresa_id,
      descricao: rest.descricao,
      categoria_id: rest.categoria_id ?? null,
      valor_mensal: rest.valor_mensal,
      dia_vencimento: rest.dia_vencimento ?? null,
      vigencia_inicio: rest.vigencia_inicio?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      observacoes: rest.observacoes ?? null,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };

  const rows = alocs.map((a) => ({ custo_fixo_id: data.id, ...a }));
  const { error: e2 } = await supabase.from('custos_fixos_alocacoes').insert(rows);
  if (e2) return { error: e2.message };

  revalidatePath('/custos-fixos');
  return { id: data.id };
}

export async function desativarCustoFixo(id: string) {
  const supabase = await createClient();
  await supabase.from('custos_fixos').update({ ativo: false }).eq('id', id);
  revalidatePath('/custos-fixos');
}
