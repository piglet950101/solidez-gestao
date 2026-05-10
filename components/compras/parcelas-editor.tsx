'use client';
import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { gerarParcelas } from '@/lib/rateio';
import { formatBRL } from '@/lib/format';

interface Parcela {
  data_vencimento: string;
  valor: number;
}

interface ParcelasEditorProps {
  valorTotal: number;
  parcelas: Parcela[];
  onChange: (parcelas: Parcela[]) => void;
}

export function ParcelasEditor({ valorTotal, parcelas, onChange }: ParcelasEditorProps) {
  const total = parcelas.reduce((acc, p) => acc + (p.valor || 0), 0);
  const ok = Math.abs(total - valorTotal) < 0.01;

  function gerarAuto(qtd: number) {
    const start = new Date();
    start.setDate(start.getDate() + 30);
    onChange(gerarParcelas(valorTotal, qtd, start, 30));
  }

  function update(idx: number, patch: Partial<Parcela>) {
    onChange(parcelas.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Parcelas</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 6, 10, 12].map((q) => (
            <Button key={q} type="button" variant="outline" size="sm" onClick={() => gerarAuto(q)}>
              {q}x
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {parcelas.map((p, i) => (
          <div key={i} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-2 self-center text-center text-sm font-mono font-bold text-brand-500">
              #{i + 1}
            </div>
            <div className="col-span-5">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={p.data_vencimento}
                onChange={(e) => update(i, { data_vencimento: e.target.value })}
                required
              />
              <input type="hidden" name={`parcelas[${i}][data_vencimento]`} value={p.data_vencimento} />
            </div>
            <div className="col-span-4">
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={p.valor}
                onChange={(e) => update(i, { valor: Number(e.target.value) })}
                required
              />
              <input type="hidden" name={`parcelas[${i}][valor]`} value={p.valor} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(parcelas.filter((_, j) => j !== i))}
              className="col-span-1"
            >
              <Trash2 className="size-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-[10px] border border-brand-100 bg-brand-50 px-4 py-2 text-sm">
        <span className="text-brand-600">Soma das parcelas</span>
        <span className={ok ? 'font-mono font-bold text-emerald-700' : 'font-mono font-bold text-red-700'}>
          {formatBRL(total)} {ok ? '✓' : `(falta ${formatBRL(valorTotal - total)})`}
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          onChange([
            ...parcelas,
            { data_vencimento: new Date().toISOString().slice(0, 10), valor: 0 },
          ])
        }
      >
        <Plus className="size-4" /> Adicionar parcela
      </Button>
    </div>
  );
}
