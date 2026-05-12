import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { VeiculoForm } from '../form';

export const dynamic = 'force-dynamic';

export default async function NovoVeiculoPage() {
  const supabase = await createClient();
  const { data: empresas } = await supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome');
  return (
    <div className="space-y-6">
      <PageHeader title="Novo veículo" description="Cadastro com tag CPF/CNPJ, documentação, óleo e financiamento." />
      <Card>
        <CardContent className="py-6">
          <VeiculoForm empresas={empresas ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
