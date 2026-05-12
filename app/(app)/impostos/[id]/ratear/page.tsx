import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { RatearImpostoForm } from './form';
import { formatBRL, formatMonthRef } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function RatearImpostoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: imposto } = await supabase
    .from('impostos')
    .select('*, empresas(nome), imposto_alocacoes(obra_id, valor)')
    .eq('id', id)
    .maybeSingle();
  if (!imposto) notFound();

  const empresa = (imposto as unknown as { empresas: { nome: string } }).empresas;

  const { data: obras } = await supabase
    .from('obras')
    .select('id, nome')
    .eq('empresa_id', imposto.empresa_id)
    .order('nome');

  const alocacoesAtuais = (imposto as unknown as { imposto_alocacoes: { obra_id: string; valor: number }[] }).imposto_alocacoes;

  return (
    <div className="space-y-6">
      <Link
        href="/impostos"
        className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900"
      >
        <ArrowLeft className="size-3.5" /> voltar para impostos
      </Link>
      <PageHeader
        title={`Ratear imposto · ${formatMonthRef(imposto.mes_referencia)}`}
        description={`${empresa?.nome} · valor total ${formatBRL(imposto.valor_total)} · status atual: ${imposto.status}`}
      />
      <Card>
        <CardContent className="py-6">
          <RatearImpostoForm
            impostoId={imposto.id}
            valorTotal={Number(imposto.valor_total)}
            obras={obras ?? []}
            alocacoesAtuais={alocacoesAtuais ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
