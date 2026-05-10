import Link from 'next/link';
import { Banknote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBRL, formatMonthRef } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function FolhaPage() {
  const supabase = await createClient();
  const { data: lancamentos } = await supabase
    .from('lancamentos_folha')
    .select('*, funcionarios(nome, tipo_contrato), obras(nome)')
    .order('mes_referencia', { ascending: false })
    .order('funcionario_id');

  const grupos = (lancamentos ?? []).reduce<Record<string, typeof lancamentos>>((acc, l) => {
    const key = l.mes_referencia.slice(0, 7);
    (acc[key] ??= []).push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Folha"
        description="Folha por hora e mensal · vales descontados automaticamente · comissões somadas no fechamento."
        actions={
          <Button variant="accent" asChild>
            <Link href="/folha/novo">Lançar folha</Link>
          </Button>
        }
      />

      {!lancamentos?.length ? (
        <EmptyState
          icon={<Banknote className="size-10" />}
          title="Sem lançamentos de folha"
          description="Abra o fechamento do mês para registrar dias trabalhados, vales e comissões."
        />
      ) : (
        Object.entries(grupos).map(([mes, items]) => (
          <Card key={mes}>
            <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-brand-600">{formatMonthRef(mes + '-01')}</h3>
              <span className="text-xs text-brand-500">{items?.length} lançamentos</span>
            </div>
            <CardContent className="px-0 py-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Funcionário</TH>
                    <TH>Obra</TH>
                    <TH>Contrato</TH>
                    <TH className="text-right">Horas</TH>
                    <TH className="text-right">Comissão</TH>
                    <TH className="text-right">Vales</TH>
                    <TH className="text-right">Líquido</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {items?.map((l) => {
                    const f = (l as unknown as { funcionarios: { nome: string; tipo_contrato: string } }).funcionarios;
                    const o = (l as unknown as { obras: { nome: string } }).obras;
                    return (
                      <TR key={l.id}>
                        <TD className="font-medium">{f?.nome}</TD>
                        <TD>{o?.nome}</TD>
                        <TD className="text-xs uppercase tracking-wide text-brand-500">{f?.tipo_contrato}</TD>
                        <TD className="text-right font-mono">{l.total_horas}</TD>
                        <TD className="text-right font-mono">{formatBRL(l.valor_comissao)}</TD>
                        <TD className="text-right font-mono text-red-600">{formatBRL(l.valor_vales)}</TD>
                        <TD className="text-right font-mono font-bold">{formatBRL(l.valor_liquido)}</TD>
                        <TD>
                          <Badge tone={l.status === 'paga' ? 'green' : l.status === 'fechada' ? 'brand' : 'amber'}>
                            {l.status}
                          </Badge>
                        </TD>
                      </TR>
                    );
                  })}
                  {!items?.length && <TableEmpty>Sem lançamentos.</TableEmpty>}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
