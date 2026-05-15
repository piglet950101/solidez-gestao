import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ItemForm } from '../form';
import { formatBRL, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TIPO_LABEL: Record<string, string> = {
  entrada_compra: 'Entrada (compra)',
  saida_requisicao: 'Saída (requisição)',
  saida_epi: 'Saída (EPI)',
  ajuste_positivo: 'Ajuste +',
  ajuste_negativo: 'Ajuste −',
  devolucao: 'Devolução',
};

export default async function ItemDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: item }, { data: categorias }, { data: movimentacoes }] = await Promise.all([
    supabase.from('itens').select('*').eq('id', id).maybeSingle(),
    supabase.from('categorias').select('id, nome').eq('tipo', 'despesa').eq('ativo', true).order('ordem'),
    supabase
      .from('itens_movimentacoes')
      .select('id, tipo, quantidade, valor_unitario, obra_id, observacao, criado_em, obras(nome)')
      .eq('item_id', id)
      .order('criado_em', { ascending: false })
      .limit(100),
  ]);
  if (!item) notFound();

  type MovRow = {
    id: string;
    tipo: string;
    quantidade: number;
    valor_unitario: number | null;
    obra_id: string | null;
    observacao: string | null;
    criado_em: string;
    obras: { nome: string } | null;
  };
  const movs = (movimentacoes ?? []) as unknown as MovRow[];

  return (
    <div className="space-y-6">
      <Link href="/itens" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900">
        <ArrowLeft className="size-3.5" /> voltar para itens
      </Link>
      <PageHeader
        title={item.nome}
        description={`${item.unidade} · saldo atual ${Number(item.saldo_atual)} · custo médio ${item.valor_medio != null ? formatBRL(item.valor_medio) : '—'}`}
      />

      <Card>
        <CardContent className="py-6">
          <ItemForm categorias={categorias ?? []} item={item as never} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de movimentação</CardTitle>
          <span className="text-xs text-brand-500">Últimas 100 movimentações.</span>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {movs.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-brand-500">Sem movimentações.</div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Quando</TH>
                  <TH>Tipo</TH>
                  <TH className="text-right">Quantidade</TH>
                  <TH className="text-right">Valor unitário</TH>
                  <TH>Obra</TH>
                  <TH>Observação</TH>
                </TR>
              </THead>
              <TBody>
                {movs.map((m) => {
                  const isEntrada = m.tipo === 'entrada_compra' || m.tipo === 'ajuste_positivo' || m.tipo === 'devolucao';
                  return (
                    <TR key={m.id}>
                      <TD className="font-mono text-xs">{formatDate(m.criado_em)}</TD>
                      <TD>
                        <Badge tone={isEntrada ? 'green' : 'red'}>{TIPO_LABEL[m.tipo] ?? m.tipo}</Badge>
                      </TD>
                      <TD className="text-right font-mono">{isEntrada ? '+' : '−'}{Number(m.quantidade)}</TD>
                      <TD className="text-right font-mono">{m.valor_unitario != null ? formatBRL(m.valor_unitario) : '—'}</TD>
                      <TD>{m.obras?.nome ?? '—'}</TD>
                      <TD className="text-xs text-brand-600">{m.observacao ?? '—'}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
