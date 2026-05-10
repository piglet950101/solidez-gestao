import Link from 'next/link';
import { Bell, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EmpresaSwitcher } from './empresa-switcher';
import { signOut } from '@/actions/auth';
import { Button } from '@/components/ui/button';

export async function Topbar() {
  const supabase = await createClient();
  const { data: kpis } = await supabase.from('vw_dashboard_kpis').select('alertas_criticos');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = user
    ? await supabase.from('perfis_usuario').select('nome, cargo').eq('user_id', user.id).maybeSingle()
    : { data: null };

  const totalCriticos = (kpis ?? []).reduce((acc, k) => acc + (k.alertas_criticos ?? 0), 0);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-brand-100 bg-cream/80 px-4 backdrop-blur md:px-6">
      <EmpresaSwitcher />

      <div className="flex items-center gap-2">
        <Link
          href="/alertas"
          className="relative grid size-10 place-items-center rounded-[10px] border border-brand-100 bg-white text-brand-600 transition-colors hover:text-brand-900"
        >
          <Bell className="size-4" />
          {totalCriticos > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {totalCriticos}
            </span>
          ) : null}
        </Link>

        <div className="hidden items-center gap-3 rounded-[10px] border border-brand-100 bg-white px-3 py-2 md:flex">
          <div className="grid size-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {(perfil?.nome ?? user?.email ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-brand-900">{perfil?.nome ?? user?.email}</span>
            {perfil?.cargo ? <span className="text-[10px] uppercase tracking-wide text-brand-500">{perfil.cargo}</span> : null}
          </div>
        </div>

        <form action={signOut}>
          <Button variant="ghost" size="icon" type="submit" aria-label="Sair">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
