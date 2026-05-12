import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBRL, formatDate, formatMonthRef } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ImpostosPage() {
  const supabase = await createClient();
  const { data: impostos } = await supabase
    .from('impostos')
    .select('*, empresas(nome), imposto_alocacoes(valor, obras(nome))')
    .order('mes_referencia', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impostos"
        description="Boletos chegam no CNPJ e são rateados por obra quando o contador detalha."
        actions={
          <Button variant="accent" asChild>
            <Link href="/impostos/novo">Lançar imposto</Link>
          </Button>
        }
      />

      {!impostos?.length ? (
        <EmptyState
          icon={<Receipt className="size-10" />}
          title="Sem impostos lançados"
          description="Lance o boleto inicial assim que chegar do contador. O rateio por obra entra na etapa 2."
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <THead>
                <TR>
                  <TH>Mês ref.</TH>
                  <TH>Empresa</TH>
                  <TH>Boleto</TH>
                  <TH>Vencimento</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Status</TH>
                  <TH>Rateio</TH>
                  <TH className="text-right">Ações</TH>
                </TR>
              </THead>
              <TBody>
                {impostos.map((i) => {
                  const empresa = (i as unknown as { empresas: { nome: string } }).empresas;
                  const aloc = (i as unknown as { imposto_alocacoes: { valor: number; obras: { nome: string } }[] }).imposto_alocacoes;
                  return (
                    <TR key={i.id}>
                      <TD className="font-mono">{formatMonthRef(i.mes_referencia)}</TD>
                      <TD>{empresa?.nome}</TD>
                      <TD className="font-mono text-xs">{i.num_boleto ?? '—'}</TD>
                      <TD>{formatDate(i.data_vencimento)}</TD>
                      <TD className="text-right font-mono font-bold">{formatBRL(i.valor_total)}</TD>
                      <TD>
                        {i.status === 'pago' ? (
                          <Badge tone="green">pago</Badge>
                        ) : i.status === 'rateado' ? (
                          <Badge tone="brand">rateado</Badge>
                        ) : (
                          <Badge tone="amber">aguardando rateio</Badge>
                        )}
                      </TD>
                      <TD className="text-xs text-brand-600">
                        {aloc?.length ? aloc.map((a) => `${a.obras?.nome} (${formatBRL(a.valor)})`).join(' · ') : '—'}
                      </TD>
                      <TD className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/impostos/${i.id}/ratear`}>
                            {i.status === 'pendente_rateio' ? 'Ratear' : 'Editar rateio'}
                          </Link>
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
                {impostos.length === 0 && <TableEmpty>Sem impostos.</TableEmpty>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
