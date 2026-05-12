'use client';
import * as React from 'react';
import Link from 'next/link';
import { Pencil, Search } from 'lucide-react';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { excluirFornecedor, arquivarFornecedor } from '@/actions/fornecedores';
import type { Fornecedor } from '@/types/database';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

interface Row extends Fornecedor {
  compras_count: number;
}

export function FornecedoresTable({ fornecedores }: { fornecedores: Row[] }) {
  const [query, setQuery] = React.useState('');
  const [mostrarInativos, setMostrarInativos] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = normalize(query.trim());
    return fornecedores.filter((f) => {
      if (!mostrarInativos && !f.ativo) return false;
      if (!q) return true;
      const hay = `${normalize(f.nome ?? '')} ${normalize(f.documento ?? '')} ${normalize(f.contato ?? '')}`;
      return hay.includes(q);
    });
  }, [fornecedores, query, mostrarInativos]);

  const inativosCount = fornecedores.filter((f) => !f.ativo).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-brand-100 bg-white p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, documento ou contato…"
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
          <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} className="size-4 accent-brand-700" />
          Mostrar arquivados ({inativosCount})
        </label>
        <div className="text-xs text-brand-500">
          <strong className="font-mono text-brand-900">{filtered.length}</strong> de {fornecedores.length}
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-brand-100 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Documento</TH>
              <TH>Contato</TH>
              <TH>Email</TH>
              <TH className="text-right">Compras</TH>
              <TH>Status</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((f) => (
              <TR key={f.id}>
                <TD>
                  <Link href={`/fornecedores/${f.id}`} className="font-medium text-brand-900 hover:underline">
                    {f.nome}
                  </Link>
                </TD>
                <TD className="font-mono text-xs">{f.documento ?? '—'}</TD>
                <TD>{f.contato ?? '—'}</TD>
                <TD className="text-xs">{f.email ?? '—'}</TD>
                <TD className="text-right font-mono">{f.compras_count}</TD>
                <TD>
                  <Badge tone={f.ativo ? 'green' : 'neutral'}>{f.ativo ? 'ativo' : 'arquivado'}</Badge>
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild aria-label="Editar">
                      <Link href={`/fornecedores/${f.id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <ConfirmDeleteDialog
                      iconOnly
                      title={f.compras_count > 0 ? 'Arquivar fornecedor' : 'Excluir fornecedor'}
                      description={
                        f.compras_count > 0
                          ? `${f.nome} tem ${f.compras_count} compra(s) registrada(s). Será arquivado em vez de excluído (o histórico fica preservado).`
                          : `${f.nome} · sem compras registradas, exclusão permanente.`
                      }
                      onConfirm={async () =>
                        f.compras_count > 0 ? await arquivarFornecedor(f.id) : await excluirFornecedor(f.id)
                      }
                    />
                  </div>
                </TD>
              </TR>
            ))}
            {filtered.length === 0 && (
              <TableEmpty>
                {query ? `Nenhum fornecedor corresponde a "${query}".` : 'Sem fornecedores ativos.'}
              </TableEmpty>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
