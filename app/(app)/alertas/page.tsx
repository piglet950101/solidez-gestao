import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusDot } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateTime } from '@/lib/format';
import { resolverAlerta } from '@/actions/alertas';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const TIPO_LABEL: Record<string, string> = {
  conta_a_vencer: 'Conta a vencer',
  conta_vencida: 'Conta vencida',
  doc_veiculo: 'Documento veículo',
  troca_oleo: 'Troca de óleo',
  fim_experiencia: 'Período de experiência',
  imposto_pendente: 'Imposto pendente',
  lucro_em_risco: 'Lucro em risco',
  medicao_atrasada: 'Medição atrasada',
};

export default async function AlertasPage() {
  const supabase = await createClient();
  const { data: alertas } = await supabase
    .from('alertas')
    .select('*, empresas(nome)')
    .is('resolvido_em', null)
    .order('severidade', { ascending: false })
    .order('criado_em', { ascending: false });

  const grupos = (alertas ?? []).reduce<Record<string, typeof alertas>>((acc, a) => {
    (acc[a.severidade] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas"
        description="Padrão semáforo. WhatsApp envia para os 3 usuários cadastrados nos templates aprovados."
      />

      {!alertas?.length ? (
        <EmptyState icon={<Bell className="size-10" />} title="Nenhum alerta ativo" description="Tudo certo por aqui." />
      ) : (
        <div className="space-y-6">
          {(['vermelho', 'amarelo', 'verde'] as const).map((sev) => {
            const items = grupos[sev] ?? [];
            if (!items.length) return null;
            return (
              <Card key={sev}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <StatusDot severidade={sev} />
                    <CardTitle>
                      {sev === 'vermelho' ? 'Críticos' : sev === 'amarelo' ? 'Atenção' : 'Informativos'}
                    </CardTitle>
                  </div>
                  <Badge tone={sev === 'vermelho' ? 'red' : sev === 'amarelo' ? 'amber' : 'green'}>
                    {items.length}
                  </Badge>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <ul className="divide-y divide-brand-50">
                    {items.map((a) => {
                      const empresa = (a as unknown as { empresas?: { nome: string } }).empresas;
                      return (
                        <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-3">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Badge tone="outline">{TIPO_LABEL[a.tipo] ?? a.tipo}</Badge>
                              {empresa ? (
                                <span className="text-[10px] uppercase tracking-wide text-brand-500">
                                  {empresa.nome}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm font-medium text-brand-900">{a.mensagem}</p>
                            <span className="text-[10px] uppercase tracking-wide text-brand-500">
                              {formatDateTime(a.criado_em)}
                            </span>
                          </div>
                          <form action={resolverAlerta.bind(null, a.id)}>
                            <Button type="submit" variant="ghost" size="sm">
                              resolver
                            </Button>
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
