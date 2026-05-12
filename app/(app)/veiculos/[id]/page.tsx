import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { VeiculoForm } from '../form';
import { VeiculoCustoForm } from './custo-form';
import { formatBRL, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: veiculo }, { data: empresas }, { data: custos }] = await Promise.all([
    supabase.from('veiculos').select('*').eq('id', id).maybeSingle(),
    supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('veiculo_custos').select('*').eq('veiculo_id', id).order('data', { ascending: false }),
  ]);
  if (!veiculo) notFound();

  return (
    <div className="space-y-6">
      <Link href="/veiculos" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900">
        <ArrowLeft className="size-3.5" /> voltar para veículos
      </Link>
      <PageHeader title={`${veiculo.placa} · ${veiculo.modelo}`} description={veiculo.tipo_propriedade === 'proprio_cnpj' ? 'Próprio CNPJ' : 'Parceria CPF'} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="py-6">
            <VeiculoForm veiculo={veiculo} empresas={empresas ?? []} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registrar custo</CardTitle>
            </CardHeader>
            <CardContent>
              <VeiculoCustoForm veiculoId={veiculo.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de custos</CardTitle>
              <span className="text-xs text-brand-500">{custos?.length ?? 0} lançamentos</span>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {!custos?.length ? (
                <div className="px-5 py-6 text-center text-sm text-brand-500">Nenhum custo registrado.</div>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Data</TH>
                      <TH>Tipo</TH>
                      <TH className="text-right">Valor</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {custos.map((c) => (
                      <TR key={c.id}>
                        <TD>{formatDate(c.data)}</TD>
                        <TD><Badge tone="outline">{c.tipo}</Badge></TD>
                        <TD className="text-right font-mono">{formatBRL(c.valor)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
