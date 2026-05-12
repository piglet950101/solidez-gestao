import { PiggyBank, Plus, Pencil } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { excluirVale } from '@/actions/folha';
import { formatBRL, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ValesPage() {
  const supabase = await createClient();
  const { data: vales } = await supabase
    .from('vales')
    .select('*, funcionarios(nome), obras(nome)')
    .order('data', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vales"
        description="Adiantamentos lançados em campo · descontados na próxima folha."
        actions={
          <Button variant="accent" asChild>
            <Link href="/vales/novo">
              <Plus className="size-4" /> Lançar vale
            </Link>
          </Button>
        }
      />

      {!vales?.length ? (
        <EmptyState
          icon={<PiggyBank className="size-10" />}
          title="Sem vales"
          description="Lance vales pelo celular — descontados automaticamente da próxima folha do funcionário."
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <THead>
                <TR>
                  <TH>Data</TH>
                  <TH>Funcionário</TH>
                  <TH>Obra</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Ações</TH>
                </TR>
              </THead>
              <TBody>
                {vales.map((v) => {
                  const f = (v as unknown as { funcionarios: { nome: string } }).funcionarios;
                  const o = (v as unknown as { obras?: { nome: string } }).obras;
                  return (
                    <TR key={v.id}>
                      <TD>{formatDate(v.data)}</TD>
                      <TD className="font-medium">{f?.nome}</TD>
                      <TD>{o?.nome ?? '—'}</TD>
                      <TD className="text-right font-mono font-bold">{formatBRL(v.valor)}</TD>
                      <TD>
                        {v.descontado_em_folha_id ? (
                          <Badge tone="green">descontado</Badge>
                        ) : (
                          <Badge tone="amber">aberto</Badge>
                        )}
                      </TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1">
                          {!v.descontado_em_folha_id && (
                            <>
                              <Button variant="ghost" size="icon" asChild aria-label="Editar">
                                <Link href={`/vales/${v.id}`}>
                                  <Pencil className="size-4" />
                                </Link>
                              </Button>
                              <ConfirmDeleteDialog
                                iconOnly
                                title="Excluir vale"
                                description={`${f?.nome} · ${formatBRL(v.valor)} (${formatDate(v.data)})`}
                                onConfirm={async () => {
                                  'use server';
                                  return await excluirVale(v.id);
                                }}
                              />
                            </>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
                {vales.length === 0 && <TableEmpty>Sem vales registrados.</TableEmpty>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
