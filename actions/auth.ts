'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/');

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent('Informe email e senha.')}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent('Email ou senha inválidos.')}`);
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) redirect('/reset?error=email');
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/convite`,
  });
  redirect('/login?info=reset_enviado');
}

export async function acceptInvite(formData: FormData) {
  const senha = String(formData.get('senha') ?? '');
  const confirma = String(formData.get('confirma') ?? '');
  const nome = String(formData.get('nome') ?? '').trim();
  if (senha !== confirma) redirect('/convite?error=mismatch');
  if (senha.length < 8) redirect('/convite?error=senha_curta');

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) redirect(`/convite?error=${encodeURIComponent(error.message)}`);

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('perfis_usuario').upsert({
      user_id: user.id,
      nome,
      email: user.email ?? '',
    });
  }
  revalidatePath('/', 'layout');
  redirect('/');
}
