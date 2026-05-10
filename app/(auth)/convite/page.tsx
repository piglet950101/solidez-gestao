import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { acceptInvite } from '@/actions/auth';

export const metadata = { title: 'Definir senha · Solidez Gestão' };

export default async function ConvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const sp = await searchParams;
  return (
    <form action={acceptInvite} className="flex flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-900">Definir sua senha</h1>
        <p className="text-sm text-brand-600">Primeira entrada — define a senha para começar.</p>
      </div>
      <input type="hidden" name="token" value={sp.token ?? ''} />
      <input type="hidden" name="email" value={sp.email ?? ''} />
      <div className="space-y-1.5">
        <Label htmlFor="nome">Seu nome</Label>
        <Input id="nome" name="nome" type="text" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="senha">Nova senha</Label>
        <Input id="senha" name="senha" type="password" required minLength={8} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirma">Confirmar senha</Label>
        <Input id="confirma" name="confirma" type="password" required minLength={8} />
      </div>
      <Button type="submit" variant="accent" size="lg">
        Salvar e entrar
      </Button>
    </form>
  );
}
