import Link from 'next/link';
import { Building, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { FornecedoresTable } from './table';

export const dynamic = 'force-dynamic';

export default async function FornecedoresPage() {
  const supabase = await createClient();
  // Pull all fornecedores + count of compras per fornecedor for the list
  const { data: fornecedores } = await supabase
    .from('fornecedores')
    .select('*, compras(count)')
    .order('nome');

  const rows = (fornecedores ?? []).map((f) => ({
    ...f,
    compras_count: (f as unknown as { compras: { count: number }[] }).compras?.[0]?.count ?? 0,
  }));

  const ativos = rows.filter((f) => f.ativo).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fornecedores"
        description={`${ativos} ativos. Cadastre aqui as empresas e prestadores que aparecem no dropdown de compras.`}
        actions={
          <Button variant="accent" asChild>
            <Link href="/fornecedores/novo">
              <Plus className="size-4" /> Novo fornecedor
            </Link>
          </Button>
        }
      />

      {!rows.length ? (
        <EmptyState
          icon={<Building className="size-10" />}
          title="Sem fornecedores cadastrados"
          description="Cadastre o primeiro fornecedor — depois ele fica disponível pra você escolher ao lançar uma compra."
          action={
            <Button variant="accent" asChild>
              <Link href="/fornecedores/novo">Cadastrar primeiro</Link>
            </Button>
          }
        />
      ) : (
        <FornecedoresTable fornecedores={rows} />
      )}
    </div>
  );
}
