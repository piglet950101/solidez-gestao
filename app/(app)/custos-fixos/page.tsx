import Link from 'next/link';
import { Wallet, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CustosFixosPage() {
  const supabase = await createClient();
  const { data: custos } = await supabase
    .from('custos_fixos')
    .select('*, empresas(nome), categorias(nome), custos_fixos_alocacoes(percentual, obras(nome))')
    .eq('ativo', true)
    .order('descricao');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custos Fixos"
        description="Endereçamento manual a uma ou mais obras — sem rateio uniforme automático."
        actions={
          <Button variant="accent" asChild>
            <Link href="/custos-fixos/novo"><Plus className="size-4" /> Novo custo fixo</Link>
          </Button>
        }
      />

      {!custos?.length ? (
        <EmptyState
          icon={<Wallet className="size-10" />}
          title="Sem custos fixos"
          description="Cadastre contabilidade, seguros e taxas. Você decide explicitamente em qual obra cada um cai."
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <THead>
                <TR>
                  <TH>Descrição</TH>
                  <TH>Empresa</TH>
                  <TH>Categoria</TH>
                  <TH className="text-right">Valor mensal</TH>
                  <TH>Vence dia</TH>
                  <TH>Endereço</TH>
                </TR>
              </THead>
              <TBody>
                {custos.map((c) => {
                  const empresa = (c as unknown as { empresas: { nome: string } }).empresas;
                  const cat = (c as unknown as { categorias?: { nome: string } }).categorias;
                  const aloc = (c as unknown as { custos_fixos_alocacoes: { percentual: number; obras: { nome: string } }[] }).custos_fixos_alocacoes;
                  const modo = (c as unknown as { modo_rateio?: string }).modo_rateio ?? 'manual';
                  return (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.descricao}</TD>
                      <TD>{empresa?.nome}</TD>
                      <TD>{cat ? <Badge tone="outline">{cat.nome}</Badge> : '—'}</TD>
                      <TD className="text-right font-mono font-bold">{formatBRL(c.valor_mensal)}</TD>
                      <TD className="text-center font-mono">{c.dia_vencimento ?? '—'}</TD>
                      <TD className="text-xs">
                        {modo === 'manual' ? (
                          aloc?.length
                            ? aloc.map((a) => `${a.obras?.nome} (${a.percentual}%)`).join(' · ')
                            : <Badge tone="amber">não endereçado</Badge>
                        ) : modo === 'igual_obras_ativas' ? (
                          <Badge tone="brand">igual entre obras ativas</Badge>
                        ) : modo === 'proporcional_funcionarios' ? (
                          <Badge tone="brand">proporcional ao nº de funcionários</Badge>
                        ) : (
                          <Badge tone="brand">proporcional ao faturamento</Badge>
                        )}
                      </TD>
                    </TR>
                  );
                })}
                {custos.length === 0 && <TableEmpty>Sem custos fixos cadastrados.</TableEmpty>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
