'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function resolverAlerta(id: string) {
  const supabase = await createClient();
  await supabase.from('alertas').update({ resolvido_em: new Date().toISOString() }).eq('id', id);
  revalidatePath('/alertas');
  revalidatePath('/');
}
