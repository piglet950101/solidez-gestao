'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextField, TextareaField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { registrarEntregaEpi } from '@/actions/epi';
import { formatBRL } from '@/lib/format';

interface Funcionario {
  id: string;
  nome: string;
  obra_atual_id: string | null;
  obras: { nome: string } | null;
}
interface Item {
  id: string;
  nome: string;
  unidade: string;
  saldo_atual: number;
  valor_medio: number | null;
  controla_validade: boolean;
}

const MOTIVOS = [
  { value: 'admissao', label: 'Admissão' },
  { value: 'troca_desgaste', label: 'Troca por desgaste' },
  { value: 'troca_validade', label: 'Troca por vencimento' },
  { value: 'reposicao', label: 'Reposição' },
];

type Linha = {
  item_id: string;
  quantidade: number;
  numero_ca?: string;
  validade?: string;
  lote?: string;
  motivo?: string;
};

export function EntregaEpiForm({
  funcionarios,
  itens,
  funcionarioInicial,
}: {
  funcionarios: Funcionario[];
  itens: Item[];
  funcionarioInicial: string | null;
}) {
  const router = useRouter();
  const [funcionarioId, setFuncionarioId] = React.useState<string>(funcionarioInicial ?? '');
  const [dataEntrega, setDataEntrega] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = React.useState<string>('');
  const [linhas, setLinhas] = React.useState<Linha[]>([{ item_id: '', quantidade: 1, motivo: 'admissao' }]);
  const [pending, startTransition] = React.useTransition();

  const func = funcionarios.find((f) => f.id === funcionarioId);
  const obraAtualNome = func?.obras?.nome ?? null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!funcionarioId) { toast.error('Selecione o funcionário.'); return; }
    if (!func?.obra_atual_id) {
      toast.error('Funcionário sem obra atual — vincule-o a uma obra antes de entregar EPI.');
      return;
    }
    const validas = linhas.filter((l) => l.item_id && l.quantidade > 0);
    if (validas.length === 0) { toast.error('Adicione pelo menos um EPI com quantidade > 0.'); return; }
    // Pre-check saldos
    for (const l of validas) {
      const it = itens.find((i) => i.id === l.item_id);
      if (it && l.quantidade > it.saldo_atual) {
        toast.error(`Saldo insuficiente de ${it.nome}: ${it.saldo_atual} ${it.unidade} em estoque.`);
        return;
      }
    }
    const fd = new FormData();
    fd.set('funcionario_id', funcionarioId);
    fd.set('data_entrega', dataEntrega);
    if (observacao) fd.set('observacao', observacao);
    fd.set('itens_json', JSON.stringify(validas));
    startTransition(async () => {
      const res = await registrarEntregaEpi(fd);
      if (res.error) { toast.error(res.error); return; }
      toast.success('EPI entregue · saída do estoque + custo na obra registrados.');
      router.push(`/funcionarios/${funcionarioId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Funcionário *</Label>
          <Select value={funcionarioId} onValueChange={setFuncionarioId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {funcionarios.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}{f.obras?.nome ? ` · ${f.obras.nome}` : ' · sem obra'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {func && !obraAtualNome ? (
            <p className="text-xs text-amber-700">
              Este funcionário não tem obra atual. Vincule-o em /funcionarios/{funcionarioId} antes.
            </p>
          ) : null}
          {obraAtualNome ? (
            <p className="text-xs text-brand-600">
              Custo da entrega será apropriado em: <strong>{obraAtualNome}</strong> (obra atual). Não migra se o funcionário for transferido depois.
            </p>
          ) : null}
        </div>
        <TextField
          label="Data da entrega *"
          name="data_entrega"
          type="date"
          required
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>EPIs entregues</Label>
        {linhas.map((linha, idx) => {
          const it = itens.find((i) => i.id === linha.item_id);
          const valor = it?.valor_medio != null ? Number(it.valor_medio) * Number(linha.quantidade) : null;
          const semSaldo = it && linha.quantidade > Number(it.saldo_atual);
          return (
            <div key={idx} className="space-y-2 rounded-md border border-brand-100 bg-white p-3">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  <Label className="text-xs">Item</Label>
                  <Select
                    value={linha.item_id || '__none__'}
                    onValueChange={(v) => {
                      const novo = v === '__none__' ? '' : v;
                      setLinhas(linhas.map((l, i) => i === idx ? { ...l, item_id: novo } : l));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o EPI" /></SelectTrigger>
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
                <div className="col-span-2">
                  <Label className="text-xs">Qtd{it ? ` (${it.unidade})` : ''}</Label>
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
                <div className="col-span-3">
                  <Label className="text-xs">Motivo</Label>
                  <Select
                    value={linha.motivo || 'admissao'}
                    onValueChange={(v) => setLinhas(linhas.map((l, i) => i === idx ? { ...l, motivo: v } : l))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MOTIVOS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-1 self-end"
                  onClick={() => setLinhas(linhas.filter((_, i) => i !== idx))}
                  aria-label="Remover EPI"
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <Label className="text-xs">CA (Certificado de Aprovação)</Label>
                  <input
                    type="text"
                    value={linha.numero_ca || ''}
                    onChange={(e) => setLinhas(linhas.map((l, i) => i === idx ? { ...l, numero_ca: e.target.value } : l))}
                    placeholder="Ex.: 28456"
                    className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Validade</Label>
                  <input
                    type="date"
                    value={linha.validade || ''}
                    onChange={(e) => setLinhas(linhas.map((l, i) => i === idx ? { ...l, validade: e.target.value } : l))}
                    className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Lote</Label>
                  <input
                    type="text"
                    value={linha.lote || ''}
                    onChange={(e) => setLinhas(linhas.map((l, i) => i === idx ? { ...l, lote: e.target.value } : l))}
                    placeholder="Opcional"
                    className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {valor != null ? (
                <p className="text-xs text-brand-500">Custo desta linha: <strong className="font-mono text-brand-800">{formatBRL(valor)}</strong></p>
              ) : null}
              {semSaldo ? (
                <p className="text-xs text-red-700">Saldo insuficiente: {it?.saldo_atual} {it?.unidade} em estoque.</p>
              ) : null}
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => setLinhas([...linhas, { item_id: '', quantidade: 1, motivo: 'reposicao' }])}>
          <Plus className="size-4" /> Adicionar EPI
        </Button>
      </div>

      <TextareaField
        label="Observação"
        name="observacao"
        rows={2}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        placeholder="Opcional"
      />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancelar</Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Registrando…' : 'Registrar entrega'}
        </Button>
      </div>
    </form>
  );
}
