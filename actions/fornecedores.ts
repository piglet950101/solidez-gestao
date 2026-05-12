'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { optionalString } from '@/lib/zod-helpers';

const Schema = z.object({
  nome: z.string().min(2).max(100),
  documento: optionalString,
  contato: optionalString,
  email: optionalString,
  observacoes: optionalString,
});

export async function criarFornecedor(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('fornecedores').insert(parsed.data).select('id, nome').single();
  if (error) return { error: error.message };
  revalidatePath('/fornecedores');
  revalidatePath('/compras/nova');
  return { id: data.id, nome: data.nome };
}

export async function atualizarFornecedor(id: string, formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase.from('fornecedores').update(parsed.data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/fornecedores');
  revalidatePath(`/fornecedores/${id}`);
  return {};
}

export async function arquivarFornecedor(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('fornecedores').update({ ativo: false }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/fornecedores');
  return {};
}

export async function excluirFornecedor(id: string) {
  const supabase = await createClient();
  // Block delete if fornecedor has compras
  const { count } = await supabase
    .from('compras')
    .select('id', { count: 'exact', head: true })
    .eq('fornecedor_id', id);
  if ((count ?? 0) > 0) {
    return { error: `Fornecedor tem ${count} compra(s) registrada(s). Arquive em vez de excluir.` };
  }
  const { error } = await supabase.from('fornecedores').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/fornecedores');
  return {};
}
