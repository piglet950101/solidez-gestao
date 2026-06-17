import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { NovaCompraForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NovaCompraPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const [
    { data: empresas },
    { data: obras },
    { data: fornecedores },
    { data: categorias },
    { data: socios },
    { data: veiculos },
    { data: veiculoAlocacoesRaw },
    { data: funcionarios },
    { data: itens },
  ] = await Promise.all([
    supabase.from('empresas').select('id, nome, tipo, matriz_id' as 'id, nome').eq('ativo', true).order('nome'),
    supabase.from('obras').select('id, nome, empresa_id').eq('status', 'ativa').order('nome'),
    supabase.from('fornecedores').select('id, nome').eq('ativo', true).order('nome'),
    // Includes `subtipo` (added in 20260515000001 migration) so the form
    // knows which categories are vehicle-related and should require a veículo.
    supabase.from('categorias').select('id, nome, tipo, subtipo, tipo_despesa' as 'id, nome, tipo, subtipo').eq('tipo', 'despesa').eq('ativo', true).order('ordem'),
    supabase.from('socios').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('veiculos').select('id, placa, modelo').eq('status', 'ativo').order('placa'),
    // Active allocations only — periodo_fim null OR >= today.
    supabase
      .from('veiculo_alocacoes')
      .select('veiculo_id, obra_id, percentual, periodo_inicio, periodo_fim')
      .lte('periodo_inicio', today)
      .or(`periodo_fim.is.null,periodo_fim.gte.${today}`),
    // Funcionários (não desligados) com snapshots de obra para resolver
    // apropriação por fase admissional/recorrente/demissional.
    supabase
      .from('funcionarios')
      .select('id, nome, status, obra_admissao_id, obra_atual_id, obra_demissao_id')
      .neq('status', 'desligado')
      .order('nome'),
    supabase.from('itens').select('id, nome, unidade, valor_medio').eq('ativo', true).order('nome'),
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
            veiculos={veiculos ?? []}
            veiculoAlocacoes={veiculoAlocacoesRaw ?? []}
            funcionarios={funcionarios ?? []}
            itens={itens ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
