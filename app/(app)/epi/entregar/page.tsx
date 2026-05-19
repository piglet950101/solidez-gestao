import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EntregaEpiForm } from './form';

export const dynamic = 'force-dynamic';

export default async function EntregarEpiPage({ searchParams }: { searchParams: Promise<{ funcionario?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: funcionarios }, { data: itens }] = await Promise.all([
    supabase
      .from('funcionarios')
      .select('id, nome, obra_atual_id, status, obras:obra_atual_id(nome)')
      .neq('status', 'desligado')
      .order('nome'),
    supabase
      .from('itens')
      .select('id, nome, unidade, saldo_atual, valor_medio, controla_validade')
      .eq('eh_epi', true)
      .eq('ativo', true)
      .order('nome'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entregar EPI"
        description="Registra entrega de EPI ao funcionário. Saída do estoque + custo na obra atual dele + histórico com CA, validade e lote."
      />
      <Card>
        <CardContent className="py-6">
          <EntregaEpiForm
            funcionarios={(funcionarios ?? []) as never}
            itens={(itens ?? []) as never}
            funcionarioInicial={params.funcionario ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
