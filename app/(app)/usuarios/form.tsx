'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/form-field';
import { convidarUsuario } from '@/actions/usuarios';

const CARGOS_SUGERIDOS = [
  'Sócio',
  'Engenheiro',
  'Auxiliar de engenharia',
  'Mestre de obra',
  'Almoxarife',
  'Administrativo',
  'Financeiro',
  'Contador',
];

export function ConvidarUsuarioForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await convidarUsuario(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Convite enviado para ${res.email}`);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="Email *" name="email" type="email" required placeholder="felipe@exemplo.com" autoComplete="off" />
        <TextField label="Nome completo *" name="nome" required placeholder="Ex.: Felipe da Silva" />
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wide text-brand-600">Cargo</label>
          <input
            list="cargos-sugeridos"
            name="cargo"
            placeholder="Ex.: Auxiliar de engenharia"
            className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm"
          />
          <datalist id="cargos-sugeridos">
            {CARGOS_SUGERIDOS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <TextField label="WhatsApp" name="telefone_whatsapp" placeholder="(48) 99999-9999" />
      </div>
      <p className="text-xs text-brand-500">
        Ao enviar, o sistema cria o usuário no Supabase Auth e dispara um email com link de convite (válido por 24h).
        O cargo já vai pré-preenchido no perfil — o convidado só precisa definir nome (se quiser editar) e senha.
      </p>
      <div className="flex justify-end">
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          <Send className="size-4" /> {pending ? 'Enviando…' : 'Enviar convite'}
        </Button>
      </div>
    </form>
  );
}
