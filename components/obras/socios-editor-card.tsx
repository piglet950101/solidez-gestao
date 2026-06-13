'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { atualizarSociosObra } from '@/actions/obras';

interface SocioOption { id: string; nome: string }
interface SocioRow { socio_id: string; nome: string; percentual: number }

interface Props {
  obraId: string;
  socios: SocioRow[];
  todosSocios: SocioOption[];
}

export function SociosEditorCard({ obraId, socios: socioInitial, todosSocios }: Props) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [rows, setRows] = React.useState<SocioRow[]>(socioInitial);
  const [pending, startTransition] = React.useTransition();

  const total = rows.reduce((s, r) => s + Number(r.percentual || 0), 0);
  const sociosDisponiveis = todosSocios.filter((s) => !rows.find((r) => r.socio_id === s.id));

  function add() {
    const next = sociosDisponiveis[0];
    if (!next) { toast.error('Sem sócios disponíveis pra adicionar.'); return; }
    setRows([...rows, { socio_id: next.id, nome: next.nome, percentual: Math.max(0, 100 - total) }]);
  }
  function remove(idx: number) { setRows(rows.filter((_, i) => i !== idx)); }
  function update(idx: number, patch: Partial<SocioRow>) {
    setRows(rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  function save() {
    if (Math.abs(total - 100) > 0.01 && rows.length > 0) {
      toast.error(`Soma dos percentuais = ${total.toFixed(2)}%. Precisa fechar em 100%.`);
      return;
    }
    const fd = new FormData();
    fd.set('socios_json', JSON.stringify(rows.map((r) => ({ socio_id: r.socio_id, percentual: r.percentual }))));
    startTransition(async () => {
      const res = await atualizarSociosObra(obraId, fd);
      if (res.error) { toast.error(res.error); return; }
      toast.success('Sócios atualizados.');
      setEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setRows(socioInitial);
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Sócios e percentuais</CardTitle>
        {!editing ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" /> Editar
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {!editing ? (
          rows.length ? (
            <ul className="space-y-2 text-sm">
              {rows.map((s) => (
                <li key={s.socio_id} className="flex items-center justify-between gap-2 rounded-[10px] bg-brand-50 px-3 py-2">
                  <span className="font-medium text-brand-800">{s.nome}</span>
                  <span className="font-mono text-base font-bold text-brand-900">{Number(s.percentual).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-500">Sem sócios cadastrados. Clique em "Editar" pra adicionar.</p>
          )
        ) : (
          <div className="space-y-3">
            {rows.map((r, idx) => (
              <div key={idx} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-7">
                  <Label className="text-xs">Sócio</Label>
                  <Select
                    value={r.socio_id}
                    onValueChange={(v) => {
                      const s = todosSocios.find((x) => x.id === v);
                      if (s) update(idx, { socio_id: s.id, nome: s.nome });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {todosSocios
                        .filter((s) => s.id === r.socio_id || !rows.find((rr) => rr.socio_id === s.id))
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">%</Label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={r.percentual || ''}
                    onChange={(e) => update(idx, { percentual: Number(e.target.value) })}
                    className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 font-mono text-sm"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" className="col-span-2" onClick={() => remove(idx)} aria-label="Remover">
                  <Trash2 className="size-4 text-red-600" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-100 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={add} disabled={sociosDisponiveis.length === 0}>
                <Plus className="size-3.5" /> Adicionar sócio
              </Button>
              <div className={`text-sm font-mono ${Math.abs(total - 100) < 0.01 ? 'text-emerald-700' : 'text-amber-700'}`}>
                Total: <strong>{total.toFixed(2)}%</strong>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={pending}>
                <X className="size-3.5" /> Cancelar
              </Button>
              <Button type="button" variant="accent" size="sm" onClick={save} disabled={pending}>
                <Check className="size-3.5" /> {pending ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
