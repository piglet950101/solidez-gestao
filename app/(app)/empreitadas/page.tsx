import Link from 'next/link';
import { Hammer, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBRL, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function EmpreitadasPage() {
  const supabase = await createClient();
  const { data: empreitadas } = await supabase
    .from('empreitadas')
    .select('*, obras(nome), funcionarios(nome), empreitada_pagamentos(valor)')
    .order('data_inicio', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empreitadas"
        description="Serviços fechados (ex: laje 3 do Select R$ 100k). Pagamentos ao cabeça, sem precisar cadastrar a equipe."
        actions={
          <Button variant="accent" asChild>
            <Link href="/empreitadas/nova"><Plus className="size-4" /> Nova empreitada</Link>
          </Button>
        }
      />

      {!empreitadas?.length ? (
        <EmptyState
          icon={<Hammer className="size-10" />}
          title="Sem empreitadas cadastradas"
          description="Cadastre serviços fechados com cabeça responsável. Os pagamentos vão direto pra ele."
          action={
            <Button variant="accent" asChild>
              <Link href="/empreitadas/nova">Cadastrar primeira</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <THead>
                <TR>
                  <TH>Obra</TH>
                  <TH>Descrição</TH>
                  <TH>Cabeça</TH>
                  <TH>Início</TH>
                  <TH className="text-right">Valor total</TH>
                  <TH className="text-right">Pago</TH>
                  <TH className="text-right">Saldo</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {empreitadas.map((e) => {
                  const obra = (e as unknown as { obras: { nome: string } }).obras;
                  const cabeca = (e as unknown as { funcionarios: { nome: string } }).funcionarios;
                  const pags = (e as unknown as { empreitada_pagamentos: { valor: number }[] }).empreitada_pagamentos;
                  const pago = pags?.reduce((s, p) => s + Number(p.valor), 0) ?? 0;
                  const saldo = Number(e.valor_total) - pago;
                  return (
                    <TR key={e.id}>
                      <TD>{obra?.nome}</TD>
                      <TD className="font-medium">
                        <Link href={`/empreitadas/${e.id}`} className="text-brand-900 hover:underline">{e.descricao}</Link>
                      </TD>
                      <TD>{cabeca?.nome}</TD>
                      <TD>{formatDate(e.data_inicio)}</TD>
                      <TD className="text-right font-mono">{formatBRL(e.valor_total)}</TD>
                      <TD className="text-right font-mono text-emerald-700">{formatBRL(pago)}</TD>
                      <TD className="text-right font-mono font-bold">{formatBRL(saldo)}</TD>
                      <TD>
                        <Badge tone={e.status === 'concluida' ? 'green' : e.status === 'cancelada' ? 'red' : 'amber'}>
                          {e.status}
                        </Badge>
                      </TD>
                    </TR>
                  );
                })}
                {empreitadas.length === 0 && <TableEmpty>Sem empreitadas.</TableEmpty>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
