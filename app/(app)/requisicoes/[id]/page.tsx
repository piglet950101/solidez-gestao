import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AtenderRequisicaoForm } from './form';
import { formatDate, formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; tone: 'green' | 'amber' | 'neutral' | 'red' | 'brand' }> = {
  aberta: { label: 'aberta', tone: 'amber' },
  parcialmente_atendida: { label: 'parcialmente atendida', tone: 'brand' },
  atendida: { label: 'atendida', tone: 'green' },
  cancelada: { label: 'cancelada', tone: 'red' },
};

export default async function RequisicaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: req } = await supabase
    .from('requisicoes')
    .select('id, obra_id, status, data_solicitacao, data_atendimento, observacao, obras(nome), requisicao_itens(id, item_id, quantidade_pedida, quantidade_atendida, observacao, itens(id, nome, unidade, saldo_atual, valor_medio))')
    .eq('id', id)
    .maybeSingle();
  if (!req) notFound();

  type Linha = {
    id: string;
    item_id: string;
    quantidade_pedida: number;
    quantidade_atendida: number;
    observacao: string | null;
    itens: { id: string; nome: string; unidade: string; saldo_atual: number; valor_medio: number | null } | null;
  };
  type Req = {
    id: string;
    obra_id: string;
    status: keyof typeof STATUS_LABEL;
    data_solicitacao: string;
    data_atendimento: string | null;
    observacao: string | null;
    obras: { nome: string } | null;
    requisicao_itens: Linha[];
  };
  const r = req as unknown as Req;
  const status = STATUS_LABEL[r.status] ?? STATUS_LABEL.aberta!;
  const linhasPendentes = r.requisicao_itens.filter((l) => Number(l.quantidade_pedida) > Number(l.quantidade_atendida));
  const canAtender = r.status !== 'cancelada' && r.status !== 'atendida' && linhasPendentes.length > 0;

  return (
    <div className="space-y-6">
      <Link href="/requisicoes" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900">
        <ArrowLeft className="size-3.5" /> voltar para requisições
      </Link>
      <PageHeader
        title={`Requisição · ${r.obras?.nome ?? '—'}`}
        description={`Solicitada em ${formatDate(r.data_solicitacao)}${r.data_atendimento ? ` · atendida em ${formatDate(r.data_atendimento)}` : ''}`}
        actions={<Badge tone={status.tone}>{status.label}</Badge>}
      />

      {r.observacao ? (
        <Card>
          <CardContent className="py-4 text-sm text-brand-700">{r.observacao}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Itens da requisição</CardTitle>
          <span className="text-xs text-brand-500">
            {r.requisicao_itens.length} item(s) · {linhasPendentes.length} pendente(s) de atendimento
          </span>
        </CardHeader>
        <CardContent className="py-6">
          {canAtender ? (
            <AtenderRequisicaoForm
              requisicaoId={r.id}
              linhas={r.requisicao_itens.map((l) => ({
                id: l.id,
                item_id: l.item_id,
                nome: l.itens?.nome ?? '—',
                unidade: l.itens?.unidade ?? '',
                saldo_atual: Number(l.itens?.saldo_atual ?? 0),
                valor_medio: l.itens?.valor_medio != null ? Number(l.itens.valor_medio) : null,
                quantidade_pedida: Number(l.quantidade_pedida),
                quantidade_atendida: Number(l.quantidade_atendida),
              }))}
            />
          ) : (
            <ul className="divide-y divide-brand-100 text-sm">
              {r.requisicao_itens.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2">
                  <span className="text-brand-900">{l.itens?.nome ?? '—'}</span>
                  <span className="font-mono text-brand-700">
                    {Number(l.quantidade_atendida)} / {Number(l.quantidade_pedida)} {l.itens?.unidade}
                    {l.itens?.valor_medio != null ? ` · ${formatBRL(Number(l.quantidade_atendida) * Number(l.itens.valor_medio))}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
