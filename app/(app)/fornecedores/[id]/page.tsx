import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FornecedorForm } from '../form';

export const dynamic = 'force-dynamic';

export default async function EditarFornecedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: fornecedor } = await supabase
    .from('fornecedores')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!fornecedor) notFound();

  return (
    <div className="space-y-6">
      <Link href="/fornecedores" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900">
        <ArrowLeft className="size-3.5" /> voltar para fornecedores
      </Link>
      <PageHeader
        title={fornecedor.nome}
        description="Editar cadastro do fornecedor."
        actions={fornecedor.ativo ? null : <Badge tone="neutral">Arquivado</Badge>}
      />
      <Card>
        <CardContent className="py-6">
          <FornecedorForm fornecedor={fornecedor} />
        </CardContent>
      </Card>
    </div>
  );
}
