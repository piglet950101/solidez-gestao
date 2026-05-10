import { createClient } from '@/lib/supabase/server';
import { CaptureForm } from './form';

export const dynamic = 'force-dynamic';

export default async function CapturarPage() {
  const supabase = await createClient();
  const [{ data: empresas }, { data: obras }, { data: categorias }] = await Promise.all([
    supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('obras').select('id, nome, empresa_id').eq('status', 'ativa').order('nome'),
    supabase.from('categorias').select('id, nome, cor').eq('tipo', 'despesa').eq('ativo', true).order('ordem'),
  ]);
  return <CaptureForm empresas={empresas ?? []} obras={obras ?? []} categorias={categorias ?? []} />;
}
