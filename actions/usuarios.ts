'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { optionalString } from '@/lib/zod-helpers';

/**
 * Admin-only Supabase client (service role). Used to invite users — needs
 * elevated auth.admin.* permissions. NEVER exposed to the browser.
 */
function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Service role not configured.');
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

const InviteSchema = z.object({
  email: z.string().email('Email inválido.'),
  nome: z.string().min(2, 'Informe o nome.'),
  cargo: optionalString,
  telefone_whatsapp: optionalString,
});

export async function convidarUsuario(formData: FormData) {
  // Auth gate — só usuário logado pode convidar
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: 'Não autenticado.' };

  const parsed = InviteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const admin = adminSupabase();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/convite`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo,
    data: {
      nome: parsed.data.nome,
      cargo: parsed.data.cargo ?? null,
      telefone_whatsapp: parsed.data.telefone_whatsapp ?? null,
    },
  });
  if (error) {
    return { error: error.message };
  }
  if (!data.user) return { error: 'Falha ao criar usuário.' };

  // Pré-popula perfil — quando o usuário aceitar o convite na tela /convite,
  // o upsert de lá só atualiza nome (cargo + telefone permanecem).
  const { error: perfilErr } = await admin.from('perfis_usuario').upsert(
    {
      user_id: data.user.id,
      nome: parsed.data.nome,
      email: parsed.data.email,
      cargo: parsed.data.cargo ?? null,
      telefone_whatsapp: parsed.data.telefone_whatsapp ?? null,
    } as never,
    { onConflict: 'user_id' },
  );
  if (perfilErr) {
    // Não retorna erro — usuário já foi convidado, perfil pode ser ajustado depois.
    console.error('perfis_usuario upsert failed:', perfilErr.message);
  }

  revalidatePath('/usuarios');
  return { ok: true, email: parsed.data.email };
}

export async function reenviarConvite(email: string) {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: 'Não autenticado.' };

  const admin = adminSupabase();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/convite`;
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function desativarUsuario(user_id: string) {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: 'Não autenticado.' };
  if (user.id === user_id) return { error: 'Você não pode desativar sua própria conta.' };

  const admin = adminSupabase();
  const { error } = await admin.from('perfis_usuario').update({ ativo: false } as never).eq('user_id', user_id);
  if (error) return { error: error.message };
  revalidatePath('/usuarios');
  return { ok: true };
}

export async function reativarUsuario(user_id: string) {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: 'Não autenticado.' };

  const admin = adminSupabase();
  const { error } = await admin.from('perfis_usuario').update({ ativo: true } as never).eq('user_id', user_id);
  if (error) return { error: error.message };
  revalidatePath('/usuarios');
  return { ok: true };
}
