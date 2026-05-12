'use client';
import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calcularRateio, type RateioInputObra, type RateioModo } from '@/lib/rateio';
import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ObraOption {
  id: string;
  nome: string;
}

interface RateioFormProps {
  obras: ObraOption[];
  valorTotal: number;
  modo: RateioModo;
  onModoChange: (modo: RateioModo) => void;
  alocacoes: RateioInputObra[];
  onChange: (alocacoes: RateioInputObra[]) => void;
}

export function RateioForm({ obras, valorTotal, modo, onModoChange, alocacoes, onChange }: RateioFormProps) {
  const preview = React.useMemo(() => {
    if (valorTotal <= 0 || alocacoes.length === 0) return [];
    try {
      return calcularRateio(modo, valorTotal, alocacoes);
    } catch {
      return [];
    }
  }, [modo, valorTotal, alocacoes]);

  function addObra() {
    const usadas = new Set(alocacoes.map((a) => a.obra_id));
    const livre = obras.find((o) => !usadas.has(o.id));
    if (!livre) return;
    onChange([...alocacoes, { obra_id: livre.id }]);
  }

  function update(idx: number, patch: Partial<RateioInputObra>) {
    onChange(alocacoes.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }

  function remove(idx: number) {
    onChange(alocacoes.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Modo de rateio</Label>
        <Select value={modo} onValueChange={(v) => onModoChange(v as RateioModo)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="igual">Dividir igualmente</SelectItem>
            <SelectItem value="percentual">Percentual por obra</SelectItem>
            <SelectItem value="valor">Valor por obra (R$)</SelectItem>
            <SelectItem value="quantidade">Quantidade por obra</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {alocacoes.map((a, i) => {
          const previewItem = preview[i];
          return (
            <div key={i} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-5">
                <Label>Obra</Label>
                <Select value={a.obra_id} onValueChange={(v) => update(i, { obra_id: v })}>
                  <SelectTrigger>
                    <SelectValue />
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

              {modo === 'percentual' && (
                <div className="col-span-3">
                  <Label>%</Label>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={a.percentual ?? ''}
                    onChange={(e) => update(i, { percentual: Number(e.target.value) })}
                  />
                </div>
              )}
              {modo === 'valor' && (
                <div className="col-span-3">
                  <Label>Valor</Label>
                  <CurrencyInput
                    value={a.valor ?? null}
                    onChange={(v) => update(i, { valor: v })}
                  />
                </div>
              )}
              {modo === 'quantidade' && (
                <div className="col-span-3">
                  <Label>Qtd</Label>
                  <Input
                    type="number"
                    step="0.001"
                    inputMode="decimal"
                    value={a.quantidade ?? ''}
                    onChange={(e) => update(i, { quantidade: Number(e.target.value) })}
                  />
                </div>
              )}
              {modo === 'igual' && <div className="col-span-3" />}

              <div
                className={cn(
                  'col-span-3 self-end rounded-[10px] bg-brand-50 px-3 py-2 text-right text-sm font-mono font-semibold text-brand-800',
                  previewItem == null && 'opacity-40',
                )}
              >
                {previewItem ? formatBRL(previewItem.valor_alocado) : '—'}
              </div>

              <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="col-span-1">
                <Trash2 className="size-4 text-red-500" />
              </Button>

              <input type="hidden" name={`alocacoes[${i}][obra_id]`} value={a.obra_id} />
              <input type="hidden" name={`alocacoes[${i}][percentual]`} value={a.percentual ?? ''} />
              <input type="hidden" name={`alocacoes[${i}][valor]`} value={a.valor ?? ''} />
              <input type="hidden" name={`alocacoes[${i}][quantidade]`} value={a.quantidade ?? ''} />
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={addObra}>
          <Plus className="size-4" /> Incluir obra
        </Button>
      </div>
    </div>
  );
}
