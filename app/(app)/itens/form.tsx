'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextField, TextareaField, Field } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { criarItem, atualizarItem } from '@/actions/itens';

interface Categoria { id: string; nome: string }

interface ItemRow {
  id: string;
  nome: string;
  codigo_interno: string | null;
  unidade: string;
  categoria_id: string | null;
  estoque_minimo: number | null;
  controla_validade: boolean;
  eh_epi: boolean;
  observacoes: string | null;
}

const UNIDADES = ['un', 'kg', 'g', 'm', 'm²', 'm³', 'L', 'mL', 'sc', 'cx', 'par', 'rl', 'pç', 'kit'];

export function ItemForm({ categorias, item }: { categorias: Categoria[]; item?: ItemRow }) {
  const router = useRouter();
  const isEdit = !!item;
  const [unidade, setUnidade] = React.useState<string>(item?.unidade ?? 'un');
  const [categoriaId, setCategoriaId] = React.useState<string>(item?.categoria_id ?? '__none__');
  const [ehEpi, setEhEpi] = React.useState<boolean>(item?.eh_epi ?? false);
  const [controlaValidade, setControlaValidade] = React.useState<boolean>(item?.controla_validade ?? false);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('unidade', unidade);
    if (categoriaId !== '__none__') fd.set('categoria_id', categoriaId);
    else fd.delete('categoria_id');
    fd.set('eh_epi', ehEpi ? 'true' : 'false');
    fd.set('controla_validade', controlaValidade ? 'true' : 'false');
    startTransition(async () => {
      const res = isEdit ? await atualizarItem(item!.id, fd) : await criarItem(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? 'Item atualizado.' : 'Item cadastrado.');
      router.push('/itens');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField label="Nome" name="nome" required defaultValue={item?.nome ?? ''} className="md:col-span-2" placeholder="Ex.: Luva nitrílica preta tamanho M" />
        <TextField label="Código interno" name="codigo_interno" defaultValue={item?.codigo_interno ?? ''} placeholder="(opcional)" />
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
        <Field label="Categoria" name="categoria_id">
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— sem categoria —</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Estoque mínimo" name="estoque_minimo" type="number" step="0.001" defaultValue={item?.estoque_minimo?.toString() ?? ''} hint="Opcional. Alerta visual quando saldo cair abaixo." />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 rounded-md border border-brand-100 bg-white p-3 text-sm">
          <input type="checkbox" checked={ehEpi} onChange={(e) => setEhEpi(e.target.checked)} className="size-4 accent-brand-700" />
          <span>É EPI (Equipamento de Proteção Individual)</span>
        </label>
        <label className="flex items-center gap-2 rounded-md border border-brand-100 bg-white p-3 text-sm">
          <input type="checkbox" checked={controlaValidade} onChange={(e) => setControlaValidade(e.target.checked)} className="size-4 accent-brand-700" />
          <span>Controla validade (CA / lote)</span>
        </label>
      </div>

      <TextareaField label="Observações" name="observacoes" rows={2} defaultValue={item?.observacoes ?? ''} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Cadastrar item'}
        </Button>
      </div>
    </form>
  );
}
