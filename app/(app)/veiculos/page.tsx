import Link from 'next/link';
import { Truck, AlertTriangle, Plus, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/format';
import { differenceInDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function VeiculosPage() {
  const supabase = await createClient();
  const { data: veiculos } = await supabase
    .from('veiculos')
    .select('*, veiculo_alocacoes(obra_id, percentual, periodo_fim, obras(nome))')
    .neq('status', 'vendido')
    .order('placa');

  if (!veiculos?.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Veículos"
          description="Frota mista CPF/CNPJ, alocação por obra, alertas semáforo."
          actions={
            <Button variant="accent" asChild>
              <Link href="/veiculos/novo"><Plus className="size-4" /> Novo veículo</Link>
            </Button>
          }
        />
        <EmptyState
          icon={<Truck className="size-10" />}
          title="Sem veículos cadastrados"
          description="Cadastre cada veículo com tag de propriedade (próprio CNPJ ou parceria CPF) e custos."
          action={
            <Button variant="accent" asChild>
              <Link href="/veiculos/novo">Cadastrar primeiro veículo</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veículos"
        description={`${veiculos.length} veículos · custo continua sendo lançado na obra independentemente da titularidade`}
        actions={
          <Button variant="accent" asChild>
            <Link href="/veiculos/novo"><Plus className="size-4" /> Novo veículo</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {veiculos.map((v) => {
          const docDias = v.doc_vencimento ? differenceInDays(new Date(v.doc_vencimento), new Date()) : null;
          const docSeveridade: 'verde' | 'amarelo' | 'vermelho' =
            docDias == null ? 'verde' : docDias < 0 ? 'vermelho' : docDias <= 30 ? 'amarelo' : 'verde';
          const aloc = (v as unknown as { veiculo_alocacoes: { obra_id: string; percentual: number; obras: { nome: string } }[] }).veiculo_alocacoes;
          return (
            <Card key={v.id}>
              <CardHeader>
                <div className="flex flex-col">
                  <Link href={`/veiculos/${v.id}`} className="text-base font-semibold leading-none text-brand-900 hover:underline">
                    {v.placa}
                  </Link>
                  <span className="text-xs text-brand-500">{v.modelo}{v.ano ? ` · ${v.ano}` : ''}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {v.tipo_propriedade === 'proprio_cnpj' ? (
                    <Badge tone="brand">★ CNPJ próprio</Badge>
                  ) : (
                    <Badge tone="amber">⚠ CPF parceria</Badge>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/veiculos/${v.id}`}><Pencil className="size-3.5" /> Editar</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-[10px] bg-brand-50 px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-600">
                    <StatusDot severidade={docSeveridade} />
                    Documento
                  </span>
                  <span className="text-sm font-semibold">
                    {v.doc_vencimento ? (
                      <>
                        {formatDate(v.doc_vencimento)}
                        {docDias != null && docDias < 0 ? (
                          <span className="ml-1 text-red-700">(vencido há {Math.abs(docDias)}d)</span>
                        ) : docDias != null ? (
                          <span className="ml-1 text-brand-500">({docDias}d)</span>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-[10px] bg-brand-50 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Última troca de óleo</span>
                  <span className="text-sm font-semibold">
                    {v.ultima_troca_oleo_data ? formatDate(v.ultima_troca_oleo_data) : '—'}
                    {v.ultima_troca_oleo_km ? ` · ${v.ultima_troca_oleo_km} km` : ''}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand-500">Alocações</div>
                  {aloc?.length ? (
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {aloc.map((a, i) => (
                        <li key={i} className="flex justify-between">
                          <span className="text-brand-800">{a.obras?.nome}</span>
                          <span className="font-mono text-brand-600">{a.percentual}%</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-brand-400">não alocado</div>
                  )}
                </div>

                {v.financiamento_ativo ? (
                  <div className="flex items-center gap-1 rounded-[10px] bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="size-3.5" /> Financiamento ativo · {v.financiamento_parcelas_restantes ?? '—'}{' '}
                    parcelas restantes
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
