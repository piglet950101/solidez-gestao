'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatBRL } from '@/lib/format';
import { ratearImposto } from '@/actions/imposto';
import { cn } from '@/lib/utils';

interface Obra { id: string; nome: string }
interface AlocAtual { obra_id: string; valor: number }

export function RatearImpostoForm({
  impostoId,
  valorTotal,
  obras,
  alocacoesAtuais,
}: {
  impostoId: string;
  valorTotal: number;
  obras: Obra[];
  alocacoesAtuais: AlocAtual[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const inicial: Record<string, number> = {};
  for (const o of obras) inicial[o.id] = 0;
  for (const a of alocacoesAtuais) inicial[a.obra_id] = Number(a.valor);
  const [valores, setValores] = React.useState<Record<string, number>>(inicial);

  const total = Object.values(valores).reduce((s, v) => s + v, 0);
  const diff = valorTotal - total;
  const ok = Math.abs(diff) < 0.01;

  function dividirIgual() {
    const por = Number((valorTotal / obras.length).toFixed(2));
    const sobra = Number((valorTotal - por * obras.length).toFixed(2));
    const next: Record<string, number> = {};
    obras.forEach((o, i) => { next[o.id] = i === 0 ? por + sobra : por; });
    setValores(next);
  }

  function limpar() {
    const next: Record<string, number> = {};
    obras.forEach((o) => { next[o.id] = 0; });
    setValores(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ok) {
      toast.error(`A soma (${formatBRL(total)}) deve ser igual ao total do imposto (${formatBRL(valorTotal)}).`);
      return;
    }
    const alocacoes = obras
      .filter((o) => valores[o.id] && valores[o.id]! > 0)
      .map((o) => ({ obra_id: o.id, valor: valores[o.id]! }));

    const fd = new FormData();
    fd.set('imposto_id', impostoId);
    fd.set('alocacoes_json', JSON.stringify(alocacoes));

    startTransition(async () => {
      const res = await ratearImposto(fd);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Imposto rateado.');
        router.push('/impostos');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={dividirIgual}>
          Dividir igualmente
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={limpar}>
          Zerar
        </Button>
        <span className="text-xs text-brand-500">Total do imposto: <strong className="font-mono text-brand-900">{formatBRL(valorTotal)}</strong></span>
      </div>

      <div className="space-y-2">
        {obras.map((o) => (
          <div key={o.id} className="grid grid-cols-12 items-center gap-3 rounded-[10px] border border-brand-100 bg-white px-4 py-3">
            <div className="col-span-7">
              <div className="font-medium text-brand-900">{o.nome}</div>
            </div>
            <div className="col-span-5">
              <Label className="sr-only">Valor</Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={valores[o.id] || ''}
                onChange={(e) => setValores({ ...valores, [o.id]: Number(e.target.value) || 0 })}
                placeholder="0,00"
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          'flex items-center justify-between rounded-[10px] border-2 px-4 py-3',
          ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50',
        )}
      >
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Soma das alocações</div>
          <div className={cn('font-mono text-xl font-bold', ok ? 'text-emerald-700' : 'text-red-700')}>
            {formatBRL(total)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
            {ok ? 'Bate com o total ✓' : 'Diferença'}
          </div>
          {!ok && (
            <div className="font-mono text-sm text-red-700">
              {diff > 0 ? 'Falta ' : 'Sobra '}
              {formatBRL(Math.abs(diff))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending || !ok}>
          {pending ? 'Salvando…' : 'Salvar rateio'}
        </Button>
      </div>
    </form>
  );
}
