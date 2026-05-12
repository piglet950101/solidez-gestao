'use client';
import * as React from 'react';
import Link from 'next/link';
import { Pencil, Search } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatBRL, formatCPF, formatDate } from '@/lib/format';
import type { Funcionario } from '@/types/database';

const TIPO_LABEL: Record<string, string> = {
  clt: 'CLT',
  horista: 'Horista',
  empreitada: 'Empreitada',
  temporario: 'Temporário',
};

function normalize(s: string): string {
  // Decompose accents (NFD) then strip combining diacritical marks.
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

interface Props {
  funcionarios: Funcionario[];
}

export function FuncionariosTable({ funcionarios }: Props) {
  const [query, setQuery] = React.useState('');
  const [mostrarDesligados, setMostrarDesligados] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = normalize(query.trim());
    return funcionarios.filter((f) => {
      if (!mostrarDesligados && f.status === 'desligado') return false;
      if (!q) return true;
      const hay = `${normalize(f.nome ?? '')} ${normalize(f.cargo ?? '')} ${normalize(f.cpf ?? '')}`;
      return hay.includes(q);
    });
  }, [funcionarios, query, mostrarDesligados]);

  const ativos = funcionarios.filter((f) => f.status !== 'desligado').length;
  const desligadosCount = funcionarios.length - ativos;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-brand-100 bg-white p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, cargo ou CPF…"
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
          <input
            type="checkbox"
            checked={mostrarDesligados}
            onChange={(e) => setMostrarDesligados(e.target.checked)}
            className="size-4 accent-brand-700"
          />
          Mostrar desligados ({desligadosCount})
        </label>
        <div className="text-xs text-brand-500">
          <strong className="font-mono text-brand-900">{filtered.length}</strong> de {funcionarios.length}
          {query ? ' filtrados' : ' total'}
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-brand-100 bg-white">
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>CPF</TH>
              <TH>Cargo</TH>
              <TH>Contrato</TH>
              <TH className="text-right">Salário</TH>
              <TH>Admissão</TH>
              <TH>Experiência</TH>
              <TH>Status</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((f) => {
              const dias1 = f.experiencia_dias_1 ?? 45;
              const dias2 = f.experiencia_dias_2 ?? 90;
              const dias = f.data_admissao ? differenceInDays(new Date(), new Date(f.data_admissao)) : null;
              const emExperiencia = dias != null && dias >= 0 && dias <= dias2;
              const proximoEtapa1 = dias != null && dias >= dias1 - 7 && dias <= dias1;
              const proximoEtapa2 = dias != null && dias >= dias2 - 7 && dias <= dias2;
              return (
                <TR key={f.id}>
                  <TD>
                    <Link href={`/funcionarios/${f.id}`} className="font-medium text-brand-900 hover:underline">
                      {f.nome}
                    </Link>
                    {f.cabeca_de_empreitada ? <Badge className="ml-2" tone="accent">cabeça</Badge> : null}
                  </TD>
                  <TD className="font-mono text-xs">{formatCPF(f.cpf)}</TD>
                  <TD>{f.cargo ?? '—'}</TD>
                  <TD>
                    <Badge tone={f.tipo_contrato === 'clt' ? 'brand' : 'outline'}>
                      {TIPO_LABEL[f.tipo_contrato] ?? f.tipo_contrato}
                    </Badge>
                  </TD>
                  <TD className="text-right font-mono">
                    {f.tipo_contrato === 'clt' || f.tipo_contrato === 'temporario'
                      ? formatBRL(f.salario_mes ?? 0)
                      : f.salario_hora
                      ? `${formatBRL(f.salario_hora)}/h`
                      : '—'}
                  </TD>
                  <TD>{formatDate(f.data_admissao)}</TD>
                  <TD>
                    {emExperiencia ? (
                      <Badge tone={proximoEtapa2 ? 'red' : proximoEtapa1 ? 'amber' : 'green'}>
                        {dias}/{dias2} dias · {dias1}+{dias2 - dias1}
                      </Badge>
                    ) : (
                      <span className="text-xs text-brand-400">—</span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={f.status === 'ativo' ? 'green' : f.status === 'desligado' ? 'red' : 'neutral'}>
                      {f.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/funcionarios/${f.id}`}>
                        <Pencil className="size-3.5" /> Editar
                      </Link>
                    </Button>
                  </TD>
                </TR>
              );
            })}
            {filtered.length === 0 && (
              <TableEmpty>
                {query
                  ? `Nenhum funcionário corresponde a "${query}".`
                  : 'Sem funcionários ativos. Marque "Mostrar desligados" para ver o histórico.'}
              </TableEmpty>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
