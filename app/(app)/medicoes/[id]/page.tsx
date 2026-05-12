import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EditarMedicaoForm } from './form';

export const dynamic = 'force-dynamic';

export default async function EditarMedicaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: medicao }, { data: obras }, { data: etapas }] = await Promise.all([
    supabase.from('medicoes').select('*, obras(nome, empresa_id, com_permuta, empresas(nome))').eq('id', id).maybeSingle(),
    supabase.from('obras').select('id, nome, empresa_id, com_permuta, empresas(nome)').eq('status', 'ativa').order('nome'),
    supabase.from('etapas_obra').select('id, obra_id, nome, ordem').order('ordem'),
  ]);
  if (!medicao) notFound();

  const obraInfo = (medicao as unknown as { obras: { nome: string; empresa_id: string; com_permuta: boolean; empresas: { nome: string } } }).obras;

  return (
    <div className="space-y-6">
      <Link href="/medicoes" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900">
        <ArrowLeft className="size-3.5" /> voltar para medições
      </Link>
      <PageHeader
        title={`Editar medição #${medicao.num_medicao}`}
        description={`${obraInfo.empresas.nome} · ${obraInfo.nome}`}
      />
      <Card>
        <CardContent className="py-6">
          <EditarMedicaoForm
            medicao={medicao}
            obras={(obras ?? []).map((o) => ({
              id: o.id,
              nome: o.nome,
              empresa_id: o.empresa_id,
              com_permuta: o.com_permuta,
              empresa_nome: (o as unknown as { empresas: { nome: string } }).empresas?.nome ?? '',
            }))}
            etapas={etapas ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
