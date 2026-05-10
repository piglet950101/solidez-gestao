'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RateioForm } from '@/components/compras/rateio-form';
import { ParcelasEditor } from '@/components/compras/parcelas-editor';
import { criarCompra } from '@/actions/compras';
import { gerarParcelas, type RateioInputObra, type RateioModo } from '@/lib/rateio';

interface Option {
  id: string;
  nome: string;
  empresa_id?: string;
}

interface NovaCompraFormProps {
  empresas: Option[];
  obras: Option[];
  fornecedores: Option[];
  categorias: Option[];
  socios: Option[];
}

export function NovaCompraForm({ empresas, obras, fornecedores, categorias, socios }: NovaCompraFormProps) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = React.useState(empresas[0]?.id ?? '');
  const [valorTotal, setValorTotal] = React.useState(0);
  const [modoRateio, setModoRateio] = React.useState<RateioModo>('igual');
  const [alocacoes, setAlocacoes] = React.useState<RateioInputObra[]>([]);
  const [parcelas, setParcelas] = React.useState<{ data_vencimento: string; valor: number }[]>(() =>
    gerarParcelas(0, 1, new Date(), 30),
  );
  const [quemPagou, setQuemPagou] = React.useState<'empresa' | 'socio' | 'funcionario'>('empresa');
  const [pagoSocio, setPagoSocio] = React.useState<string>('');
  const [pending, startTransition] = React.useTransition();

  const obrasDaEmpresa = obras.filter((o) => o.empresa_id === empresaId);

  React.useEffect(() => {
    setParcelas((prev) => prev.map((p, i) => ({ ...p, valor: i === 0 ? valorTotal : 0 })));
  }, [valorTotal]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('empresa_id', empresaId);
    fd.set('valor_total', String(valorTotal));
    fd.set('rateio_modo', modoRateio);
    fd.set('alocacoes_json', JSON.stringify(alocacoes));
    fd.set('parcelas_json', JSON.stringify(parcelas));
    fd.set('quem_pagou', quemPagou);
    if (quemPagou === 'socio') fd.set('pago_por_socio_id', pagoSocio);

    startTransition(async () => {
      const result = await criarCompra(fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Compra registrada');
        router.push('/compras');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Empresa</Label>
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="data_compra">Data da compra</Label>
          <Input id="data_compra" name="data_compra" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="descricao">Descrição</Label>
          <Input id="descricao" name="descricao" required maxLength={140} placeholder="Ex.: 100 luvas + EPI · NF 12345" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="valor_total_input">Valor total</Label>
          <Input
            id="valor_total_input"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={valorTotal || ''}
            onChange={(e) => setValorTotal(Number(e.target.value))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select name="categoria_id">
            <SelectTrigger>
              <SelectValue placeholder="(opcional)" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Fornecedor</Label>
          <Select name="fornecedor_id">
            <SelectTrigger>
              <SelectValue placeholder="(opcional)" />
            </SelectTrigger>
            <SelectContent>
              {fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Quem pagou</Label>
          <Select value={quemPagou} onValueChange={(v) => setQuemPagou(v as typeof quemPagou)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="empresa">Empresa (CNPJ)</SelectItem>
              <SelectItem value="socio">Sócio do bolso (gera reembolso)</SelectItem>
              <SelectItem value="funcionario">Funcionário (gera reembolso)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {quemPagou === 'socio' && (
          <div className="space-y-1.5">
            <Label>Sócio que pagou</Label>
            <Select value={pagoSocio} onValueChange={setPagoSocio}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {socios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Rateio entre obras</h3>
        <RateioForm
          obras={obrasDaEmpresa}
          valorTotal={valorTotal}
          modo={modoRateio}
          onModoChange={setModoRateio}
          alocacoes={alocacoes}
          onChange={setAlocacoes}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600">Parcelamento</h3>
        <ParcelasEditor valorTotal={valorTotal} parcelas={parcelas} onChange={setParcelas} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" name="observacoes" maxLength={500} />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" size="lg" disabled={pending}>
          {pending ? 'Salvando…' : 'Registrar compra'}
        </Button>
      </div>
    </form>
  );
}
