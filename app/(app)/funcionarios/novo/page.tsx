import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { FuncionarioForm } from '../form';

export const dynamic = 'force-dynamic';

export default async function NovoFuncionarioPage() {
  const supabase = await createClient();
  const { data: obras } = await supabase
    .from('obras')
    .select('id, nome')
    .eq('status', 'ativa')
    .order('nome');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo funcionário"
        description="Cadastro completo: obra, tipo de contrato, salário, EPI, OS curso, período de experiência."
      />
      <Card>
        <CardContent className="py-6">
          <FuncionarioForm obras={obras ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
