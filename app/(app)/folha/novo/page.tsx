import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { NovaFolhaForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NovoLancamentoFolhaPage() {
  const supabase = await createClient();
  const [{ data: funcionarios }, { data: obras }] = await Promise.all([
    supabase.from('funcionarios').select('id, nome, tipo_contrato, salario_hora, salario_mes').eq('status', 'ativo').order('nome'),
    supabase.from('obras').select('id, nome, empresa_id').eq('status', 'ativa').order('nome'),
  ]);
  if (!funcionarios?.length || !obras?.length) redirect('/folha');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lançar folha do mês"
        description="Dias trabalhados, horas extras, salário fixo, vales e descontos. O sistema calcula o líquido."
      />
      <Card>
        <CardContent className="py-6">
          <NovaFolhaForm funcionarios={funcionarios} obras={obras} />
        </CardContent>
      </Card>
    </div>
  );
}
