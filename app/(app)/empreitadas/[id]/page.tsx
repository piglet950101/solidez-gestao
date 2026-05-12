import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PagamentoForm } from './pagamento-form';
import { concluirAction } from './actions';
import { formatBRL, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function EmpreitadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: emp } = await supabase
    .from('empreitadas')
    .select('*, obras(nome), funcionarios(nome), empreitada_pagamentos(*)')
    .eq('id', id)
    .maybeSingle();
  if (!emp) notFound();

  const obra = (emp as unknown as { obras: { nome: string } }).obras;
  const cabeca = (emp as unknown as { funcionarios: { nome: string } }).funcionarios;
  const pags = ((emp as unknown as { empreitada_pagamentos: { id: string; data: string; valor: number }[] }).empreitada_pagamentos ?? [])
    .sort((a, b) => b.data.localeCompare(a.data));
  const pago = pags.reduce((s, p) => s + Number(p.valor), 0);
  const saldo = Number(emp.valor_total) - pago;

  return (
    <div className="space-y-6">
      <Link href="/empreitadas" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900">
        <ArrowLeft className="size-3.5" /> voltar para empreitadas
      </Link>
      <PageHeader
        title={emp.descricao}
        description={`${obra?.nome} · cabeça: ${cabeca?.nome}`}
        actions={
          emp.status === 'em_andamento' ? (
            <form action={concluirAction.bind(null, emp.id)}>
              <Button type="submit" variant="outline">Marcar concluída</Button>
            </form>
          ) : (
            <Badge tone={emp.status === 'concluida' ? 'green' : 'red'}>{emp.status}</Badge>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Pagamentos ao cabeça</CardTitle>
            <span className="text-xs text-brand-500">{pags.length} lançamentos</span>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <THead>
                <TR>
                  <TH>Data</TH>
                  <TH className="text-right">Valor</TH>
                </TR>
              </THead>
              <TBody>
                {pags.length === 0 ? (
                  <TR><TD colSpan={2} className="px-5 py-8 text-center text-sm text-brand-500">Nenhum pagamento ainda.</TD></TR>
                ) : (
                  pags.map((p) => (
                    <TR key={p.id}>
                      <TD>{formatDate(p.data)}</TD>
                      <TD className="text-right font-mono">{formatBRL(p.valor)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-brand-600">Valor total</span><span className="font-mono font-bold">{formatBRL(emp.valor_total)}</span></div>
              <div className="flex justify-between"><span className="text-brand-600">Pago</span><span className="font-mono text-emerald-700">{formatBRL(pago)}</span></div>
              <div className="flex justify-between border-t border-brand-100 pt-2"><span className="text-brand-600 font-semibold">Saldo</span><span className={`font-mono font-bold ${saldo > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatBRL(saldo)}</span></div>
              <div className="flex justify-between"><span className="text-brand-600">Início</span><span>{formatDate(emp.data_inicio)}</span></div>
              {emp.data_conclusao && (
                <div className="flex justify-between"><span className="text-brand-600">Concluída</span><span>{formatDate(emp.data_conclusao)}</span></div>
              )}
            </CardContent>
          </Card>

          {emp.status === 'em_andamento' && (
            <Card>
              <CardHeader><CardTitle>Registrar pagamento</CardTitle></CardHeader>
              <CardContent>
                <PagamentoForm empreitadaId={emp.id} sugerido={Math.max(0, saldo)} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
