'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { brlToNumber } from '@/lib/format';
import type { Json } from '@/types/database';

const Schema = z.object({
  valor: z.string().min(1),
  obra_id: z.string().uuid(),
  categoria_id: z.string().uuid(),
});

export async function capturaRapida(formData: FormData): Promise<{ id?: string; error?: string }> {
  const parsed = Schema.safeParse({
    valor: formData.get('valor'),
    obra_id: formData.get('obra_id'),
    categoria_id: formData.get('categoria_id'),
  });
  if (!parsed.success) return { error: 'Preencha valor, obra e categoria.' };

  const valor = brlToNumber(parsed.data.valor);
  if (valor <= 0) return { error: 'Valor inválido.' };

  const supabase = await createClient();
  const { data: obra } = await supabase
    .from('obras')
    .select('empresa_id')
    .eq('id', parsed.data.obra_id)
    .maybeSingle();
  if (!obra) return { error: 'Obra não encontrada.' };

  const foto = formData.get('foto');
  let foto_url: string | null = null;
  if (foto instanceof File && foto.size > 0) {
    const filename = `compras/${crypto.randomUUID()}-${foto.name.replace(/[^a-z0-9.-]/gi, '_')}`;
    const { error: upErr } = await supabase.storage.from('notas').upload(filename, foto, {
      cacheControl: '3600',
      upsert: false,
      contentType: foto.type,
    });
    if (!upErr) {
      const { data: signed } = await supabase.storage.from('notas').createSignedUrl(filename, 60 * 60 * 24 * 365);
      foto_url = signed?.signedUrl ?? null;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const due = new Date();
  due.setDate(due.getDate() + 30);

  const { data, error } = await supabase.rpc('fn_criar_compra', {
    p_empresa_id: obra.empresa_id,
    p_fornecedor_id: null,
    p_categoria_id: parsed.data.categoria_id,
    p_descricao: 'Captura mobile',
    p_valor_total: valor,
    p_data_compra: today,
    p_rateio_modo: 'igual',
    p_quem_pagou: 'empresa',
    p_pago_por_socio_id: null,
    p_pago_por_funcionario_id: null,
    p_formato_pagamento: null,
    p_foto_nota_url: foto_url,
    p_alocacoes: [{ obra_id: parsed.data.obra_id, valor_alocado: valor, percentual_alocado: 100 }] as unknown as Json,
    p_parcelas: [{ data_vencimento: due.toISOString().slice(0, 10), valor }] as unknown as Json,
  });

  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/compras');
  return { id: data as string };
}
