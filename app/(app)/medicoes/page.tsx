import Link from 'next/link';
import { FileBarChart, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBRL, formatDate } from '@/lib/format';
import { RecebimentoDialog } from '@/components/medicoes/recebimento-dialog';

export const dynamic = 'force-dynamic';

export default async function MedicoesPage({
  searchParams,
}: {
  searchParams: Promise<{ obra?: string }>;
}) {
  const { obra } = await searchParams;
  const supabase = await createClient();

  const query = supabase
    .from('medicoes')
    .select('*, obras(id, nome, com_permuta), recebimentos(valor, tipo)')
    .order('data_emissao', { ascending: false });

  const { data: medicoes } = obra ? await query.eq('obra_id', obra) : await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medições"
        description="Lançamentos de medição com nota fiscal, valor líquido e tipo de recebimento."
        actions={
          <Button variant="accent" asChild>
            <Link href="/medicoes/nova">
              <Plus className="size-4" /> Nova medição
            </Link>
          </Button>
        }
      />

      {!medicoes?.length ? (
        <EmptyState
          icon={<FileBarChart className="size-10" />}
          title="Sem medições registradas"
          description="A medição é o documento que vira receita da obra. Cadastre quando emitir a NF."
          action={
            <Button variant="accent" asChild>
              <Link href="/medicoes/nova">Lançar medição</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <THead>
                <TR>
                  <TH>Obra</TH>
                  <TH>#</TH>
                  <TH>Emissão</TH>
                  <TH>Nota fiscal</TH>
                  <TH className="text-right">Bruto</TH>
                  <TH className="text-right">Líquido</TH>
                  <TH className="text-right">Recebido</TH>
                  <TH>Tipos</TH>
                  <TH className="text-right">Ações</TH>
                </TR>
              </THead>
              <TBody>
                {medicoes.map((m) => {
                  const recs = (m as unknown as { recebimentos: { valor: number; tipo: string }[] }).recebimentos;
                  const obra = (m as unknown as { obras: { id: string; nome: string; com_permuta: boolean } }).obras;
                  const recebido = recs?.reduce((s, r) => s + Number(r.valor), 0) ?? 0;
                  const temPermuta = recs?.some((r) => r.tipo === 'permuta') ?? false;
                  return (
                    <TR key={m.id}>
                      <TD>
                        <Link href={`/obras/${obra?.id}`} className="font-medium text-brand-900 hover:underline">
                          {obra?.nome}
                        </Link>
                      </TD>
                      <TD className="font-mono text-xs">#{m.num_medicao}</TD>
                      <TD>{formatDate(m.data_emissao)}</TD>
                      <TD className="font-mono text-xs">{m.num_nota_fiscal ?? '—'}</TD>
                      <TD className="text-right font-mono">{formatBRL(m.valor_bruto)}</TD>
                      <TD className="text-right font-mono font-bold">{formatBRL(m.valor_liquido)}</TD>
                      <TD className="text-right font-mono text-emerald-700">{formatBRL(recebido)}</TD>
                      <TD className="space-x-1">
                        {temPermuta ? <Badge tone="accent">★ permuta</Badge> : null}
                        {recebido < Number(m.valor_liquido) ? <Badge tone="amber">parcial</Badge> : null}
                      </TD>
                      <TD className="text-right">
                        <RecebimentoDialog
                          medicaoId={m.id}
                          medicaoLabel={`${obra?.nome ?? ''} · medição #${m.num_medicao}`}
                          valorLiquido={Number(m.valor_liquido)}
                          jaRecebido={recebido}
                        />
                      </TD>
                    </TR>
                  );
                })}
                {medicoes.length === 0 && <TableEmpty>Sem medições.</TableEmpty>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
