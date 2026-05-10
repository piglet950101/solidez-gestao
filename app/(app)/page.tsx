import { ArrowDownToLine, ArrowUpFromLine, Bell, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { KPICard } from '@/components/kpis/kpi-card';
import { DisbursementCurve } from '@/components/charts/disbursement-curve';
import { MargemObraChart } from '@/components/charts/margem-obra-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, StatusDot } from '@/components/ui/badge';
import { formatBRL, formatRelative } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresa } = await searchParams;
  const supabase = await createClient();

  const kpisQuery = supabase.from('vw_dashboard_kpis').select('*');
  const desembolsoQuery = supabase.from('vw_desembolso_13s').select('*');
  const margemQuery = supabase.from('vw_margem_obra').select('*').order('mes', { ascending: false });
  const alertasQuery = supabase
    .from('alertas')
    .select('*')
    .is('resolvido_em', null)
    .order('criado_em', { ascending: false })
    .limit(8);

  const [kpisRes, desembolsoRes, margemRes, alertasRes] = await Promise.all([
    empresa ? kpisQuery.eq('empresa_id', empresa) : kpisQuery,
    empresa ? desembolsoQuery.eq('empresa_id', empresa) : desembolsoQuery,
    empresa ? margemQuery.eq('empresa_id', empresa) : margemQuery,
    empresa ? alertasQuery.eq('empresa_id', empresa) : alertasQuery,
  ]);

  const kpis = kpisRes.data ?? [];
  const totalAPagar = kpis.reduce((acc, k) => acc + Number(k.total_a_pagar ?? 0), 0);
  const totalAReceber = kpis.reduce((acc, k) => acc + Number(k.total_a_receber ?? 0), 0);
  const alertasAtivos = kpis.reduce((acc, k) => acc + Number(k.alertas_ativos ?? 0), 0);
  const alertasCriticos = kpis.reduce((acc, k) => acc + Number(k.alertas_criticos ?? 0), 0);

  const margemPorObra = (margemRes.data ?? []).reduce<Record<string, { receita: number; despesa: number; margem: number }>>(
    (acc, m) => {
      const obra = m.nome ?? 'Obra';
      acc[obra] ??= { receita: 0, despesa: 0, margem: 0 };
      acc[obra].receita += Number(m.receita_total ?? 0);
      acc[obra].despesa += Number(m.despesa_total ?? 0);
      acc[obra].margem += Number(m.margem ?? 0);
      return acc;
    },
    {},
  );

  const margemChart = Object.entries(margemPorObra).map(([obra, v]) => ({ obra, ...v }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        description="Total a pagar, a receber, margem por obra e alertas ativos. Atualizado em tempo real."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="Total a pagar"
          value={totalAPagar}
          tone="negative"
          icon={<ArrowDownToLine className="size-4" />}
          hint="Parcelas pendentes e em atraso"
        />
        <KPICard
          label="Total a receber"
          value={totalAReceber}
          tone="positive"
          icon={<ArrowUpFromLine className="size-4" />}
          hint="Medições emitidas com saldo a receber"
        />
        <KPICard
          label="Alertas ativos"
          value={alertasAtivos}
          tone="warn"
          format={(n) => String(n)}
          icon={<Bell className="size-4" />}
          hint={alertasCriticos > 0 ? `${alertasCriticos} críticos` : 'sem críticos'}
        />
        <KPICard
          label="Empresas"
          value={kpis.length}
          format={(n) => String(n)}
          tone="neutral"
          hint={kpis.map((k) => k.empresa).join(' · ')}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Curva de desembolso · 13 semanas</CardTitle>
            <span className="text-xs text-brand-500">Empilhado por obra</span>
          </CardHeader>
          <CardContent>
            <DisbursementCurve
              data={(desembolsoRes.data ?? []).map((d) => ({
                semana_inicio: d.semana_inicio as string,
                obra: d.obra ?? 'Obra',
                valor: Number(d.valor ?? 0),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas recentes</CardTitle>
            <Link href="/alertas" className="text-xs font-semibold text-brand-700 hover:underline">
              ver todos
            </Link>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {alertasRes.data?.length ? (
              <ul className="divide-y divide-brand-50">
                {alertasRes.data.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <StatusDot severidade={a.severidade} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-brand-900">{a.mensagem}</div>
                      <div className="text-[10px] uppercase tracking-wide text-brand-500">
                        {formatRelative(a.criado_em)}
                      </div>
                    </div>
                    <Badge tone={a.severidade === 'vermelho' ? 'red' : a.severidade === 'amarelo' ? 'amber' : 'green'}>
                      {a.severidade}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-brand-500">
                Nenhum alerta ativo. <AlertTriangle className="ml-2 inline size-4 text-brand-300" />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Margem por obra</CardTitle>
          <span className="text-xs text-brand-500">
            Receita de medições − despesas rateadas no período. Substitui orçado vs realizado.
          </span>
        </CardHeader>
        <CardContent>
          {margemChart.length ? (
            <MargemObraChart data={margemChart} />
          ) : (
            <div className="px-5 py-12 text-center text-sm text-brand-500">
              Sem medições ainda. Cadastre uma medição para ver a margem.
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {kpis.map((k) => (
          <Card key={k.empresa_id}>
            <CardHeader>
              <CardTitle>{k.empresa}</CardTitle>
              <Badge tone="brand">CNPJ</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <Stat label="A pagar" value={Number(k.total_a_pagar)} tone="negative" />
              <Stat label="A receber" value={Number(k.total_a_receber)} tone="positive" />
              <Stat label="Alertas" value={Number(k.alertas_ativos)} format={String} tone="warn" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  format,
  tone,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  tone: 'positive' | 'negative' | 'warn';
}) {
  const c = tone === 'positive' ? 'text-emerald-700' : tone === 'negative' ? 'text-red-700' : 'text-amber-700';
  return (
    <div className="rounded-[10px] bg-brand-50 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-brand-500">{label}</div>
      <div className={`mt-1 font-mono text-lg font-bold ${c}`}>{format ? format(value) : formatBRL(value)}</div>
    </div>
  );
}
