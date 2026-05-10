import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/actions/auth';

export const metadata = { title: 'Entrar · Solidez Gestão' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <form action={signIn} className="flex flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-900">Entrar</h1>
        <p className="text-sm text-brand-600">Acesso para os 3 usuários cadastrados.</p>
      </div>

      <NextField searchParams={searchParams} />

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoFocus autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>

      <Button type="submit" variant="accent" size="lg">
        Entrar
      </Button>

      <div className="flex justify-between text-xs">
        <Link href="/reset" className="text-brand-600 hover:text-brand-800">
          Esqueci a senha
        </Link>
        <span className="text-brand-400">v1.0</span>
      </div>
    </form>
  );
}

async function NextField({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      {sp.error ? (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{sp.error}</div>
      ) : null}
      <input type="hidden" name="next" value={sp.next ?? '/'} />
    </>
  );
}
