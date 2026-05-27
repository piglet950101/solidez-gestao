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
  // Fase D: optional obra de admissão — quando informada, cria histórico inicial
  obra_admissao_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
});

export async function criarFuncionario(formData: FormData) {
  const parsed = NovoFuncionarioSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  const supabase = await createClient();
  const { obra_admissao_id, ...rest } = parsed.data;
  const payload = {
    ...rest,
    obra_admissao_id: obra_admissao_id ?? null,
    obra_atual_id: obra_admissao_id ?? null,
    data_admissao: parsed.data.data_admissao?.toISOString().slice(0, 10) ?? null,
    data_desligamento: parsed.data.data_desligamento?.toISOString().slice(0, 10) ?? null,
    os_curso_validade: parsed.data.os_curso_validade?.toISOString().slice(0, 10) ?? null,
  };
  const { data, error } = await supabase.from('funcionarios').insert(payload as never).select('id').single();
  if (error) return { error: error.message };
  // Cria histórico inicial se houver obra_admissao
  if (obra_admissao_id) {
    const dataAdm = parsed.data.data_admissao?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    await supabase.from('funcionario_obra_historico').insert({
      funcionario_id: data.id,
      obra_id: obra_admissao_id,
      data_inicio: dataAdm,
      motivo: 'admissao',
    } as never);
  }
  revalidatePath('/funcionarios');
  return { id: data.id };
}

export async function desligarFuncionario(id: string, dataDesligamento: string) {
  const supabase = await createClient();
  // Usa o RPC se houver obra_atual_id (registra obra_demissao_id + fecha histórico).
  // Senão, fallback pro update direto (compatibilidade com funcionários sem histórico).
  const { data: f } = await supabase.from('funcionarios').select('obra_atual_id').eq('id', id).maybeSingle();
  if (f?.obra_atual_id) {
    const { error } = await supabase.rpc('fn_desligar_funcionario', {
      p_funcionario_id: id,
      p_data_desligamento: dataDesligamento,
      p_observacao: null,
    });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('funcionarios')
      .update({ status: 'desligado', data_desligamento: dataDesligamento })
      .eq('id', id);
    if (error) return { error: error.message };
  }
  revalidatePath('/funcionarios');
  revalidatePath(`/funcionarios/${id}`);
  return {};
}

const TransferirFuncSchema = z.object({
  nova_obra_id: z.string().uuid(),
  data_transferencia: z.string(),
  observacao: optionalString,
});

export async function transferirFuncionario(funcionario_id: string, formData: FormData) {
  const parsed = TransferirFuncSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Dados inválidos.' };
  }
  const supabase = await createClient();
  // Se ainda não tem obra_admissao_id, esse é o primeiro vínculo — registra como admissão
  // em vez de transferência (regra de apropriação fica correta).
  const { data: f } = await supabase
    .from('funcionarios')
    .select('obra_admissao_id, obra_atual_id')
    .eq('id', funcionario_id)
    .maybeSingle();

  if (!f?.obra_admissao_id) {
    // Primeiro vínculo — marca como admissão e fixa obra_admissao_id
    const { error: e1 } = await supabase.from('funcionario_obra_historico').insert({
      funcionario_id,
      obra_id: parsed.data.nova_obra_id,
      data_inicio: parsed.data.data_transferencia,
      motivo: 'admissao',
      observacao: parsed.data.observacao ?? null,
    } as never);
    if (e1) return { error: e1.message };
    const { error: e2 } = await supabase
      .from('funcionarios')
      .update({ obra_admissao_id: parsed.data.nova_obra_id, obra_atual_id: parsed.data.nova_obra_id })
      .eq('id', funcionario_id);
    if (e2) return { error: e2.message };
  } else {
    const { error } = await supabase.rpc('fn_transferir_funcionario', {
      p_funcionario_id: funcionario_id,
      p_nova_obra_id: parsed.data.nova_obra_id,
      p_data_transferencia: parsed.data.data_transferencia,
      p_observacao: parsed.data.observacao ?? null,
    });
    if (error) return { error: error.message };
  }
  revalidatePath('/funcionarios');
  revalidatePath(`/funcionarios/${funcionario_id}`);
  return {};
}

// ---------------------------------------------------------------------------
// Documentos do funcionário (upload via Supabase Storage)

const TIPOS_DOC = [
  'ASO_admissional',
  'ASO_periodico',
  'ASO_demissional',
  'NR01',
  'NR06',
  'NR12',
  'NR18',
  'NR35',
  'contrato_admissional',
  'rescisao',
  'exame_complementar',
  'outro',
] as const;

const DocSchema = z.object({
  tipo: z.enum(TIPOS_DOC),
  descricao: optionalString,
  data_realizacao: z.preprocess(emptyToNull, z.string().nullable().optional()),
  validade: z.preprocess(emptyToNull, z.string().nullable().optional()),
  // Opcional — permite registrar um curso só com as datas, sem anexar arquivo.
  storage_path: optionalString,
});

export async function registrarDocumentoFuncionario(funcionario_id: string, formData: FormData) {
  const parsed = DocSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Dados inválidos.' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('funcionario_documentos').insert({
    funcionario_id,
    tipo: parsed.data.tipo,
    descricao: parsed.data.descricao ?? null,
    data_realizacao: parsed.data.data_realizacao ?? null,
    validade: parsed.data.validade ?? null,
    storage_path: parsed.data.storage_path ?? null,
  } as never);
  if (error) return { error: error.message };
  revalidatePath(`/funcionarios/${funcionario_id}`);
  return {};
}

