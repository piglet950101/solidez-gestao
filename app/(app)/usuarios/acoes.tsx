'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Mail, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reenviarConvite, desativarUsuario, reativarUsuario } from '@/actions/usuarios';

export function UsuarioAcoes({ userId, email, ativo }: { userId: string; email: string; ativo: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onReenviar() {
    startTransition(async () => {
      const res = await reenviarConvite(email);
      if (res.error) { toast.error(res.error); return; }
      toast.success(`Convite reenviado para ${email}`);
    });
  }
  function onToggle() {
    startTransition(async () => {
      const res = ativo ? await desativarUsuario(userId) : await reativarUsuario(userId);
      if (res.error) { toast.error(res.error); return; }
      toast.success(ativo ? 'Usuário desativado.' : 'Usuário reativado.');
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" onClick={onReenviar} disabled={pending} aria-label="Reenviar convite">
        <Mail className="size-4" />
      </Button>
      {ativo ? (
        <Button type="button" variant="ghost" size="icon" onClick={onToggle} disabled={pending} aria-label="Desativar" className="text-red-600">
          <UserX className="size-4" />
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="icon" onClick={onToggle} disabled={pending} aria-label="Reativar" className="text-emerald-600">
          <UserCheck className="size-4" />
        </Button>
      )}
    </div>
  );
}
