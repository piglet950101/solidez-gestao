import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { NovoValeForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NovoValePage() {
  const supabase = await createClient();
  const [{ data: funcionarios }, { data: obras }] = await Promise.all([
    supabase.from('funcionarios').select('id, nome').eq('status', 'ativo').order('nome'),
    supabase.from('obras').select('id, nome').eq('status', 'ativa').order('nome'),
  ]);
  if (!funcionarios?.length) redirect('/funcionarios');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lançar vale"
        description="Adiantamento ao funcionário · descontado automaticamente na próxima folha."
      />
      <Card>
        <CardContent className="py-6">
          <NovoValeForm funcionarios={funcionarios} obras={obras ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
