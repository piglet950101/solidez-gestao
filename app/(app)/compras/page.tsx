import Link from 'next/link';
import { Plus, ShoppingCart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBRL, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresa } = await searchParams;
  const supabase = await createClient();
  const query = supabase
    .from('compras')
    .select('*, fornecedores(nome), categorias(nome, cor), compra_alocacoes(obra_id, valor_alocado, obras(nome)), parcelas(status)')
    .order('data_compra', { ascending: false })
    .limit(100);
  const { data: compras } = empresa ? await query.eq('empresa_id', empresa) : await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras"
        description="Lançamentos com rateio entre obras, parcelas editáveis e identificação de quem pagou."
        actions={
          <Button variant="accent" asChild>
            <Link href="/compras/nova">
              <Plus className="size-4" /> Nova compra
            </Link>
          </Button>
        }
      />

      {!compras?.length ? (
        <EmptyState
          icon={<ShoppingCart className="size-10" />}
          title="Nenhuma compra registrada"
          description="Cadastre a primeira compra com rateio entre obras."
          action={
            <Button variant="accent" asChild>
              <Link href="/compras/nova">Cadastrar compra</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <THead>
                <TR>
                  <TH>Data</TH>
                  <TH>Descrição</TH>
                  <TH>Fornecedor</TH>
                  <TH>Categoria</TH>
                  <TH>Rateio</TH>
                  <TH>Obras</TH>
                  <TH>Parcelas</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {compras.map((c) => {
                  const alocs = (c as unknown as { compra_alocacoes: { obra_id: string; obras: { nome: string } }[] }).compra_alocacoes;
                  const parc = (c as unknown as { parcelas: { status: string }[] }).parcelas;
                  const pagas = parc?.filter((p) => p.status === 'pago').length ?? 0;
                  const total = parc?.length ?? 0;
                  const fornecedor = (c as unknown as { fornecedores?: { nome: string } }).fornecedores;
                  const categoria = (c as unknown as { categorias?: { nome: string; cor: string | null } }).categorias;
                  return (
                    <TR key={c.id}>
                      <TD>{formatDate(c.data_compra)}</TD>
                      <TD className="max-w-[260px] truncate font-medium text-brand-900">{c.descricao}</TD>
                      <TD className="text-brand-600">{fornecedor?.nome ?? '—'}</TD>
                      <TD>
                        {categoria ? (
                          <Badge tone="outline" style={categoria.cor ? { borderColor: categoria.cor, color: categoria.cor } : {}}>
                            {categoria.nome}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TD>
                      <TD className="text-xs uppercase tracking-wide text-brand-500">{c.rateio_modo}</TD>
                      <TD className="text-xs">{alocs?.map((a) => a.obras?.nome).join(' · ') ?? '—'}</TD>
                      <TD className="font-mono text-xs">
                        {pagas}/{total}
                      </TD>
                      <TD className="text-right font-mono font-bold text-brand-900">{formatBRL(c.valor_total)}</TD>
                    </TR>
                  );
                })}
                {compras.length === 0 && <TableEmpty>Sem compras cadastradas.</TableEmpty>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
