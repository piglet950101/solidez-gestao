import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { SaidaEstoqueForm } from './form';

export const dynamic = 'force-dynamic';

export default async function SaidaEstoquePage() {
  const supabase = await createClient();
  const [{ data: obras }, { data: itens }] = await Promise.all([
    supabase.from('obras').select('id, nome').eq('status', 'ativa').order('nome'),
    supabase.from('itens').select('id, nome, unidade, saldo_atual, valor_medio').eq('ativo', true).order('nome'),
  ]);
  if (!obras?.length) redirect('/obras');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saída de estoque"
        description="Dar baixa direta de materiais/EPIs indo pra uma obra. O custo cai no centro de custo da obra automaticamente."
      />
      <Card>
        <CardContent className="py-6">
          <SaidaEstoqueForm obras={obras} itens={itens ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
