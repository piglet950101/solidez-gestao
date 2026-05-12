import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { NovoImpostoForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NovoImpostoPage() {
  const supabase = await createClient();
  const { data: empresas } = await supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome');
  if (!empresas?.length) redirect('/');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lançar imposto"
        description="Etapa 1: registro do boleto no nível do CNPJ. O rateio por obra entra depois quando o contador detalhar."
      />
      <Card>
        <CardContent className="py-6">
          <NovoImpostoForm empresas={empresas} />
        </CardContent>
      </Card>
    </div>
  );
}
