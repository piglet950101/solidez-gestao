import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { NovaCompraForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NovaCompraPage() {
  const supabase = await createClient();

  const [{ data: empresas }, { data: obras }, { data: fornecedores }, { data: categorias }, { data: socios }] =
    await Promise.all([
      supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('obras').select('id, nome, empresa_id').eq('status', 'ativa').order('nome'),
      supabase.from('fornecedores').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('categorias').select('id, nome, tipo').eq('tipo', 'despesa').eq('ativo', true).order('ordem'),
      supabase.from('socios').select('id, nome').eq('ativo', true).order('nome'),
    ]);

  if (!empresas?.length) redirect('/');

  return (
    <div className="space-y-6">
      <PageHeader title="Nova compra" description="Lançamento com rateio entre obras e parcelas editáveis." />
      <Card>
        <CardContent className="py-6">
          <NovaCompraForm
            empresas={empresas}
            obras={obras ?? []}
            fornecedores={fornecedores ?? []}
            categorias={categorias ?? []}
            socios={socios ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
