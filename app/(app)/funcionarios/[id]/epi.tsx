'use client';
import * as React from 'react';
import Link from 'next/link';
import { ShieldCheck, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatDate } from '@/lib/format';

interface EntregaItem {
  id: string;
  item_id: string;
  quantidade: number;
  numero_ca: string | null;
  validade: string | null;
  lote: string | null;
  motivo: string | null;
  itens: { nome: string; unidade: string; valor_medio: number | null } | null;
}
interface Entrega {
  id: string;
  data_entrega: string;
  obra_id: string;
  observacao: string | null;
  obras: { nome: string } | null;
  epi_entrega_itens: EntregaItem[];
}

function diasAteValidade(validade: string | null): number | null {
  if (!validade) return null;
  return Math.floor((new Date(validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function EpiHistoricoFuncionario({ funcionarioId, entregas, status }: { funcionarioId: string; entregas: Entrega[]; status: string }) {
  const desligado = status === 'desligado';
  const todosItens = entregas.flatMap((e) =>
    (e.epi_entrega_itens ?? []).map((i) => ({ ...i, data_entrega: e.data_entrega, obra_nome: e.obras?.nome ?? '—' })),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>EPI · histórico de entregas</CardTitle>
        <span className="text-xs text-brand-500">
          {entregas.length} entrega(s) · {todosItens.length} item(s) entregue(s) no total
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {!desligado ? (
          <div className="flex justify-end">
            <Button variant="accent" size="sm" asChild>
              <Link href={`/epi/entregar?funcionario=${funcionarioId}`}>
                <Plus className="size-4" /> Registrar entrega
              </Link>
            </Button>
          </div>
        ) : null}

        {entregas.length === 0 ? (
          <div className="rounded-md border border-dashed border-brand-200 px-6 py-8 text-center text-sm text-brand-500">
            <ShieldCheck className="mx-auto mb-2 size-6 text-brand-400" />
            Nenhuma entrega de EPI registrada ainda.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-brand-100">
            <Table>
              <THead>
                <TR>
                  <TH>Data</TH>
                  <TH>EPI</TH>
                  <TH className="text-right">Qtd</TH>
                  <TH>CA</TH>
                  <TH>Validade</TH>
                  <TH>Lote</TH>
                  <TH>Obra (custo)</TH>
                  <TH>Motivo</TH>
                  <TH className="text-right">Custo</TH>
                </TR>
              </THead>
              <TBody>
                {todosItens.map((i) => {
                  const dias = diasAteValidade(i.validade);
                  const tone: 'red' | 'amber' | 'green' | 'neutral' =
                    dias === null ? 'neutral' : dias < 0 ? 'red' : dias <= 30 ? 'amber' : 'green';
                  const custo = i.itens?.valor_medio != null ? Number(i.itens.valor_medio) * Number(i.quantidade) : null;
                  return (
                    <TR key={i.id}>
                      <TD className="font-mono text-xs">{formatDate(i.data_entrega)}</TD>
                      <TD>{i.itens?.nome ?? '—'}</TD>
                      <TD className="text-right font-mono">{Number(i.quantidade)} {i.itens?.unidade}</TD>
                      <TD className="font-mono text-xs">{i.numero_ca ?? '—'}</TD>
                      <TD>
                        {i.validade ? (
                          <Badge tone={tone}>
                            {dias === null
                              ? formatDate(i.validade)
                              : dias < 0
                                ? `vencido ${formatDate(i.validade)}`
                                : dias <= 30
                                  ? `vence em ${dias}d`
                                  : formatDate(i.validade)}
                          </Badge>
                        ) : '—'}
                      </TD>
                      <TD className="font-mono text-xs">{i.lote ?? '—'}</TD>
                      <TD className="text-xs">{i.obra_nome}</TD>
                      <TD className="text-xs">{i.motivo ?? '—'}</TD>
                      <TD className="text-right font-mono">{custo != null ? formatBRL(custo) : '—'}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
