'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';
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
import { TextField, TextareaField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { transferirVeiculo } from '@/actions/veiculos';

interface Props {
  veiculoId: string;
  obraAtualNome: string | null;
  obras: { id: string; nome: string }[];
}

export function TransferirVeiculoDialog({ veiculoId, obraAtualNome, obras }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [novaObraId, setNovaObraId] = React.useState<string>('');
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!novaObraId) {
      toast.error('Selecione a obra destino.');
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set('nova_obra_id', novaObraId);
    startTransition(async () => {
      const res = await transferirVeiculo(veiculoId, fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Veículo transferido.');
      setOpen(false);
      setNovaObraId('');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Truck className="size-4" /> Transferir para outra obra
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir veículo</DialogTitle>
          <DialogDescription>
            {obraAtualNome
              ? `Hoje vinculado a ${obraAtualNome}. A alocação atual será encerrada no dia anterior à transferência.`
              : 'Sem vínculo ativo. Será criada a primeira alocação para a obra destino.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nova obra</Label>
            <Select value={novaObraId} onValueChange={setNovaObraId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a obra destino" />
              </SelectTrigger>
              <SelectContent>
                {obras.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TextField
            label="Data da transferência"
            name="data_transferencia"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
          <TextareaField label="Observação" name="observacao" rows={2} hint="Opcional. Ex: motivo da transferência." />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? 'Transferindo…' : 'Confirmar transferência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
