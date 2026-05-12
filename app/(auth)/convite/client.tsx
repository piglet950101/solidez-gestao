'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

type Stage = 'loading' | 'ready' | 'form' | 'invalid' | 'saving';

export function ConviteClient() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [stage, setStage] = React.useState<Stage>('loading');
  const [email, setEmail] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      // 1) If we already have a session (e.g. revisit), skip token exchange
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        setEmail(existing.session.user.email ?? '');
        setStage('form');
        return;
      }

      // 2) Hash params from Supabase /auth/v1/verify redirect
      //    format: #access_token=...&refresh_token=...&type=invite
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const errorMsg = params.get('error_description') ?? params.get('error');

      if (errorMsg) {
        setError(decodeURIComponent(errorMsg));
        setStage('invalid');
        return;
      }

      if (!accessToken || !refreshToken) {
        setError('Link inválido ou expirado. Peça pra Yasmin gerar um novo.');
        setStage('invalid');
        return;
      }

      const { data, error: setErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (setErr || !data.session) {
        setError(setErr?.message ?? 'Não foi possível validar o convite.');
        setStage('invalid');
        return;
      }

      // Clean hash from URL so refresh doesn't re-trigger
      window.history.replaceState({}, '', window.location.pathname);
      setEmail(data.session.user.email ?? '');
      setStage('form');
    })();
  }, [supabase]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get('nome') ?? '').trim();
    const senha = String(fd.get('senha') ?? '');
    const confirma = String(fd.get('confirma') ?? '');
    if (senha !== confirma) {
      setError('As senhas não conferem.');
      return;
    }
    if (senha.length < 8) {
      setError('A senha precisa ter ao menos 8 caracteres.');
      return;
    }
    setStage('saving');
    const { error: updateErr } = await supabase.auth.updateUser({ password: senha });
    if (updateErr) {
      setError(updateErr.message);
      setStage('form');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user && nome) {
      await supabase.from('perfis_usuario').upsert(
        { user_id: user.id, nome, email: user.email ?? '' },
        { onConflict: 'user_id' },
      );
    }
    toast.success('Cadastro concluído. Bem-vindo!');
    router.replace('/');
    router.refresh();
  }

  if (stage === 'loading') {
    return (
      <div className="flex flex-col gap-2 text-center">
        <p className="text-sm text-brand-600">Validando seu convite...</p>
      </div>
    );
  }

  if (stage === 'invalid') {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-brand-900">Convite inválido</h1>
        <p className="text-sm text-red-700">{error}</p>
        <Button variant="outline" onClick={() => router.push('/login')}>
          Ir para login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-900">Definir sua senha</h1>
        <p className="text-sm text-brand-600">
          Bem-vindo! Defina uma senha para entrar como{' '}
          <span className="font-mono font-semibold">{email}</span>
        </p>
      </div>

      {error ? (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="nome">Seu nome</Label>
        <Input id="nome" name="nome" type="text" required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="senha">Nova senha</Label>
        <Input id="senha" name="senha" type="password" required minLength={8} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirma">Confirmar senha</Label>
        <Input id="confirma" name="confirma" type="password" required minLength={8} />
      </div>
      <Button type="submit" variant="accent" size="lg" disabled={stage === 'saving'}>
        {stage === 'saving' ? 'Salvando...' : 'Salvar e entrar'}
      </Button>
    </form>
  );
}
