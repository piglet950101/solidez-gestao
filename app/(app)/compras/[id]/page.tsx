import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { excluirCompra } from '@/actions/compras';
import { EditarCompraBasicoForm } from './form';
import { formatBRL, formatDate } from '@/lib/format';
import { formatoPagamentoLabel } from '@/lib/formato-pagamento';

export const dynamic = 'force-dynamic';

export default async function CompraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: compra } = await supabase
    .from('compras')
    .select(
      '*, empresas(nome), fornecedores(nome), categorias(nome, cor), compra_alocacoes(obra_id, valor_alocado, qtd_alocada, percentual_alocado, obras(nome)), parcelas(id, num_parcela, data_vencimento, valor, status, data_pagamento)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!compra) notFound();

  const empresa = (compra as unknown as { empresas: { nome: string } }).empresas;
  const fornecedor = (compra as unknown as { fornecedores?: { nome: string } }).fornecedores;
  const categoria = (compra as unknown as { categorias?: { nome: string; cor: string | null } }).categorias;
  const alocs = ((compra as unknown as { compra_alocacoes: { obra_id: string; valor_alocado: number; obras: { nome: string } }[] }).compra_alocacoes ?? []).slice();
  const parcelas = ((compra as unknown as { parcelas: { id: string; num_parcela: number; data_vencimento: string; valor: number; status: string; data_pagamento: string | null }[] }).parcelas ?? [])
    .slice()
    .sort((a, b) => a.num_parcela - b.num_parcela);

  return (
    <div className="space-y-6">
      <Link href="/compras" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900">
        <ArrowLeft className="size-3.5" /> voltar para compras
      </Link>
      <PageHeader
        title={compra.descricao}
        description={`${empresa?.nome} · ${formatBRL(compra.valor_total)} em ${formatDate(compra.data_compra)}${fornecedor?.nome ? ` · ${fornecedor.nome}` : ''}`}
        actions={
          <ConfirmDeleteDialog
            triggerLabel="Excluir compra"
            title="Excluir compra"
            description={`${compra.descricao} · ${formatBRL(compra.valor_total)} · ${parcelas.length} parcela(s) e ${alocs.length} alocação(ões) serão removidas junto.`}
            redirectTo="/compras"
            onConfirm={async () => {
              'use server';
              return await excluirCompra(compra.id);
            }}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Dados básicos</CardTitle>
            <span className="text-xs text-brand-500">
              Altere data, descrição e observações. Mudanças no valor total / rateio / parcelas precisam de exclusão + recadastro.
            </span>
          </CardHeader>
          <CardContent className="py-6">
            <EditarCompraBasicoForm compra={compra} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Valor total" value={formatBRL(compra.valor_total)} mono />
              <Row label="Modo de rateio" value={String(compra.rateio_modo).toUpperCase()} />
              <Row label="Quem pagou" value={String(compra.quem_pagou).toUpperCase()} />
              {compra.formato_pagamento ? (
                <Row label="Forma de pagamento" value={formatoPagamentoLabel(compra.formato_pagamento) ?? '—'} />
              ) : null}
              {categoria ? <Row label="Categoria" value={categoria.nome} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rateio</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <ul className="divide-y divide-brand-50">
                {alocs.map((a) => (
                  <li key={a.obra_id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <span className="text-brand-800">{a.obras?.nome}</span>
                    <span className="font-mono font-semibold text-brand-900">{formatBRL(a.valor_alocado)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parcelas</CardTitle>
          <span className="text-xs text-brand-500">{parcelas.length} parcela(s)</span>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <THead>
              <TR>
                <TH>#</TH>
                <TH>Vencimento</TH>
                <TH className="text-right">Valor</TH>
                <TH>Status</TH>
                <TH>Pagamento</TH>
              </TR>
            </THead>
            <TBody>
              {parcelas.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono">#{p.num_parcela}</TD>
                  <TD>{formatDate(p.data_vencimento)}</TD>
                  <TD className="text-right font-mono">{formatBRL(p.valor)}</TD>
                  <TD>
                    <Badge tone={p.status === 'pago' ? 'green' : p.status === 'atrasado' ? 'red' : 'amber'}>
                      {p.status}
                    </Badge>
                  </TD>
                  <TD>{formatDate(p.data_pagamento)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-brand-600">{label}</span>
      <span className={mono ? 'font-mono font-bold' : ''}>{value}</span>
    </div>
  );
}
