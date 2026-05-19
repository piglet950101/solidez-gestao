import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; tone: 'green' | 'amber' | 'neutral' | 'red' | 'brand' }> = {
  aberta: { label: 'aberta', tone: 'amber' },
  parcialmente_atendida: { label: 'parcial', tone: 'brand' },
  atendida: { label: 'atendida', tone: 'green' },
  cancelada: { label: 'cancelada', tone: 'red' },
};

export default async function RequisicoesPage() {
  const supabase = await createClient();
  const { data: requisicoes } = await supabase
    .from('requisicoes')
    .select('id, obra_id, status, data_solicitacao, observacao, obras(nome), requisicao_itens(quantidade_pedida, quantidade_atendida)')
    .order('data_solicitacao', { ascending: false })
    .limit(200);

  type Row = {
    id: string;
    obra_id: string;
    status: keyof typeof STATUS_LABEL;
    data_solicitacao: string;
    observacao: string | null;
    obras: { nome: string } | null;
    requisicao_itens: { quantidade_pedida: number; quantidade_atendida: number }[];
  };
  const rows = (requisicoes ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requisições"
        description="Pedidos de material do mestre na obra. O almoxarife/escritório atende e o estoque baixa automaticamente."
        actions={
          <Button variant="accent" asChild>
            <Link href="/requisicoes/nova"><Plus className="size-4" /> Nova requisição</Link>
          </Button>
        }
      />

      {!rows.length ? (
        <EmptyState
          icon={<ClipboardList className="size-10" />}
          title="Sem requisições"
          description="Quando o mestre pedir material pelo celular, vai aparecer aqui — com botão de atender que dá baixa no estoque automático."
          action={
            <Button variant="accent" asChild>
              <Link href="/requisicoes/nova">Criar primeira</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <THead>
                <TR>
                  <TH>Quando</TH>
                  <TH>Obra</TH>
                  <TH className="text-right">Itens</TH>
                  <TH className="text-right">Atendidos</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Ações</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => {
                  const totalPedido = r.requisicao_itens.reduce((s, i) => s + Number(i.quantidade_pedida), 0);
                  const totalAtendido = r.requisicao_itens.reduce((s, i) => s + Number(i.quantidade_atendida), 0);
                  const status = STATUS_LABEL[r.status] ?? STATUS_LABEL.aberta!;
                  return (
                    <TR key={r.id}>
                      <TD className="font-mono text-xs">{formatDate(r.data_solicitacao)}</TD>
                      <TD>{r.obras?.nome ?? '—'}</TD>
                      <TD className="text-right font-mono">{r.requisicao_itens.length}</TD>
                      <TD className="text-right font-mono">{totalAtendido.toFixed(2)} / {totalPedido.toFixed(2)}</TD>
                      <TD><Badge tone={status.tone}>{status.label}</Badge></TD>
                      <TD className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/requisicoes/${r.id}`}>Ver / atender</Link>
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
                {rows.length === 0 && <TableEmpty>Sem requisições.</TableEmpty>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
