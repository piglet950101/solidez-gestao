import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EditarValeForm } from './form';

export const dynamic = 'force-dynamic';

export default async function EditarValePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: vale }, { data: funcionarios }, { data: obras }] = await Promise.all([
    supabase.from('vales').select('*').eq('id', id).maybeSingle(),
    supabase.from('funcionarios').select('id, nome').eq('status', 'ativo').order('nome'),
    supabase.from('obras').select('id, nome').eq('status', 'ativa').order('nome'),
  ]);
  if (!vale) notFound();
  if (vale.descontado_em_folha_id) redirect('/vales');

  return (
    <div className="space-y-6">
      <Link href="/vales" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-900">
        <ArrowLeft className="size-3.5" /> voltar para vales
      </Link>
      <PageHeader title="Editar vale" description="Altere a data ou o valor antes do desconto na folha." />
      <Card>
        <CardContent className="py-6">
          <EditarValeForm vale={vale} funcionarios={funcionarios ?? []} obras={obras ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
