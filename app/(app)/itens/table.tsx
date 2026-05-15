'use client';
import * as React from 'react';
import Link from 'next/link';
import { Pencil, Search } from 'lucide-react';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatBRL } from '@/lib/format';

interface Item {
  id: string;
  nome: string;
  codigo_interno: string | null;
  unidade: string;
  saldo_atual: number;
  valor_medio: number | null;
  estoque_minimo: number | null;
  eh_epi: boolean;
  ativo: boolean;
  categorias: { nome: string } | null;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function ItensTable({ itens }: { itens: Item[] }) {
  const [query, setQuery] = React.useState('');
  const [mostrarArquivados, setMostrarArquivados] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = normalize(query.trim());
    return itens.filter((i) => {
      if (!mostrarArquivados && !i.ativo) return false;
      if (!q) return true;
      const hay = `${normalize(i.nome)} ${normalize(i.codigo_interno ?? '')} ${normalize(i.categorias?.nome ?? '')}`;
      return hay.includes(q);
    });
  }, [itens, query, mostrarArquivados]);

  const arquivadosCount = itens.filter((i) => !i.ativo).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-brand-100 bg-white p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, código ou categoria…"
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
          <input
            type="checkbox"
            checked={mostrarArquivados}
            onChange={(e) => setMostrarArquivados(e.target.checked)}
            className="size-4 accent-brand-700"
          />
          Mostrar arquivados ({arquivadosCount})
        </label>
        <div className="text-xs text-brand-500">
          <strong className="font-mono text-brand-900">{filtered.length}</strong> de {itens.length}
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-brand-100 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Item</TH>
              <TH>Código</TH>
              <TH>Unidade</TH>
              <TH>Categoria</TH>
              <TH className="text-right">Saldo</TH>
              <TH className="text-right">Custo médio</TH>
              <TH>Tipo</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((i) => {
              const abaixoMinimo = i.estoque_minimo != null && Number(i.saldo_atual) < Number(i.estoque_minimo);
              return (
                <TR key={i.id}>
                  <TD>
                    <Link href={`/itens/${i.id}`} className="font-medium text-brand-900 hover:underline">
                      {i.nome}
                    </Link>
                    {!i.ativo ? <Badge className="ml-2" tone="neutral">arquivado</Badge> : null}
                  </TD>
                  <TD className="font-mono text-xs">{i.codigo_interno ?? '—'}</TD>
                  <TD className="text-xs">{i.unidade}</TD>
                  <TD>{i.categorias?.nome ?? '—'}</TD>
                  <TD className="text-right font-mono">
                    <span className={abaixoMinimo ? 'font-bold text-amber-700' : 'text-brand-900'}>
                      {Number(i.saldo_atual).toFixed(3).replace(/\.0+$|0+$/, '')}
                    </span>
                    {abaixoMinimo ? <Badge className="ml-1" tone="amber">baixo</Badge> : null}
                  </TD>
                  <TD className="text-right font-mono">{i.valor_medio != null ? formatBRL(i.valor_medio) : '—'}</TD>
                  <TD>{i.eh_epi ? <Badge tone="brand">EPI</Badge> : <Badge tone="outline">material</Badge>}</TD>
                  <TD className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/itens/${i.id}`}>
                        <Pencil className="size-3.5" /> Editar
                      </Link>
                    </Button>
                  </TD>
                </TR>
              );
            })}
            {filtered.length === 0 && (
              <TableEmpty>
                {query ? `Nenhum item corresponde a "${query}".` : 'Sem itens.'}
              </TableEmpty>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
