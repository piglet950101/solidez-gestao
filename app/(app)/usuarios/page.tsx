import { UserPlus, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConvidarUsuarioForm } from './form';
import { UsuarioAcoes } from './acoes';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: perfis } = await supabase
    .from('perfis_usuario')
    .select('user_id, nome, email, cargo, telefone_whatsapp, ativo, criado_em')
    .order('criado_em', { ascending: false });
  const rows = (perfis ?? []) as {
    user_id: string;
    nome: string;
    email: string;
    cargo: string | null;
    telefone_whatsapp: string | null;
    ativo: boolean;
    criado_em: string;
  }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários do sistema"
        description="Convide novos colaboradores (engenharia, mestres, almoxarife). Eles recebem um email com link pra definir a senha."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <UserPlus className="inline size-4" /> Convidar novo usuário
          </CardTitle>
          <span className="text-xs text-brand-500">
            O sistema envia um email com link pra definir a senha. O cargo já fica pré-preenchido no perfil.
          </span>
        </CardHeader>
        <CardContent className="py-4">
          <ConvidarUsuarioForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <UserCheck className="inline size-4" /> Usuários cadastrados
          </CardTitle>
          <span className="text-xs text-brand-500">
            {rows.filter((u) => u.ativo).length} ativos · {rows.filter((u) => !u.ativo).length} inativos
          </span>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Email</TH>
                <TH>Cargo</TH>
                <TH>WhatsApp</TH>
                <TH>Criado em</TH>
                <TH>Status</TH>
                <TH className="text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((u) => (
                <TR key={u.user_id}>
                  <TD className="font-medium">{u.nome}</TD>
                  <TD className="font-mono text-xs">{u.email}</TD>
                  <TD>{u.cargo ?? '—'}</TD>
                  <TD className="font-mono text-xs">{u.telefone_whatsapp ?? '—'}</TD>
                  <TD className="text-xs">{formatDate(u.criado_em)}</TD>
                  <TD>
                    {u.ativo ? <Badge tone="green">ativo</Badge> : <Badge tone="red">inativo</Badge>}
                  </TD>
                  <TD className="text-right">
                    <UsuarioAcoes userId={u.user_id} email={u.email} ativo={u.ativo} />
                  </TD>
                </TR>
              ))}
              {rows.length === 0 && <TableEmpty>Sem usuários cadastrados ainda.</TableEmpty>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
