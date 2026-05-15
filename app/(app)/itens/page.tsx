import Link from 'next/link';
import { Boxes, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ItensTable } from './table';

export const dynamic = 'force-dynamic';

export default async function ItensPage() {
  const supabase = await createClient();
  const { data: itens } = await supabase
    .from('itens')
    .select('id, nome, codigo_interno, unidade, saldo_atual, valor_medio, estoque_minimo, eh_epi, ativo, categorias(nome)')
    .order('nome');

  type Row = {
    id: string;
    nome: string;
    codigo_interno: string | null;
    unidade: string;
    saldo_atual: number;
    valor_medio: number | null;
    estoque_minimo: number | null;
    eh_epi: boolean;
    ativo: boolean;
    categorias: { nome: string } | null;
  };
  const rows = (itens ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Itens / Almoxarifado"
        description="Cadastro central de itens (EPIs, materiais, insumos). Compras detalhadas alimentam o estoque automaticamente."
        actions={
          <Button variant="accent" asChild>
            <Link href="/itens/novo"><Plus className="size-4" /> Novo item</Link>
          </Button>
        }
      />

      {!rows.length ? (
        <EmptyState
          icon={<Boxes className="size-10" />}
          title="Sem itens cadastrados"
          description="Cadastre os itens (luva, capacete, cimento, brita…) — depois eles aparecem no formulário de Nova Compra pra detalhar a NF e dar entrada no estoque."
          action={
            <Button variant="accent" asChild>
              <Link href="/itens/novo">Cadastrar primeiro</Link>
            </Button>
          }
        />
      ) : (
        <ItensTable itens={rows} />
      )}
    </div>
  );
}
