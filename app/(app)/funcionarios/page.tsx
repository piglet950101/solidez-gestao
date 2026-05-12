import Link from 'next/link';
import { Users, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FuncionariosTable } from './table';

export const dynamic = 'force-dynamic';

export default async function FuncionariosPage() {
  const supabase = await createClient();
  // Fetch ALL funcionários (including desligados) — the client table filters
  // by status via a toggle so the user can search the full history.
  const { data: funcionarios } = await supabase
    .from('funcionarios')
    .select('*')
    .order('nome');

  const ativos = (funcionarios ?? []).filter((f) => f.status !== 'desligado').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funcionários"
        description={`${ativos} ativos. Busque por nome, cargo ou CPF para agilizar.`}
        actions={
          <Button variant="accent" asChild>
            <Link href="/funcionarios/novo">
              <Plus className="size-4" /> Novo funcionário
            </Link>
          </Button>
        }
      />

      {!funcionarios?.length ? (
        <EmptyState
          icon={<Users className="size-10" />}
          title="Sem funcionários"
          description="Cadastre ou importe os funcionários da planilha."
        />
      ) : (
        <FuncionariosTable funcionarios={funcionarios} />
      )}
    </div>
  );
}
