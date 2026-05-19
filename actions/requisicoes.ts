'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { optionalString } from '@/lib/zod-helpers';
import type { Json } from '@/types/database';

const ItemSchema = z.object({
  item_id: z.string().uuid(),
  quantidade: z.coerce.number().positive(),
  observacao: optionalString,
});

const NovaRequisicaoSchema = z.object({
  obra_id: z.string().uuid(),
  observacao: optionalString,
  itens_json: z.string(),
});

export async function criarRequisicao(formData: FormData) {
  const parsed = NovaRequisicaoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Dados inválidos.' };
  }
  let itensInput: { item_id: string; quantidade: number; observacao?: string | null }[];
  try {
    itensInput = z.array(ItemSchema).parse(JSON.parse(parsed.data.itens_json));
  } catch {
    return { error: 'Estrutura de itens inválida.' };
  }
  if (itensInput.length === 0) return { error: 'Adicione pelo menos um item à requisição.' };

  const supabase = await createClient();
  const { data: req, error: e1 } = await supabase
    .from('requisicoes')
    .insert({
      obra_id: parsed.data.obra_id,
      observacao: parsed.data.observacao ?? null,
    } as never)
    .select('id')
    .single();
  if (e1) return { error: e1.message };

  const rows = itensInput.map((i) => ({
    requisicao_id: req.id,
    item_id: i.item_id,
    quantidade_pedida: i.quantidade,
    observacao: i.observacao ?? null,
  }));
  const { error: e2 } = await supabase.from('requisicao_itens').insert(rows as never);
  if (e2) return { error: e2.message };

  revalidatePath('/requisicoes');
  return { id: req.id };
}

const AtenderSchema = z.object({
  itens_json: z.string(),
});

export async function atenderRequisicao(requisicao_id: string, formData: FormData) {
  const parsed = AtenderSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: 'Dados inválidos.' };
  let itensInput: { item_id: string; quantidade: number; observacao?: string | null }[];
  try {
    itensInput = z.array(ItemSchema).parse(JSON.parse(parsed.data.itens_json));
  } catch {
    return { error: 'Estrutura de itens inválida.' };
  }
  const atender = itensInput.filter((i) => i.quantidade > 0);
  if (atender.length === 0) return { error: 'Informe pelo menos uma quantidade a atender.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('fn_atender_requisicao', {
    p_requisicao_id: requisicao_id,
    p_itens: atender as unknown as Json,
  });
  if (error) return { error: error.message };

  revalidatePath('/requisicoes');
  revalidatePath(`/requisicoes/${requisicao_id}`);
  revalidatePath('/estoque');
  revalidatePath('/itens');
  return {};
}

export async function cancelarRequisicao(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('requisicoes')
    .update({ status: 'cancelada' } as never)
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/requisicoes');
  revalidatePath(`/requisicoes/${id}`);
  return {};
}
