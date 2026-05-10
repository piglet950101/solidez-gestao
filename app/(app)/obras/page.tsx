import Link from 'next/link';
import { HardHat, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ObrasPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresa } = await searchParams;
  const supabase = await createClient();
  const query = supabase
    .from('obras')
    .select('*, empresas!inner(nome, cnpj), obra_socios(socio_id, percentual, socios(nome))')
    .order('nome');
  const { data: obras } = empresa ? await query.eq('empresa_id', empresa) : await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Obras"
        description={`${obras?.length ?? 0} obras ativas. Sócios e percentuais por obra.`}
        actions={
          <Button variant="accent" asChild>
            <Link href="/obras/nova">Nova obra</Link>
          </Button>
        }
      />

      {!obras?.length ? (
        <EmptyState
          icon={<HardHat className="size-10" />}
          title="Nenhuma obra cadastrada"
          description="Cadastre as obras para começar a registrar medições, compras e folha."
          action={
            <Button variant="accent" asChild>
              <Link href="/obras/nova">Cadastrar primeira obra</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {obras.map((o) => {
            const empresaInfo = (o as unknown as { empresas: { nome: string; cnpj: string } }).empresas;
            const socios = (o as unknown as { obra_socios: { socio_id: string; percentual: number; socios: { nome: string } }[] }).obra_socios;
            return (
              <Card key={o.id}>
                <CardHeader>
                  <div className="space-y-1">
                    <CardTitle>{o.nome}</CardTitle>
                    <div className="text-xs text-brand-500">{empresaInfo?.nome}</div>
                  </div>
                  {o.com_permuta ? <Badge tone="accent">permuta</Badge> : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={o.status === 'ativa' ? 'green' : 'neutral'}>{o.status}</Badge>
                    <Badge tone={o.tipo === 'curto_prazo' ? 'amber' : 'outline'}>{o.tipo === 'curto_prazo' ? 'curto prazo' : 'regular'}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-brand-500">Sócios</div>
                    {socios?.length ? (
                      <ul className="space-y-0.5 text-sm">
                        {socios.map((s) => (
                          <li key={s.socio_id} className="flex justify-between gap-2">
                            <span className="text-brand-800">{s.socios?.nome}</span>
                            <span className="font-mono font-bold text-brand-900">{s.percentual}%</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-brand-400">—</div>
                    )}
                  </div>
                  <Link
                    href={`/obras/${o.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900"
                  >
                    Detalhes <ArrowRight className="size-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
