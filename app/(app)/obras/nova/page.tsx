import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { NovaObraForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NovaObraPage() {
  const supabase = await createClient();
  const [{ data: empresas }, { data: socios }] = await Promise.all([
    supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('socios').select('id, nome').eq('ativo', true).order('nome'),
  ]);
  if (!empresas?.length) redirect('/');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova obra"
        description="Cadastro enxuto: nome, CNPJ, sócios e percentuais. Datas e etapas podem entrar depois."
      />
      <Card>
        <CardContent className="py-6">
          <NovaObraForm empresas={empresas} socios={socios ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
