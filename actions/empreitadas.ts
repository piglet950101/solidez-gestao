'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Schema = z.object({
  obra_id: z.string().uuid(),
  descricao: z.string().min(2).max(200),
  valor_total: z.coerce.number().positive(),
  cabeca_funcionario_id: z.string().uuid(),
  data_inicio: z.coerce.date(),
  observacoes: z.string().max(500).optional().nullable(),
});

export async function criarEmpreitada(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('empreitadas')
    .insert({
      ...parsed.data,
      data_inicio: parsed.data.data_inicio.toISOString().slice(0, 10),
    })
    .select('id')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/empreitadas');
  return { id: data.id };
}

const PagSchema = z.object({
  empreitada_id: z.string().uuid(),
  data: z.coerce.date(),
  valor: z.coerce.number().positive(),
  observacoes: z.string().max(200).optional().nullable(),
});

export async function registrarPagamento(formData: FormData) {
  const parsed = PagSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase.from('empreitada_pagamentos').insert({
    empreitada_id: parsed.data.empreitada_id,
    data: parsed.data.data.toISOString().slice(0, 10),
    valor: parsed.data.valor,
  });
  if (error) return { error: error.message };
  revalidatePath(`/empreitadas/${parsed.data.empreitada_id}`);
  return {};
}

export async function concluirEmpreitada(id: string) {
  const supabase = await createClient();
  await supabase
    .from('empreitadas')
    .update({ status: 'concluida', data_conclusao: new Date().toISOString().slice(0, 10) })
    .eq('id', id);
  revalidatePath('/empreitadas');
  revalidatePath(`/empreitadas/${id}`);
}
