'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const NovoImpostoSchema = z.object({
  empresa_id: z.string().uuid(),
  mes_referencia: z.coerce.date(),
  valor_total: z.coerce.number().positive(),
  data_vencimento: z.coerce.date().nullable().optional(),
  num_boleto: z.string().max(80).nullable().optional(),
});

export async function lancarImposto(formData: FormData) {
  const parsed = NovoImpostoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase.from('impostos').insert({
    ...parsed.data,
    mes_referencia: parsed.data.mes_referencia.toISOString().slice(0, 10),
    data_vencimento: parsed.data.data_vencimento?.toISOString().slice(0, 10) ?? null,
    status: 'pendente_rateio',
  });
  if (error) return { error: error.message };
  revalidatePath('/impostos');
  return {};
}

const RatearImpostoSchema = z.object({
  imposto_id: z.string().uuid(),
  alocacoes_json: z.string(),
});

const AlocacoesSchema = z.array(
  z.object({
    obra_id: z.string().uuid(),
    valor: z.coerce.number().nonnegative(),
  }),
);

export async function ratearImposto(formData: FormData) {
  const parsed = RatearImpostoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: 'Dados inválidos.' };
  let alocs;
  try {
    alocs = AlocacoesSchema.parse(JSON.parse(parsed.data.alocacoes_json));
  } catch {
    return { error: 'Estrutura de alocações inválida.' };
  }
  const supabase = await createClient();
  const { data: imp } = await supabase.from('impostos').select('valor_total').eq('id', parsed.data.imposto_id).maybeSingle();
  if (!imp) return { error: 'Imposto não encontrado.' };
  const total = alocs.reduce((s, a) => s + a.valor, 0);
  if (Math.abs(total - imp.valor_total) > 0.05) {
    return { error: `Soma das alocações (R$ ${total.toFixed(2)}) difere do total do imposto (R$ ${imp.valor_total.toFixed(2)}).` };
  }

  await supabase.from('imposto_alocacoes').delete().eq('imposto_id', parsed.data.imposto_id);
  const rows = alocs.map((a) => ({ imposto_id: parsed.data.imposto_id, ...a }));
  const { error } = await supabase.from('imposto_alocacoes').insert(rows);
  if (error) return { error: error.message };
  await supabase.from('impostos').update({ status: 'rateado' }).eq('id', parsed.data.imposto_id);
  revalidatePath('/impostos');
  return {};
}
