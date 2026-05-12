import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { NovaMedicaoForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NovaMedicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ obra?: string }>;
}) {
  const { obra } = await searchParams;
  const supabase = await createClient();
  const [{ data: obras }, { data: etapas }] = await Promise.all([
    supabase
      .from('obras')
      .select('id, nome, empresa_id, com_permuta, empresas(nome)')
      .eq('status', 'ativa')
      .order('nome'),
    supabase.from('etapas_obra').select('id, obra_id, nome, ordem').order('ordem'),
  ]);
  if (!obras?.length) redirect('/');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova medição"
        description="Lançamento de medição com nota fiscal, valor bruto e líquido, e opcionalmente já registrar o recebimento."
      />
      <Card>
        <CardContent className="py-6">
          <NovaMedicaoForm
            obras={obras.map((o) => ({
              id: o.id,
              nome: o.nome,
              empresa_id: o.empresa_id,
              com_permuta: o.com_permuta,
              empresa_nome: (o as unknown as { empresas: { nome: string } }).empresas?.nome ?? '',
            }))}
            etapas={etapas ?? []}
            obraInicial={obra ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
