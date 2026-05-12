'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { optionalString, emptyToNull } from '@/lib/zod-helpers';

const optNumber = z.preprocess(emptyToNull, z.coerce.number().nullable().optional());
const optDate = z.preprocess(emptyToNull, z.coerce.date().nullable().optional());

const NovoFuncionarioSchema = z.object({
  nome: z.string().min(2),
  cpf: optionalString,
  rg: optionalString,
  chave_pix: optionalString,
  contato: optionalString,
  cargo: optionalString,
  tipo_contrato: z.enum(['clt', 'horista', 'empreitada', 'temporario']),
  salario_hora: optNumber,
  salario_mes: optNumber,
  data_admissao: optDate,
  data_desligamento: optDate,
  registrado: z.coerce.boolean().default(false),
  tem_os_curso: z.coerce.boolean().default(false),
  os_curso_validade: optDate,
  tamanho_sapato: optionalString,
  tamanho_camiseta: optionalString,
  tamanho_calca: optionalString,
  cabeca_de_empreitada: z.coerce.boolean().default(false),
});

export async function criarFuncionario(formData: FormData) {
  const parsed = NovoFuncionarioSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    data_admissao: parsed.data.data_admissao?.toISOString().slice(0, 10) ?? null,
    data_desligamento: parsed.data.data_desligamento?.toISOString().slice(0, 10) ?? null,
    os_curso_validade: parsed.data.os_curso_validade?.toISOString().slice(0, 10) ?? null,
  };
  const { data, error } = await supabase.from('funcionarios').insert(payload).select('id').single();
  if (error) return { error: error.message };
  revalidatePath('/funcionarios');
  return { id: data.id };
}

export async function desligarFuncionario(id: string, dataDesligamento: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('funcionarios')
    .update({ status: 'desligado', data_desligamento: dataDesligamento })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/funcionarios');
  return {};
}
