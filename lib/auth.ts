import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

export async function getEmpresasDoUsuario() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_empresas')
    .select('empresa_id, papel, empresas(*)')
    .order('empresa_id');
  if (error) throw error;
  return data ?? [];
}

export async function getPerfil() {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('perfis_usuario').select('*').eq('user_id', user.id).maybeSingle();
  return data;
}
