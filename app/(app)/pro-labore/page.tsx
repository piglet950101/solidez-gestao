import Link from 'next/link';
import { PiggyBank, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ProLaborePagarDialog } from '@/components/pro-labore/pagar-dialog';
import { formatBRL, formatMonthRef } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ProLaborePage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from('pro_labore')
    .select('*, socios(nome), obras(nome)')
    .order('mes_referencia', { ascending: false })
    .order('socio_id');

  const grupos = (items ?? []).reduce<Record<string, typeof items>>((acc, p) => {
    const key = p.mes_referencia.slice(0, 7);
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pró-labore"
        description="Pró-labore mensal por sócio e obra. Editável quando a obra está no vermelho — ajuste valor pago no fim do mês."
        actions={
          <Button variant="accent" asChild>
            <Link href="/pro-labore/novo"><Plus className="size-4" /> Cadastrar pró-labore</Link>
          </Button>
        }
      />

      {!items?.length ? (
        <EmptyState
          icon={<PiggyBank className="size-10" />}
          title="Sem pró-labore cadastrado"
          description="Cadastre o valor previsto por sócio e mês. No fim do mês, marca o valor que foi efetivamente pago."
        />
      ) : (
        Object.entries(grupos).map(([mes, list]) => (
          <Card key={mes}>
            <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-brand-600">{formatMonthRef(mes + '-01')}</h3>
              <span className="text-xs text-brand-500">{list?.length} lançamentos</span>
            </div>
            <CardContent className="px-0 py-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Sócio</TH>
                    <TH>Obra</TH>
                    <TH className="text-right">Previsto</TH>
                    <TH className="text-right">Pago</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Ações</TH>
                  </TR>
                </THead>
                <TBody>
                  {list?.map((p) => {
                    const s = (p as unknown as { socios: { nome: string } }).socios;
                    const o = (p as unknown as { obras: { nome: string } }).obras;
                    return (
                      <TR key={p.id}>
                        <TD className="font-medium">{s?.nome}</TD>
                        <TD>{o?.nome}</TD>
                        <TD className="text-right font-mono">{formatBRL(p.valor_definido)}</TD>
                        <TD className="text-right font-mono text-emerald-700">{p.valor_pago != null ? formatBRL(p.valor_pago) : '—'}</TD>
                        <TD>
                          <Badge tone={p.status === 'pago' ? 'green' : p.status === 'suspenso' ? 'red' : 'amber'}>
                            {p.status}
                          </Badge>
                        </TD>
                        <TD className="text-right">
                          {p.status !== 'pago' ? (
                            <ProLaborePagarDialog id={p.id} valorPrevisto={Number(p.valor_definido)} />
                          ) : (
                            <span className="text-xs text-brand-400">pago</span>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                  {!list?.length && <TableEmpty>Sem lançamentos.</TableEmpty>}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
