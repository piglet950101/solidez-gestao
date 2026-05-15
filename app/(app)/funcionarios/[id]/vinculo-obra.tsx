'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TextField, TextareaField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { transferirFuncionario } from '@/actions/funcionarios';
import { formatDate } from '@/lib/format';

interface AlocRow {
  id: string;
  obra_id: string;
  data_inicio: string;
  data_fim: string | null;
  motivo: 'admissao' | 'transferencia' | 'demissao';
  obra_nome: string;
}

interface Props {
  funcionarioId: string;
  funcionarioStatus: string;
  obraAdmissaoNome: string | null;
  obraAtualNome: string | null;
  obraDemissaoNome: string | null;
  historico: AlocRow[];
  obras: { id: string; nome: string }[];
}

export function VinculoObraCard({
  funcionarioId,
  funcionarioStatus,
  obraAdmissaoNome,
  obraAtualNome,
  obraDemissaoNome,
  historico,
  obras,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [novaObraId, setNovaObraId] = React.useState<string>('');
  const [pending, startTransition] = React.useTransition();
  const isDesligado = funcionarioStatus === 'desligado';
  const semVinculo = !obraAtualNome && !isDesligado;
  const buttonLabel = semVinculo ? 'Vincular a uma obra' : 'Transferir para outra obra';

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!novaObraId) {
      toast.error('Selecione a obra.');
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set('nova_obra_id', novaObraId);
    startTransition(async () => {
      const res = await transferirFuncionario(funcionarioId, fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(semVinculo ? 'Funcionário vinculado à obra.' : 'Funcionário transferido.');
      setOpen(false);
      setNovaObraId('');
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vínculo com obra</CardTitle>
        <span className="text-xs text-brand-500">
          Define onde os custos recorrentes do funcionário caem. Custos admissionais ficam travados na obra de origem;
          demissionais, na última obra antes do desligamento.
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-brand-600">Obra atual: </span>
              {isDesligado ? (
                <span className="text-brand-500">— (funcionário desligado)</span>
              ) : obraAtualNome ? (
                <strong className="text-brand-900">{obraAtualNome}</strong>
              ) : (
                <span className="text-amber-700">sem vínculo</span>
              )}
            </div>
            {obraAdmissaoNome ? (
              <div className="text-xs text-brand-500">
                Admissão: <span className="font-medium text-brand-700">{obraAdmissaoNome}</span>
              </div>
            ) : null}
            {obraDemissaoNome ? (
              <div className="text-xs text-brand-500">
                Demissão: <span className="font-medium text-brand-700">{obraDemissaoNome}</span>
              </div>
            ) : null}
          </div>
          {!isDesligado ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Building className="size-4" /> {buttonLabel}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{buttonLabel}</DialogTitle>
                  <DialogDescription>
                    {semVinculo
                      ? 'O primeiro vínculo será registrado como admissão. A partir daqui, os custos recorrentes do funcionário caem nesta obra.'
                      : `Hoje vinculado a ${obraAtualNome}. A alocação atual será encerrada no dia anterior à transferência.`}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Obra</Label>
                    <Select value={novaObraId} onValueChange={setNovaObraId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a obra" />
                      </SelectTrigger>
                      <SelectContent>
                        {obras.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <TextField
                    label={semVinculo ? 'Data de admissão na obra' : 'Data da transferência'}
                    name="data_transferencia"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                  <TextareaField label="Observação" name="observacao" rows={2} hint="Opcional. Ex: motivo da transferência." />
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="accent" disabled={pending}>
                      {pending ? 'Salvando…' : 'Confirmar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>

        {historico.length > 0 ? (
          <div className="rounded-md border border-brand-100 bg-brand-50/40">
            <Table>
              <THead>
                <TR>
                  <TH>Obra</TH>
                  <TH>Início</TH>
                  <TH>Fim</TH>
                  <TH>Motivo</TH>
                </TR>
              </THead>
              <TBody>
                {historico.map((h) => (
                  <TR key={h.id}>
                    <TD>{h.obra_nome}</TD>
                    <TD>{formatDate(h.data_inicio)}</TD>
                    <TD>{h.data_fim ? formatDate(h.data_fim) : <Badge tone="green">ativo</Badge>}</TD>
                    <TD>
                      <Badge tone={h.motivo === 'admissao' ? 'brand' : h.motivo === 'demissao' ? 'red' : 'outline'}>
                        {h.motivo}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
