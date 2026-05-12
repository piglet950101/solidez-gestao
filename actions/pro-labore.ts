'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { optionalString } from '@/lib/zod-helpers';

const Schema = z.object({
  socio_id: z.string().uuid(),
  obra_id: z.string().uuid(),
  mes_referencia: z.coerce.date(),
  valor_definido: z.coerce.number().positive(),
  observacoes: optionalString,
});

export async function cadastrarProLabore(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { error } = await supabase.from('pro_labore').upsert(
    {
      socio_id: parsed.data.socio_id,
      obra_id: parsed.data.obra_id,
      mes_referencia: parsed.data.mes_referencia.toISOString().slice(0, 10),
      valor_definido: parsed.data.valor_definido,
      observacoes: parsed.data.observacoes,
      status: 'previsto',
    },
    { onConflict: 'socio_id,obra_id,mes_referencia' },
  );
  if (error) return { error: error.message };
  revalidatePath('/pro-labore');
  return {};
}

export async function pagarProLabore(id: string, valorPago: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('pro_labore')
    .update({ valor_pago: valorPago, status: 'pago', data_pagamento: new Date().toISOString().slice(0, 10) })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/pro-labore');
  return {};
}

export async function suspenderProLabore(id: string) {
  const supabase = await createClient();
  await supabase.from('pro_labore').update({ status: 'suspenso' }).eq('id', id);
  revalidatePath('/pro-labore');
}
