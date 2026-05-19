'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextareaField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { criarRequisicao } from '@/actions/requisicoes';

interface Obra { id: string; nome: string }
interface Item { id: string; nome: string; unidade: string; saldo_atual: number; valor_medio: number | null }

type Linha = { item_id: string; quantidade: number; observacao?: string };

export function NovaRequisicaoForm({ obras, itens }: { obras: Obra[]; itens: Item[] }) {
  const router = useRouter();
  const [obraId, setObraId] = React.useState<string>(obras[0]?.id ?? '');
  const [observacao, setObservacao] = React.useState<string>('');
  const [linhas, setLinhas] = React.useState<Linha[]>([{ item_id: '', quantidade: 1 }]);
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!obraId) { toast.error('Escolha a obra.'); return; }
    const validas = linhas.filter((l) => l.item_id && l.quantidade > 0);
    if (validas.length === 0) { toast.error('Adicione pelo menos um item com quantidade > 0.'); return; }
    const fd = new FormData();
    fd.set('obra_id', obraId);
    if (observacao) fd.set('observacao', observacao);
    fd.set('itens_json', JSON.stringify(validas));
    startTransition(async () => {
      const res = await criarRequisicao(fd);
      if (res.error) { toast.error(res.error); return; }
      toast.success('Requisição enviada.');
      router.push('/requisicoes');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Obra *</Label>
        <Select value={obraId} onValueChange={setObraId}>
          <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
          <SelectContent>
            {obras.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Itens pedidos</Label>
          <span className="text-xs text-brand-500">{linhas.filter((l) => l.item_id).length} item(s)</span>
        </div>
        {linhas.map((linha, idx) => {
          const it = itens.find((i) => i.id === linha.item_id);
          const semSaldo = it && Number(linha.quantidade) > Number(it.saldo_atual);
          return (
            <div key={idx} className="space-y-1 rounded-md border border-brand-100 bg-white p-2">
              <div className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-7">
                  <Label className="text-xs">{idx === 0 ? 'Item' : ''}</Label>
                  <Select
                    value={linha.item_id || '__none__'}
                    onValueChange={(v) => {
                      const novo = v === '__none__' ? '' : v;
                      setLinhas(linhas.map((l, i) => i === idx ? { ...l, item_id: novo } : l));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— selecione —</SelectItem>
                      {itens.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.nome} — saldo {Number(i.saldo_atual).toFixed(3).replace(/\.?0+$/, '')} {i.unidade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">{idx === 0 ? `Qtd${it ? ` (${it.unidade})` : ''}` : ''}</Label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    inputMode="decimal"
                    value={linha.quantidade || ''}
                    onChange={(e) => setLinhas(linhas.map((l, i) => i === idx ? { ...l, quantidade: Number(e.target.value) } : l))}
                    className={`block w-full rounded-md border bg-white px-3 py-2 font-mono text-sm ${semSaldo ? 'border-red-300' : 'border-brand-200'}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-1"
                  onClick={() => setLinhas(linhas.filter((_, i) => i !== idx))}
                  aria-label="Remover linha"
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              </div>
              {semSaldo ? (
                <p className="text-xs text-red-700">Saldo insuficiente: tem {it?.saldo_atual} {it?.unidade} em estoque.</p>
              ) : null}
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => setLinhas([...linhas, { item_id: '', quantidade: 1 }])}>
          <Plus className="size-4" /> Adicionar item
        </Button>
      </div>

      <TextareaField
        label="Observação (opcional)"
        name="observacao"
        rows={2}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        placeholder="Ex.: pra concretagem de amanhã às 7h"
      />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Enviando…' : 'Enviar requisição'}
        </Button>
      </div>
    </form>
  );
}