export async function excluirDocumentoFuncionario(documento_id: string, funcionario_id: string, storage_path: string | null) {
  const supabase = await createClient();
  // Best-effort: remove o arquivo do storage (se houver); mesmo se falhar, remove a linha do DB.
  if (storage_path) await supabase.storage.from('funcionario-docs').remove([storage_path]);
  const { error } = await supabase.from('funcionario_documentos').delete().eq('id', documento_id);
  if (error) return { error: error.message };
  revalidatePath(`/funcionarios/${funcionario_id}`);
  return {};
}

/** Renova / atualiza a data de realização e/ou validade de um documento existente. */
const AtualizarDocSchema = z.object({
  data_realizacao: z.preprocess(emptyToNull, z.string().nullable().optional()),
  validade: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export async function atualizarDocumentoFuncionario(documento_id: string, funcionario_id: string, formData: FormData) {
  const parsed = AtualizarDocSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Dados inválidos.' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('funcionario_documentos')
    .update({
      data_realizacao: parsed.data.data_realizacao ?? null,
      validade: parsed.data.validade ?? null,
    } as never)
    .eq('id', documento_id);
  if (error) return { error: error.message };
  revalidatePath(`/funcionarios/${funcionario_id}`);
  return {};
}

/**
 * Cadastra vários documentos de admissão em uma única operação, todos
 * compartilhando o mesmo arquivo (PDF combinado: contrato + ASO + NRs).
 * Cada entrada é { tipo, data_realizacao, validade } — vazias são ignoradas.
 */
const BulkAdmissaoSchema = z.object({
  storage_path: optionalString,
  docs_json: z.string(),
});

const BulkDocItemSchema = z.object({
  tipo: z.enum(TIPOS_DOC),
  data_realizacao: z.preprocess(emptyToNull, z.string().nullable().optional()),
  validade: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export async function registrarAdmissaoEmLote(funcionario_id: string, formData: FormData) {
  const parsed = BulkAdmissaoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Dados inválidos.' };
  }
  let docsInput: { tipo: string; data_realizacao?: string | null; validade?: string | null }[];
  try {
    docsInput = z.array(BulkDocItemSchema).parse(JSON.parse(parsed.data.docs_json));
  } catch {
    return { error: 'Estrutura de documentos inválida.' };
  }
  // Filtra os preenchidos (com pelo menos data_realizacao ou validade)
  const validos = docsInput.filter((d) => d.data_realizacao || d.validade);
  if (validos.length === 0) {
    return { error: 'Preencha pelo menos uma data de realização ou validade.' };
  }

  const supabase = await createClient();
  const rows = validos.map((d) => ({
    funcionario_id,
    tipo: d.tipo,
    data_realizacao: d.data_realizacao ?? null,
    validade: d.validade ?? null,
    storage_path: parsed.data.storage_path ?? null,
  }));
  const { error } = await supabase.from('funcionario_documentos').insert(rows as never);
  if (error) return { error: error.message };
  revalidatePath(`/funcionarios/${funcionario_id}`);
  return { ok: true, count: validos.length };
}

/** Corrige a obra de admissão de um funcionário (atualiza o snapshot + a linha
 * de histórico marcada como motivo='admissao'). Não cria nova transferência.
 * Útil para funcionários antigos cadastrados antes do controle de obras existir.
 */
const CorrigirAdmissaoSchema = z.object({
  obra_id: z.string().uuid(),
  data_admissao: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export async function corrigirObraAdmissao(funcionario_id: string, formData: FormData) {
  const parsed = CorrigirAdmissaoSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Dados inválidos.' };
  }
  const supabase = await createClient();
  // Atualiza o registro de admissão existente (ou cria, se não houver)
  const { data: existing } = await supabase
    .from('funcionario_obra_historico')
    .select('id')
    .eq('funcionario_id', funcionario_id)
    .eq('motivo', 'admissao')
    .maybeSingle();

  if (existing) {
    const updatePayload: Record<string, unknown> = { obra_id: parsed.data.obra_id };
    if (parsed.data.data_admissao) updatePayload.data_inicio = parsed.data.data_admissao;
    const { error: e1 } = await supabase
      .from('funcionario_obra_historico')
      .update(updatePayload as never)
      .eq('id', existing.id);
    if (e1) return { error: e1.message };
  } else {
    const { error: e1 } = await supabase.from('funcionario_obra_historico').insert({
      funcionario_id,
      obra_id: parsed.data.obra_id,
      data_inicio: parsed.data.data_admissao ?? new Date().toISOString().slice(0, 10),
      motivo: 'admissao',
    } as never);
    if (e1) return { error: e1.message };
  }

  // Atualiza o snapshot na funcionarios
  const updateFunc: Record<string, unknown> = { obra_admissao_id: parsed.data.obra_id };
  // Se ainda não tem obra atual, define a admissao como atual também
  const { data: f } = await supabase
    .from('funcionarios')
    .select('obra_atual_id, data_admissao')
    .eq('id', funcionario_id)
    .maybeSingle();
  if (!f?.obra_atual_id) updateFunc.obra_atual_id = parsed.data.obra_id;
  if (parsed.data.data_admissao && !f?.data_admissao) updateFunc.data_admissao = parsed.data.data_admissao;

  const { error: e2 } = await supabase.from('funcionarios').update(updateFunc as never).eq('id', funcionario_id);
  if (e2) return { error: e2.message };

  revalidatePath(`/funcionarios/${funcionario_id}`);
  return { ok: true };
}
