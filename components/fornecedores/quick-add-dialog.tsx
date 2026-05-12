'use client';
import * as React from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
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
import { TextField, TextareaField } from '@/components/ui/form-field';
import { criarFornecedor } from '@/actions/fornecedores';

interface Props {
  onCreated: (fornecedor: { id: string; nome: string }) => void;
}

export function FornecedorQuickAddDialog({ onCreated }: Props) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Stop the synthetic submit event from bubbling to the outer <form> (the
    // compras/nova form). Radix Dialog renders via a Portal so the dialog's
    // form is outside the outer form in the DOM, but React's synthetic event
    // system still bubbles through the component tree — without this guard,
    // clicking "Cadastrar e usar" triggers BOTH criarFornecedor and the outer
    // criarCompra in the same RSC batch.
    e.stopPropagation();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await criarFornecedor(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.id && res.nome) {
        toast.success(`Fornecedor "${res.nome}" cadastrado e selecionado.`);
        onCreated({ id: res.id, nome: res.nome });
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Cadastrar novo fornecedor">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar novo fornecedor</DialogTitle>
          <DialogDescription>
            Cadastro rápido — só o nome é obrigatório. Depois de salvar, ele já fica selecionado no campo Fornecedor da compra.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <TextField label="Nome / Razão social" name="nome" required autoFocus placeholder="Ex.: Casa do Cimento, Premix, etc." />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextField label="Documento" name="documento" placeholder="CPF ou CNPJ (opcional)" />
            <TextField label="Contato" name="contato" placeholder="Telefone (opcional)" />
          </div>
          <TextareaField label="Observações" name="observacoes" rows={2} hint="Opcional. Ex: prazo médio, forma de pagamento." />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? 'Salvando…' : 'Cadastrar e usar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
