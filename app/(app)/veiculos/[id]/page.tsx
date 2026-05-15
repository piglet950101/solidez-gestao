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
import { TransferirVeiculoDialog } from './transferir-form';
import { formatBRL, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: veiculo }, { data: empresas }, { data: custos }, { data: obras }, { data: alocacoes }] = await Promise.all([
    supabase.from('veiculos').select('*').eq('id', id).maybeSingle(),
    supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('veiculo_custos').select('*').eq('veiculo_id', id).order('data', { ascending: false }),
    supabase.from('obras').select('id, nome, status').order('nome'),
    supabase
      .from('veiculo_alocacoes')
      .select('id, obra_id, percentual, periodo_inicio, periodo_fim, observacoes, obras(nome)')
      .eq('veiculo_id', id)
      .order('periodo_inicio', { ascending: false }),
  ]);
  if (!veiculo) notFound();

  type AlocRow = {
    id: string;
    obra_id: string;
    percentual: number;
    periodo_inicio: string;
    periodo_fim: string | null;
    observacoes: string | null;
    obras: { nome: string } | null;
  };
  const allAlocs = ((alocacoes as unknown as AlocRow[]) ?? []);
  const today = new Date().toISOString().slice(0, 10);
  const obraAtual = allAlocs.find((a) => a.periodo_inicio <= today && (a.periodo_fim === null || a.periodo_fim >= today));
  const obrasAtivas = (obras ?? []).filter((o) => (o as { status: string }).status === 'ativa');

  return (
    <div className="space-y-6">
      <Link href="/veiculos" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900">
        <ArrowLeft className="size-3.5" /> voltar para veículos
      </Link>
      <PageHeader title={`${veiculo.placa} · ${veiculo.modelo}`} description={veiculo.tipo_propriedade === 'proprio_cnpj' ? 'Próprio CNPJ' : 'Parceria CPF'} />

      <Card>
        <CardHeader>
          <CardTitle>Vínculo com obra</CardTitle>
          <span className="text-xs text-brand-500">
            Combustível, manutenção, óleo e pneus desse veículo caem automaticamente na obra vinculada.
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              {obraAtual ? (
                <>
                  <span className="text-brand-600">Hoje vinculado a </span>
                  <strong className="text-brand-900">{obraAtual.obras?.nome ?? '—'}</strong>
                  <span className="ml-1 text-brand-500">
                    (desde {formatDate(obraAtual.periodo_inicio)}
                    {Number(obraAtual.percentual) !== 100 ? `, ${obraAtual.percentual}%` : ''})
                  </span>
                </>
              ) : (
                <span className="text-amber-700">Sem vínculo ativo. Transfira pra uma obra antes de registrar despesas.</span>
              )}
            </div>
            <TransferirVeiculoDialog
              veiculoId={veiculo.id}
              obraAtualNome={obraAtual?.obras?.nome ?? null}
              obras={obrasAtivas.map((o) => ({ id: (o as { id: string }).id, nome: (o as { nome: string }).nome }))}
            />
          </div>
          {allAlocs.length > 1 ? (
            <div className="rounded-md border border-brand-100 bg-brand-50/40">
              <Table>
                <THead>
                  <TR>
                    <TH>Obra</TH>
                    <TH>Início</TH>
                    <TH>Fim</TH>
                    <TH className="text-right">%</TH>
                  </TR>
                </THead>
                <TBody>
                  {allAlocs.map((a) => (
                    <TR key={a.id}>
                      <TD>{a.obras?.nome ?? '—'}</TD>
                      <TD>{formatDate(a.periodo_inicio)}</TD>
                      <TD>{a.periodo_fim ? formatDate(a.periodo_fim) : <Badge tone="green">ativo</Badge>}</TD>
                      <TD className="text-right font-mono">{a.percentual}%</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
