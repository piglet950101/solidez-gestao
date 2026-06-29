import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface ParcelaRow {
  id: string;
  num_parcela: number;
  data_vencimento: string;
  valor: number;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  data_pagamento: string | null;
  compras: {
    id: string;
    descricao: string;
    data_compra: string;
    empresas: { nome: string; cnpj: string | null } | null;
    fornecedores: { nome: string } | null;
    compra_alocacoes: { valor_alocado: number; obras: { id: string; nome: string } | null }[];
  } | null;
}

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'outline'> = {
  pago: 'green',
  pendente: 'amber',
  atrasado: 'red',
  cancelado: 'outline',
};

const STATUS_LABEL: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Vencido',
  cancelado: 'Cancelado',
};

export default async function ContasAPagarPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; empresa?: string }>;
}) {
  const sp = await searchParams;
  const statusFilter = sp.status ?? 'abertas';
  const empresaFilter = sp.empresa ?? '';

  const supabase = await createClient();

  let q = supabase
    .from('parcelas')
    .select(`
      id, num_parcela, data_vencimento, valor, status, data_pagamento,
      compras!inner(
        id, descricao, data_compra, empresa_id,
        empresas(nome, cnpj),
        fornecedores(nome),
        compra_alocacoes(valor_alocado, obras(id, nome))
      )
    `)
    .order('data_vencimento', { ascending: true });

  if (statusFilter === 'abertas') {
    q = q.in('status', ['pendente', 'atrasado']);
  } else if (statusFilter !== 'todas') {
    q = q.eq('status', statusFilter as 'pendente' | 'pago' | 'atrasado' | 'cancelado');
  }
  if (empresaFilter) {
    q = q.eq('compras.empresa_id', empresaFilter);
  }

  const [{ data: parcelasRaw }, { data: empresas }] = await Promise.all([
    q,
    supabase.from('empresas').select('id, nome').eq('ativo', true).order('nome'),
  ]);

  const parcelas = (parcelasRaw ?? []) as unknown as ParcelaRow[];

  // Totais por status
  const totais = parcelas.reduce(
    (acc, p) => {
      acc.total += Number(p.valor);
      if (p.status === 'pendente') acc.pendente += Number(p.valor);
      else if (p.status === 'atrasado') acc.atrasado += Number(p.valor);
      else if (p.status === 'pago') acc.pago += Number(p.valor);
      return acc;
    },
    { total: 0, pendente: 0, atrasado: 0, pago: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a pagar"
        description="Todas as parcelas de compras com vencimento, valor, status, empresa responsável e obras vinculadas."
      />

      {/* Cards de totais */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Total exibido" valor={totais.total} tone="brand" />
        <SummaryCard label="A vencer" valor={totais.pendente} tone="amber" />
        <SummaryCard label="Vencidas" valor={totais.atrasado} tone="red" />
        <SummaryCard label="Pagas" valor={totais.pago} tone="green" />
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-600">Status</label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="rounded-md border border-brand-200 bg-white px-3 py-2 text-sm"
              >
                <option value="abertas">A pagar (pendentes + vencidas)</option>
                <option value="pendente">Apenas pendentes</option>
                <option value="atrasado">Apenas vencidas</option>
                <option value="pago">Apenas pagas</option>
                <option value="todas">Todas</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-600">Empresa</label>
              <select
                name="empresa"
                defaultValue={empresaFilter}
                className="rounded-md border border-brand-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {(empresas ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-cream hover:bg-brand-800"
            >
              Aplicar
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>{parcelas.length} parcela{parcelas.length === 1 ? '' : 's'}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Vencimento</TH>
                  <TH>Descrição</TH>
                  <TH>Fornecedor</TH>
                  <TH>Empresa / CNPJ</TH>
                  <TH>Obra(s)</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {parcelas.length === 0 ? (
                  <TableEmpty>Nenhuma parcela pra esses filtros.</TableEmpty>
                ) : (
                  parcelas.map((p) => {
                    const c = p.compras;
                    const obras = c?.compra_alocacoes ?? [];
                    const valorTotal = Number(p.valor);
                    // Se tem rateio, mostra cada obra com a fatia proporcional dessa parcela
                    const valorCompra = obras.reduce((s, a) => s + Number(a.valor_alocado), 0);
                    return (
                      <TR key={p.id}>
                        <TD>
                          <Link href={`/compras/${c?.id}`} className="font-mono text-sm hover:underline">
                            {formatDate(p.data_vencimento)}
                          </Link>
                          {p.num_parcela > 1 ? (
                            <span className="ml-1 text-[10px] text-brand-400">parc. {p.num_parcela}</span>
                          ) : null}
                        </TD>
                        <TD className="min-w-[200px] text-sm">
                          <Link href={`/compras/${c?.id}`} className="font-medium text-brand-900 hover:underline">
                            {c?.descricao ?? '—'}
                          </Link>
                          <div className="text-[10px] text-brand-400">compra {c?.data_compra ? formatDate(c.data_compra) : ''}</div>
                        </TD>
                        <TD className="text-sm">{c?.fornecedores?.nome ?? '—'}</TD>
                        <TD className="text-xs">
                          <div className="font-medium text-brand-800">{c?.empresas?.nome ?? '—'}</div>
                          <div className="font-mono text-brand-500">{c?.empresas?.cnpj ?? '—'}</div>
                        </TD>
                        <TD className="text-xs">
                          {obras.length === 0 ? (
                            <span className="italic text-brand-400">estoque</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {obras.map((a, i) => {
                                const fatia = valorCompra > 0 ? (Number(a.valor_alocado) / valorCompra) * valorTotal : 0;
                                return (
                                  <li key={i}>
                                    {a.obras?.nome ?? '—'}
                                    <span className="ml-1 font-mono text-brand-400">{formatBRL(fatia)}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </TD>
                        <TD className="text-right font-mono font-semibold">{formatBRL(valorTotal)}</TD>
                        <TD>
                          <Badge tone={STATUS_TONE[p.status] ?? 'outline'}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                          {p.data_pagamento ? (
                            <div className="mt-1 text-[10px] text-brand-400">pago em {formatDate(p.data_pagamento)}</div>
                          ) : null}
                        </TD>
                      </TR>
                    );
                  })
                )}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, valor, tone }: { label: string; valor: number; tone: 'brand' | 'amber' | 'red' | 'green' }) {
  const colors: Record<string, string> = {
    brand: 'text-brand-900 bg-brand-50 border-brand-100',
    amber: 'text-amber-900 bg-amber-50 border-amber-200',
    red: 'text-red-900 bg-red-50 border-red-200',
    green: 'text-emerald-900 bg-emerald-50 border-emerald-200',
  };
  return (
    <div className={`rounded-[14px] border p-4 ${colors[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold">{formatBRL(valor)}</div>
    </div>
  );
}
