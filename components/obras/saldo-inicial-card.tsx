'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatBRL, formatDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

interface Props {
  obraId: string;
  saldoInicial: number | null;
  saldoInicialData: string | null;
}

export function SaldoInicialCard({ obraId, saldoInicial, saldoInicialData }: Props) {
  const supabase = React.useMemo(() => createClient(), []);
  const [editing, setEditing] = React.useState(false);
  const [valor, setValor] = React.useState(saldoInicial ?? 0);
  const [data, setData] = React.useState(saldoInicialData ?? new Date().toISOString().slice(0, 10));
  const [pending, startTransition] = React.useTransition();

  async function save() {
    startTransition(async () => {
      const { error } = await supabase
        .from('obras')
        .update({ saldo_inicial: valor, saldo_inicial_data: data })
        .eq('id', obraId);
      if (error) toast.error(error.message);
      else {
        toast.success('Saldo inicial salvo');
        setEditing(false);
        window.location.reload();
      }
    });
  }

  return (
    <div className="rounded-[14px] border border-brand-100 bg-white shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-brand-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-brand-500">Saldo inicial</h3>
          <p className="text-xs text-brand-500">Caixa de abertura na data de go-live do sistema</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>
      <div className="px-5 py-4">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="saldo">Valor</Label>
              <Input
                id="saldo"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={valor || ''}
                onChange={(e) => setValor(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data">Data de referência</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="accent" size="sm" onClick={save} disabled={pending}>
                {pending ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="font-mono text-2xl font-bold text-brand-900">
              {saldoInicial != null ? formatBRL(saldoInicial) : '—'}
            </div>
            <div className="text-xs text-brand-500">
              {saldoInicialData ? `Referência: ${formatDate(saldoInicialData)}` : 'Sem saldo de abertura cadastrado'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
