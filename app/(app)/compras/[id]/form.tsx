'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TextField, TextareaField } from '@/components/ui/form-field';
import { atualizarCompraBasico } from '@/actions/compras';
import { FORMATOS_PAGAMENTO } from '@/lib/formato-pagamento';
import type { Compra } from '@/types/database';

export function EditarCompraBasicoForm({ compra }: { compra: Compra }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [formatoPagamento, setFormatoPagamento] = React.useState<string>(compra.formato_pagamento ?? '');

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data_compra = String(fd.get('data_compra') ?? '');
    const descricao = String(fd.get('descricao') ?? '').trim();
    const observacoes = String(fd.get('observacoes') ?? '').trim() || null;
    if (!data_compra || !descricao) {
      toast.error('Data e descrição são obrigatórias.');
      return;
    }
    startTransition(async () => {
      const res = await atualizarCompraBasico(compra.id, {
        data_compra,
        descricao,
        observacoes,
        formato_pagamento: formatoPagamento || null,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success('Compra atualizada.');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="Data da compra" name="data_compra" type="date" required defaultValue={compra.data_compra} />
        <div className="space-y-1.5">
          <Label>Forma de pagamento</Label>
          <Select
            value={formatoPagamento || '__none__'}
            onValueChange={(v) => setFormatoPagamento(v === '__none__' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="(não informado)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— não informado —</SelectItem>
              {FORMATOS_PAGAMENTO.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TextField label="Descrição" name="descricao" required maxLength={200} defaultValue={compra.descricao} className="md:col-span-2" />
      </div>
      <TextareaField label="Observações" name="observacoes" rows={3} defaultValue={compra.observacoes ?? ''} />
      <div className="flex justify-end">
        <Button type="submit" variant="accent" disabled={pending}>{pending ? 'Salvando…' : 'Salvar alterações'}</Button>
      </div>
    </form>
  );
}
