'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  /** Server action that performs the deletion. Receives nothing or an id; we call it. */
  onConfirm: () => Promise<{ error?: string } | void>;
  /** Visible title in the dialog header. */
  title: string;
  /** Optional context line explaining what will be deleted. */
  description?: string;
  /** Where to send the user after a successful delete. Default: just refresh. */
  redirectTo?: string;
  /** Trigger button label. Default "Excluir". */
  triggerLabel?: string;
  /** Trigger variant. Default 'outline' (which we'll style red). */
  triggerVariant?: 'outline' | 'danger' | 'ghost';
  /** If true, render only an icon trigger (table rows). */
  iconOnly?: boolean;
}

export function ConfirmDeleteDialog({
  onConfirm,
  title,
  description,
  redirectTo,
  triggerLabel = 'Excluir',
  triggerVariant = 'outline',
  iconOnly = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const res = (await onConfirm()) ?? {};
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Removido.');
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-red-500 hover:bg-red-50"
            aria-label="Excluir"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <Button type="button" variant={triggerVariant} className={triggerVariant === 'outline' ? 'border-red-200 text-red-700 hover:bg-red-50' : undefined}>
            <Trash2 className="size-4" /> {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          Essa ação não pode ser desfeita. Se você apenas quer arquivar, use "Desligar" ou marque como inativo no
          cadastro.
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={pending}>
            {pending ? 'Excluindo…' : 'Confirmar exclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
