'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { atenderRequisicao } from '@/actions/requisicoes';
import { formatBRL } from '@/lib/format';

interface Linha {
  id: string;
  item_id: string;
  nome: string;
  unidade: string;
  saldo_atual: number;
  valor_medio: number | null;
  quantidade_pedida: number;
  quantidade_atendida: number;
}

export function AtenderRequisicaoForm({ requisicaoId, linhas }: { requisicaoId: string; linhas: Linha[] }) {
  const router = useRouter();
  const [valoresAtender, setValoresAtender] = React.useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const l of linhas) {
      const pendente = Math.max(0, l.quantidade_pedida - l.quantidade_atendida);
      // Default: atende o pendente se houver saldo; senão atende o que dá
      out[l.item_id] = Math.min(pendente, l.saldo_atual);
    }
    return out;
  });
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const itens = linhas
      .map((l) => ({ item_id: l.item_id, quantidade: Number(valoresAtender[l.item_id] ?? 0) }))
      .filter((i) => i.quantidade > 0);
    if (itens.length === 0) {
      toast.error('Informe pelo menos uma quantidade > 0 para atender.');
      return;
    }
    // Pre-check saldos
    for (const i of itens) {
      const linha = linhas.find((l) => l.item_id === i.item_id);
      if (linha && i.quantidade > linha.saldo_atual) {
        toast.error(`Saldo insuficiente para ${linha.nome}: ${linha.saldo_atual} ${linha.unidade}`);
        return;
      }
    }
    const fd = new FormData();
    fd.set('itens_json', JSON.stringify(itens));
    startTransition(async () => {
      const res = await atenderRequisicao(requisicaoId, fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Saída registrada no estoque e custo atribuído à obra.');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-xs text-brand-600">
        Confirme as quantidades a entregar. Pré-preenchemos com o pendente quando há saldo. Saldo é validado antes de gravar.
      </p>
      <div className="overflow-hidden rounded-md border border-brand-100">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-xs uppercase tracking-wide text-brand-600">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right">Pedido</th>
              <th className="px-3 py-2 text-right">Já atendido</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2 text-right">Atender agora</th>
              <th className="px-3 py-2 text-right">Custo p/ obra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {linhas.map((l) => {
              const pendente = Math.max(0, l.quantidade_pedida - l.quantidade_atendida);
              const valor = Number(valoresAtender[l.item_id] ?? 0);
              const semSaldo = valor > l.saldo_atual;
              const custo = l.valor_medio != null ? valor * Number(l.valor_medio) : null;
              return (
                <tr key={l.id}>
                  <td className="px-3 py-2">{l.nome} <span className="text-xs text-brand-500">({l.unidade})</span></td>
                  <td className="px-3 py-2 text-right font-mono">{l.quantidade_pedida}</td>
                  <td className="px-3 py-2 text-right font-mono">{l.quantidade_atendida}</td>
                  <td className={`px-3 py-2 text-right font-mono ${l.saldo_atual < pendente ? 'text-amber-700' : 'text-brand-700'}`}>{l.saldo_atual}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      max={l.saldo_atual}
                      inputMode="decimal"
                      value={valor || ''}
                      onChange={(e) => setValoresAtender({ ...valoresAtender, [l.item_id]: Number(e.target.value) })}
                      disabled={pendente === 0}
                      className={`w-24 rounded-md border bg-white px-2 py-1 text-right font-mono text-sm ${semSaldo ? 'border-red-300 text-red-700' : 'border-brand-200'}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-brand-700">{custo != null ? formatBRL(custo) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          <Check className="size-4" /> {pending ? 'Atendendo…' : 'Confirmar atendimento'}
        </Button>
      </div>
    </form>
  );
}
