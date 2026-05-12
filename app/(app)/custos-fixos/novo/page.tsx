import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { NovoCustoFixoForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NovoCustoFixoPage() {
  const supabase = await createClient();
  const [{ data: empresas }, { data: obras }, { data: categorias }] = await Promise.all([
    supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('obras').select('id, nome, empresa_id').eq('status', 'ativa').order('nome'),
    supabase.from('categorias').select('id, nome').eq('tipo', 'despesa').eq('ativo', true).order('ordem'),
  ]);
  if (!empresas?.length) redirect('/');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo custo fixo"
        description="Endereçamento manual a uma ou mais obras — sem rateio uniforme automático. Você decide onde cada centavo cai."
      />
      <Card>
        <CardContent className="py-6">
          <NovoCustoFixoForm empresas={empresas} obras={obras ?? []} categorias={categorias ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
