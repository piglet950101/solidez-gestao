'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { optionalString } from '@/lib/zod-helpers';
import type { Json } from '@/types/database';

const ItemSchema = z.object({
  item_id: z.string().uuid(),
  quantidade: z.coerce.number().positive(),
  numero_ca: optionalString,
  validade: optionalString,
  lote: optionalString,
  motivo: optionalString,
});

const Schema = z.object({
  funcionario_id: z.string().uuid(),
  data_entrega: z.string(),
  observacao: optionalString,
  itens_json: z.string(),
});

export async function registrarEntregaEpi(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Dados inválidos.' };
  }
  let itensInput: { item_id: string; quantidade: number; numero_ca?: string | null; validade?: string | null; lote?: string | null; motivo?: string | null }[];
  try {
    itensInput = z.array(ItemSchema).parse(JSON.parse(parsed.data.itens_json));
  } catch {
    return { error: 'Estrutura de itens inválida.' };
  }
  if (itensInput.length === 0) return { error: 'Adicione pelo menos um EPI à entrega.' };

  const supabase = await createClient();
  // Snapshot da obra atual do funcionário no momento da entrega
  const { data: f } = await supabase
    .from('funcionarios')
    .select('obra_atual_id, status, nome')
    .eq('id', parsed.data.funcionario_id)
    .maybeSingle();
  if (!f) return { error: 'Funcionário não encontrado.' };
  if (f.status === 'desligado') return { error: 'Funcionário desligado — não é possível registrar entrega de EPI.' };
  if (!f.obra_atual_id) {
    return { error: `${f.nome} não tem obra atual — vincule-o a uma obra antes de entregar EPI.` };
  }

  const { data, error } = await supabase.rpc('fn_registrar_entrega_epi', {
    p_funcionario_id: parsed.data.funcionario_id,
    p_obra_id: f.obra_atual_id,
    p_data_entrega: parsed.data.data_entrega,
    p_observacao: parsed.data.observacao ?? null,
    p_itens: itensInput as unknown as Json,
  });
  if (error) return { error: error.message };

  revalidatePath('/epi');
  revalidatePath(`/funcionarios/${parsed.data.funcionario_id}`);
  revalidatePath('/estoque');
  revalidatePath('/itens');
  return { id: data as string };
}
