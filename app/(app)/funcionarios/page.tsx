import Link from 'next/link';
import { Users, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatBRL, formatCPF, formatDate } from '@/lib/format';
import { differenceInDays } from 'date-fns';

export const dynamic = 'force-dynamic';

const TIPO_LABEL: Record<string, string> = {
  clt: 'CLT',
  horista: 'Horista',
  empreitada: 'Empreitada',
  temporario: 'Temporário',
};

export default async function FuncionariosPage() {
  const supabase = await createClient();
  const { data: funcionarios } = await supabase
    .from('funcionarios')
    .select('*')
    .neq('status', 'desligado')
    .order('nome');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funcionários"
        description={`${funcionarios?.length ?? 0} ativos. Cadastro completo com PIX, contato, EPI e período de experiência.`}
        actions={
          <Button variant="accent" asChild>
            <Link href="/funcionarios/novo">
              <Plus className="size-4" /> Novo funcionário
            </Link>
          </Button>
        }
      />

      {!funcionarios?.length ? (
        <EmptyState
          icon={<Users className="size-10" />}
          title="Sem funcionários"
          description="Cadastre ou importe os 72 funcionários da planilha atual."
        />
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <THead>
                <TR>
                  <TH>Nome</TH>
                  <TH>CPF</TH>
                  <TH>Cargo</TH>
                  <TH>Contrato</TH>
                  <TH className="text-right">Salário</TH>
                  <TH>Admissão</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {funcionarios.map((f) => {
                  const dias = f.data_admissao ? differenceInDays(new Date(), new Date(f.data_admissao)) : null;
                  const experiencia = dias != null && dias <= 90;
                  const proximoFim = dias != null && (dias >= 38 && dias <= 45 || dias >= 83 && dias <= 90);
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
                        <Badge tone={f.status === 'ativo' ? 'green' : 'neutral'}>{f.status}</Badge>
                        {experiencia ? (
                          <Badge tone={proximoFim ? 'red' : 'amber'} className="ml-1">
                            {dias} dias
                          </Badge>
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
                {funcionarios.length === 0 && <TableEmpty>Sem funcionários cadastrados.</TableEmpty>}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
