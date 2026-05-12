'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { optionalString, emptyToNull } from '@/lib/zod-helpers';

const NovaObraSchema = z.object({
  empresa_id: z.string().uuid(),
  nome: z.string().min(2).max(80),
  codigo: optionalString,
  tipo: z.enum(['regular', 'curto_prazo']).default('regular'),
  com_permuta: z.coerce.boolean().default(false),
  data_inicio: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  data_fim_prevista: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  endereco: optionalString,
  observacoes: optionalString,
  socios_json: z.string().default('[]'),
});

const SociosSchema = z.array(z.object({ socio_id: z.string().uuid(), percentual: z.coerce.number().positive().max(100) }));

export async function criarObra(formData: FormData) {
  const parsed = NovaObraSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  let socios: { socio_id: string; percentual: number }[] = [];
  try {
    socios = SociosSchema.parse(JSON.parse(parsed.data.socios_json));
  } catch {
    return { error: 'Sócios inválidos.' };
  }
  if (socios.length > 0) {
    const total = socios.reduce((s, c) => s + c.percentual, 0);
    if (Math.abs(total - 100) > 0.01) return { error: `Sócios devem somar 100% (atual: ${total.toFixed(2)}%)` };
  }

  const supabase = await createClient();
  const { socios_json, ...rest } = parsed.data;
  const { data, error } = await supabase
    .from('obras')
    .insert({
      ...rest,
      data_inicio: rest.data_inicio?.toISOString().slice(0, 10) ?? null,
      data_fim_prevista: rest.data_fim_prevista?.toISOString().slice(0, 10) ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  if (socios.length > 0) {
    const rows = socios.map((s) => ({ obra_id: data.id, socio_id: s.socio_id, percentual: s.percentual }));
    const { error: e2 } = await supabase.from('obra_socios').insert(rows);
    if (e2) return { error: e2.message };
  }

  revalidatePath('/obras');
  return { id: data.id };
}

export async function encerrarObra(id: string, dataFim: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('obras')
    .update({ status: 'encerrada', data_fim_real: dataFim })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/obras/${id}`);
  return {};
}
