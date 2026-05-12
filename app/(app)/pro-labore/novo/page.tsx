import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { NovoProLaboreForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NovoProLaborePage() {
  const supabase = await createClient();
  const [{ data: socios }, { data: obras }] = await Promise.all([
    supabase.from('socios').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('obras').select('id, nome').eq('status', 'ativa').order('nome'),
  ]);
  if (!socios?.length || !obras?.length) redirect('/pro-labore');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastrar pró-labore"
        description="Valor previsto do mês. No fim do período, marca o valor efetivamente pago (pode ser diferente)."
      />
      <Card>
        <CardContent className="py-6">
          <NovoProLaboreForm socios={socios} obras={obras} />
        </CardContent>
      </Card>
    </div>
  );
}
