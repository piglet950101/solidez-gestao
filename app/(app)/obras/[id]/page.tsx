import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileBarChart, ShoppingCart } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucroDistribuivelCard } from '@/components/obras/lucro-distribuivel-card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { formatBRL, formatDate, formatMonthRef } from '@/lib/format';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ObraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from('obras')
    .select('*, empresas(nome, cnpj), obra_socios(percentual, socios(nome))')
    .eq('id', id)
    .maybeSingle();

  if (!obra) notFound();

  const [
    { data: medicoes },
    { data: lucroData },
    { data: margem },
    { data: parcelasPendentes },
    { data: antecipacoes },
  ] = await Promise.all([
    supabase
      .from('medicoes')
      .select('*, recebimentos(valor, tipo, data_recebimento)')
      .eq('obra_id', id)
      .order('data_emissao', { ascending: false }),
    supabase.rpc('fn_lucro_distribuivel', { p_obra_id: id }),
    supabase.from('vw_margem_obra').select('*').eq('obra_id', id).order('mes', { ascending: false }),
    supabase
      .from('parcelas')
      .select('*, compras!inner(descricao, fornecedor_id, compra_alocacoes!inner(obra_id, valor_alocado))')
      .eq('compras.compra_alocacoes.obra_id', id)
      .in('status', ['pendente', 'atrasado'])
      .order('data_vencimento'),
    supabase
      .from('antecipacoes')
      .select('*')
      .eq('obra_id', id)
      .order('data_recebimento', { ascending: false }),
  ]);

  const lucro = lucroData?.[0];
  const empresa = (obra as unknown as { empresas: { nome: string; cnpj: string } }).empresas;
  const socios = (obra as unknown as { obra_socios: { percentual: number; socios: { nome: string } }[] }).obra_socios;

  return (
    <div className="space-y-6">
      <Link href="/obras" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900">
        <ArrowLeft className="size-3.5" /> voltar para obras
      </Link>

      <PageHeader
        title={obra.nome}
        description={`${empresa?.nome} · ${obra.tipo === 'curto_prazo' ? 'Curto prazo' : 'Regular'}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/medicoes?obra=${obra.id}`}>
                <FileBarChart className="size-4" /> Medições
              </Link>
            </Button>
            <Button variant="accent" asChild>
              <Link href={`/compras/nova?obra=${obra.id}`}>
                <ShoppingCart className="size-4" /> Nova compra
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumo de margem</CardTitle>
              <span className="text-xs text-brand-500">Por mês de referência</span>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Mês</TH>
                    <TH className="text-right">Receita</TH>
                    <TH className="text-right">Caixa</TH>
                    <TH className="text-right">Despesa</TH>
                    <TH className="text-right">Margem</TH>
                  </TR>
                </THead>
                <TBody>
                  {(margem ?? []).length === 0 ? (
                    <TableEmpty>Sem medições registradas para essa obra ainda.</TableEmpty>
                  ) : (
                    margem!.map((m) => (
                      <TR key={m.mes}>
                        <TD className="font-mono">{formatMonthRef(m.mes)}</TD>
                        <TD className="text-right font-mono">{formatBRL(Number(m.receita_total))}</TD>
                        <TD className="text-right font-mono text-emerald-700">{formatBRL(Number(m.receita_caixa))}</TD>
                        <TD className="text-right font-mono text-red-700">{formatBRL(Number(m.despesa_total))}</TD>
                        <TD className={`text-right font-mono font-bold ${Number(m.margem) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatBRL(Number(m.margem))}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medições</CardTitle>
              <span className="text-xs text-brand-500">{medicoes?.length ?? 0} registradas</span>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <THead>
                  <TR>
                    <TH>#</TH>
                    <TH>Emissão</TH>
                    <TH>Nota fiscal</TH>
                    <TH className="text-right">Bruto</TH>
                    <TH className="text-right">Líquido</TH>
                    <TH className="text-right">Recebido</TH>
                    <TH>Tipo</TH>
                  </TR>
                </THead>
                <TBody>
                  {!medicoes?.length ? (
                    <TableEmpty>Nenhuma medição registrada.</TableEmpty>
                  ) : (
                    medicoes.map((m) => {
                      const recs = (m as unknown as { recebimentos: { valor: number; tipo: string }[] }).recebimentos;
                      const dinheiro = recs?.filter((r) => r.tipo === 'dinheiro').reduce((s, r) => s + Number(r.valor), 0) ?? 0;
                      const permuta = recs?.filter((r) => r.tipo === 'permuta').reduce((s, r) => s + Number(r.valor), 0) ?? 0;
                      return (
                        <TR key={m.id}>
                          <TD>#{m.num_medicao}</TD>
                          <TD>{formatDate(m.data_emissao)}</TD>
                          <TD className="font-mono text-xs">{m.num_nota_fiscal ?? '—'}</TD>
                          <TD className="text-right font-mono">{formatBRL(m.valor_bruto)}</TD>
                          <TD className="text-right font-mono">{formatBRL(m.valor_liquido)}</TD>
                          <TD className="text-right font-mono text-emerald-700">{formatBRL(dinheiro + permuta)}</TD>
                          <TD>
                            {permuta > 0 ? <Badge tone="accent">★ permuta</Badge> : <Badge tone="green">caixa</Badge>}
                          </TD>
                        </TR>
                      );
                    })
                  )}
                </TBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Antecipações</CardTitle>
              <span className="text-xs text-brand-500">Adiantamentos do contratante</span>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Data</TH>
                    <TH className="text-right">Valor</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {!antecipacoes?.length ? (
                    <TableEmpty>Sem antecipações registradas.</TableEmpty>
                  ) : (
                    antecipacoes.map((a) => (
                      <TR key={a.id}>
                        <TD>{formatDate(a.data_recebimento)}</TD>
                        <TD className="text-right font-mono">{formatBRL(a.valor)}</TD>
                        <TD>
                          {a.abatido_em_medicao_id ? (
                            <Badge tone="green">conciliada</Badge>
                          ) : (
                            <Badge tone="amber">aguardando medição</Badge>
                          )}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {lucro ? (
            <LucroDistribuivelCard
              receita_caixa={Number(lucro.receita_caixa)}
              despesas_pagas={Number(lucro.despesas_pagas)}
              despesas_pendentes={Number(lucro.despesas_pendentes)}
              imposto_rateado={Number(lucro.imposto_rateado)}
              imposto_estimado={Number(lucro.imposto_estimado)}
              pro_labore_previsto={Number(lucro.pro_labore_previsto)}
              lucro_distribuivel={Number(lucro.lucro_distribuivel)}
              comprometido={Number(lucro.comprometido)}
              alerta={Boolean(lucro.alerta)}
            />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Sócios e percentuais</CardTitle>
            </CardHeader>
            <CardContent>
              {socios?.length ? (
                <ul className="space-y-2 text-sm">
                  {socios.map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded-[10px] bg-brand-50 px-3 py-2">
                      <span className="font-medium text-brand-800">{s.socios?.nome}</span>
                      <span className="font-mono text-base font-bold text-brand-900">{s.percentual}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-brand-500">Sem sócios cadastrados.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contas pendentes</CardTitle>
              <span className="text-xs text-brand-500">{parcelasPendentes?.length ?? 0} boletos</span>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {!parcelasPendentes?.length ? (
                <div className="px-5 py-6 text-center text-sm text-brand-500">Nenhum boleto pendente.</div>
              ) : (
                <ul className="divide-y divide-brand-50">
                  {parcelasPendentes.slice(0, 6).map((p) => {
                    const compra = (p as unknown as { compras: { descricao: string } }).compras;
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-brand-900">{compra?.descricao}</div>
                          <div className="text-[10px] uppercase tracking-wide text-brand-500">
                            #{p.num_parcela} · vence {formatDate(p.data_vencimento)}
                          </div>
                        </div>
                        <span className="font-mono text-sm font-bold text-red-700">{formatBRL(p.valor)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
