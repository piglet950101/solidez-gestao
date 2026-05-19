import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FuncionarioForm } from '../form';
import { DesligarFuncionarioDialog } from '@/components/funcionarios/desligar-dialog';
import { VinculoObraCard } from './vinculo-obra';
import { DocumentosFuncionario } from './documentos';
import { EpiHistoricoFuncionario } from './epi';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function EditarFuncionarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: funcionario }, { data: obras }, { data: historicoRaw }, { data: documentos }, { data: entregasEpi }] = await Promise.all([
    supabase.from('funcionarios').select('*').eq('id', id).maybeSingle(),
    supabase.from('obras').select('id, nome, status').order('nome'),
    supabase
      .from('funcionario_obra_historico')
      .select('id, obra_id, data_inicio, data_fim, motivo, obras(nome)')
      .eq('funcionario_id', id)
      .order('data_inicio', { ascending: false }),
    supabase
      .from('funcionario_documentos')
      .select('id, tipo, descricao, storage_path, validade, criado_em')
      .eq('funcionario_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('epi_entregas')
      .select('id, data_entrega, obra_id, observacao, obras(nome), epi_entrega_itens(id, item_id, quantidade, numero_ca, validade, lote, motivo, itens(nome, unidade, valor_medio))')
      .eq('funcionario_id', id)
      .order('data_entrega', { ascending: false }),
  ]);
  if (!funcionario) notFound();

  const desligado = funcionario.status === 'desligado';

  type ObraRef = { id: string; nome: string; status?: string };
  const obrasList = (obras ?? []) as ObraRef[];
  const obrasAtivas = obrasList.filter((o) => o.status === 'ativa');
  const obraNomeById = (oid: string | null | undefined) => (oid ? obrasList.find((o) => o.id === oid)?.nome ?? null : null);
  const fAny = funcionario as unknown as { obra_admissao_id: string | null; obra_atual_id: string | null; obra_demissao_id: string | null };

  type HistRow = { id: string; obra_id: string; data_inicio: string; data_fim: string | null; motivo: 'admissao' | 'transferencia' | 'demissao'; obras: { nome: string } | null };
  const historico = ((historicoRaw ?? []) as unknown as HistRow[]).map((h) => ({
    id: h.id,
    obra_id: h.obra_id,
    data_inicio: h.data_inicio,
    data_fim: h.data_fim,
    motivo: h.motivo,
    obra_nome: h.obras?.nome ?? '—',
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/funcionarios"
        className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900"
      >
        <ArrowLeft className="size-3.5" /> voltar para funcionários
      </Link>
      <PageHeader
        title={funcionario.nome}
        description={
          desligado
            ? `Desligado em ${formatDate(funcionario.data_desligamento)} · ${funcionario.cargo ?? 'sem cargo'}`
            : `Editar cadastro · ${funcionario.cargo ?? 'sem cargo'}`
        }
        actions={
          desligado ? (
            <Badge tone="red">Desligado</Badge>
          ) : (
            <DesligarFuncionarioDialog
              funcionarioId={funcionario.id}
              funcionarioNome={funcionario.nome}
            />
          )
        }
      />

      <VinculoObraCard
        funcionarioId={funcionario.id}
        funcionarioStatus={funcionario.status}
        obraAdmissaoNome={obraNomeById(fAny.obra_admissao_id)}
        obraAtualNome={obraNomeById(fAny.obra_atual_id)}
        obraDemissaoNome={obraNomeById(fAny.obra_demissao_id)}
        historico={historico}
        obras={obrasAtivas.map((o) => ({ id: o.id, nome: o.nome }))}
      />

      <DocumentosFuncionario
        funcionarioId={funcionario.id}
        documentos={(documentos ?? []) as { id: string; tipo: string; descricao: string | null; storage_path: string; validade: string | null; criado_em: string }[]}
      />

      <EpiHistoricoFuncionario
        funcionarioId={funcionario.id}
        entregas={(entregasEpi ?? []) as never}
        status={funcionario.status}
      />

      <Card>
        <CardContent className="py-6">
          <FuncionarioForm funcionario={funcionario} />
        </CardContent>
      </Card>
    </div>
  );
}
