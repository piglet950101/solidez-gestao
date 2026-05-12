import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { NovaEmpreitadaForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NovaEmpreitadaPage() {
  const supabase = await createClient();
  const [{ data: obras }, { data: cabecas }] = await Promise.all([
    supabase.from('obras').select('id, nome').eq('status', 'ativa').order('nome'),
    supabase.from('funcionarios').select('id, nome').eq('cabeca_de_empreitada', true).eq('status', 'ativo').order('nome'),
  ]);
  if (!obras?.length) redirect('/');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova empreitada"
        description="Serviço fechado com cabeça responsável. Pagamentos vão direto pro cabeça; ele distribui pra equipe internamente."
      />
      <Card>
        <CardContent className="py-6">
          <NovaEmpreitadaForm obras={obras} cabecas={cabecas ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
