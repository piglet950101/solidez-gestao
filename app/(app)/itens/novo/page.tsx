import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ItemForm } from '../form';

export const dynamic = 'force-dynamic';

export default async function NovoItemPage() {
  const supabase = await createClient();
  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nome')
    .eq('tipo', 'despesa')
    .eq('ativo', true)
    .order('ordem');

  return (
    <div className="space-y-6">
      <PageHeader title="Novo item" description="Item de almoxarifado — entra no estoque quando aparecer numa NF detalhada." />
      <Card>
        <CardContent className="py-6">
          <ItemForm categorias={categorias ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
