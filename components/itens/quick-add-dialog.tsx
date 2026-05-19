'use client';
import * as React from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { criarItem } from '@/actions/itens';

const UNIDADES = ['un', 'kg', 'g', 'm', 'm²', 'm³', 'L', 'mL', 'sc', 'cx', 'par', 'rl', 'pç', 'kit'];

interface Props {
  onCreated: (item: { id: string; nome: string; unidade: string }) => void;
}

export function ItemQuickAddDialog({ onCreated }: Props) {
  const [open, setOpen] = React.useState(false);
  const [unidade, setUnidade] = React.useState('un');
  const [ehEpi, setEhEpi] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Stop the submit event from bubbling to the outer <form> (compras/nova).
    // Without this, the dialog submit also triggers the compra form submit
    // through React's synthetic event tree (see lessons from the fornecedor
    // quick-add fix in 9866a16).
    e.preventDefault();
    e.stopPropagation();
    const fd = new FormData(e.currentTarget);
    fd.set('unidade', unidade);
    fd.set('eh_epi', ehEpi ? 'true' : 'false');
    fd.set('controla_validade', 'false');
    startTransition(async () => {
      const res = await criarItem(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.id && res.nome) {
        toast.success(`Item "${res.nome}" cadastrado e selecionado.`);
        onCreated({ id: res.id, nome: res.nome, unidade });
        setOpen(false);
        setEhEpi(false);
        setUnidade('un');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Cadastrar novo item">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar novo item</DialogTitle>
          <DialogDescription>
            Cadastro rápido — nome curto + unidade. Depois de salvar, o item já fica selecionado na linha da compra.
            Detalhes adicionais (código, estoque mínimo, observações) você completa em /itens depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <TextField label="Nome" name="nome" required autoFocus placeholder="Ex.: Broca metal 8mm" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Unidade *</Label>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-end gap-2 pb-1.5 text-sm">
              <input
                type="checkbox"
                checked={ehEpi}
                onChange={(e) => setEhEpi(e.target.checked)}
                className="size-4 accent-brand-700"
              />
              <span>É EPI</span>
            </label>
          </div>
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
