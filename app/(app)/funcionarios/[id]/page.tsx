import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FuncionarioForm } from '../form';
import { DesligarFuncionarioDialog } from '@/components/funcionarios/desligar-dialog';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function EditarFuncionarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: funcionario } = await supabase
    .from('funcionarios')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!funcionario) notFound();

  const desligado = funcionario.status === 'desligado';

  return (
    <div className="space-y-6">
      <Link
        href="/funcionarios"
        className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900"
      >
        <ArrowLeft className="size-3.5" /> voltar para funcionários
      </Link>
      <PageHeader
        title={funcionario.nome}
        description={
          desligado
            ? `Desligado em ${formatDate(funcionario.data_desligamento)} · ${funcionario.cargo ?? 'sem cargo'}`
            : `Editar cadastro · ${funcionario.cargo ?? 'sem cargo'}`
        }
        actions={
          desligado ? (
            <Badge tone="red">Desligado</Badge>
          ) : (
            <DesligarFuncionarioDialog
              funcionarioId={funcionario.id}
              funcionarioNome={funcionario.nome}
            />
          )
        }
      />
      <Card>
        <CardContent className="py-6">
          <FuncionarioForm funcionario={funcionario} />
        </CardContent>
      </Card>
    </div>
  );
}
