'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { optionalString } from '@/lib/zod-helpers';

const ItemSchema = z.object({
  item_id: z.string().uuid(),
  quantidade: z.coerce.number().positive(),
});

const Schema = z.object({
  obra_id: z.string().uuid(),
  observacao: optionalString,
  itens_json: z.string(),
});

/**
 * Saída direta de estoque pra uma obra (sem o fluxo de requisição).
 * Cada item baixa do estoque (validando saldo) e o custo cai no centro de
 * custo da obra via itens_movimentacoes (tipo='saida_obra', com valor_medio).
 */
export async function saidaDiretaEstoque(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Dados inválidos.' };
  }
  let itensInput: { item_id: string; quantidade: number }[];
  try {
    itensInput = z.array(ItemSchema).parse(JSON.parse(parsed.data.itens_json));
  } catch {
    return { error: 'Estrutura de itens inválida.' };
  }
  if (itensInput.length === 0) return { error: 'Adicione pelo menos um item.' };

  const supabase = await createClient();
  // Processa cada item via RPC (valida saldo individualmente).
  for (const it of itensInput) {
    const { error } = await supabase.rpc('fn_dar_saida_estoque', {
      p_item_id: it.item_id,
      p_quantidade: it.quantidade,
      p_tipo: 'saida_obra',
      p_obra_id: parsed.data.obra_id,
      p_origem_tipo: 'saida_direta',
      p_origem_id: null as unknown as string,
      p_observacao: parsed.data.observacao ?? null,
    });
    if (error) {
      // Para no primeiro erro de saldo, informando qual item.
      const { data: item } = await supabase.from('itens').select('nome').eq('id', it.item_id).maybeSingle();
      return { error: `${item?.nome ?? 'Item'}: ${error.message}` };
    }
  }

  revalidatePath('/estoque');
  revalidatePath('/itens');
  return { ok: true };
}
