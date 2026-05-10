import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset } from '@/actions/auth';

export const metadata = { title: 'Recuperar senha · Solidez Gestão' };

export default function ResetPage() {
  return (
    <form action={requestPasswordReset} className="flex flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-brand-900">Recuperar senha</h1>
        <p className="text-sm text-brand-600">Te enviamos um link por email para definir uma nova senha.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoFocus />
      </div>
      <Button type="submit" variant="accent" size="lg">
        Enviar link
      </Button>
      <Link href="/login" className="text-center text-xs text-brand-600 hover:text-brand-800">
        Voltar para o login
      </Link>
    </form>
  );
}
