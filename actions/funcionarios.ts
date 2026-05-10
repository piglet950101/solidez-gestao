'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const NovoFuncionarioSchema = z.object({
  nome: z.string().min(2),
  cpf: z.string().nullable().optional(),
  rg: z.string().nullable().optional(),
  chave_pix: z.string().nullable().optional(),
  contato: z.string().nullable().optional(),
  cargo: z.string().nullable().optional(),
  tipo_contrato: z.enum(['clt', 'horista', 'empreitada', 'temporario']),
  salario_hora: z.coerce.number().nullable().optional(),
  salario_mes: z.coerce.number().nullable().optional(),
  data_admissao: z.coerce.date().nullable().optional(),
  data_desligamento: z.coerce.date().nullable().optional(),
  registrado: z.coerce.boolean().default(false),
  tem_os_curso: z.coerce.boolean().default(false),
  os_curso_validade: z.coerce.date().nullable().optional(),
  tamanho_sapato: z.string().nullable().optional(),
  tamanho_camiseta: z.string().nullable().optional(),
  tamanho_calca: z.string().nullable().optional(),
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
