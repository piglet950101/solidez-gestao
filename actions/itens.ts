'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { optionalString, optionalUuid, emptyToNull } from '@/lib/zod-helpers';

const optNumber = z.preprocess(emptyToNull, z.coerce.number().nullable().optional());

const Schema = z.object({
  nome: z.string().min(2).max(120),
  codigo_interno: optionalString,
  unidade: z.string().min(1).max(10),
  categoria_id: optionalUuid,
  estoque_minimo: optNumber,
  controla_validade: z.coerce.boolean().default(false),
  eh_epi: z.coerce.boolean().default(false),
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

export async function criarItem(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('itens')
    .insert(cleanEmpty(parsed.data) as never)
    .select('id, nome')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/itens');
  revalidatePath('/estoque');
  revalidatePath('/compras/nova');
  return { id: data.id, nome: data.nome };
}

export async function atualizarItem(id: string, formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('itens')
    .update(cleanEmpty(parsed.data) as never)
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/itens');
  revalidatePath(`/itens/${id}`);
  revalidatePath('/estoque');
  return {};
}

export async function arquivarItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('itens').update({ ativo: false }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/itens');
  return {};
}

const AjusteSchema = z.object({
  item_id: z.string().uuid(),
  quantidade: z.coerce.number().positive(),
  tipo: z.enum(['ajuste_positivo', 'ajuste_negativo']),
  observacao: z.string().min(3, 'Justifique o ajuste'),
});

export async function ajusteEstoque(formData: FormData) {
  const parsed = AjusteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  // Read current saldo
  const { data: item } = await supabase
    .from('itens')
    .select('saldo_atual, valor_medio')
    .eq('id', parsed.data.item_id)
    .maybeSingle();
  if (!item) return { error: 'Item não encontrado.' };
  const delta = parsed.data.tipo === 'ajuste_positivo' ? parsed.data.quantidade : -parsed.data.quantidade;
  const novoSaldo = Number(item.saldo_atual) + delta;
  if (novoSaldo < 0) return { error: 'Ajuste deixaria saldo negativo.' };
  const { error: e1 } = await supabase.from('itens').update({ saldo_atual: novoSaldo } as never).eq('id', parsed.data.item_id);
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase.from('itens_movimentacoes').insert({
    item_id: parsed.data.item_id,
    tipo: parsed.data.tipo,
    quantidade: parsed.data.quantidade,
    valor_unitario: item.valor_medio ?? null,
    origem_tipo: 'ajuste_manual',
    observacao: parsed.data.observacao,
  } as never);
  if (e2) return { error: e2.message };
  revalidatePath('/estoque');
  revalidatePath(`/itens/${parsed.data.item_id}`);
  return {};
}
