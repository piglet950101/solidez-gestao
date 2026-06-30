'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Undo2, Download } from 'lucide-react';
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
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { registrarPagamentoParcela, reverterPagamentoParcela } from '@/actions/compras';
import { createClient } from '@/lib/supabase/client';
import { FORMAS_PAGAMENTO_PARCELA, type PagamentoMeta, formaPagamentoLabel } from '@/lib/parcela-pagamento';
import { formatBRL, formatDate } from '@/lib/format';

interface Props {
  parcelaId: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  dataPagamento: string | null;
  pagamentoMeta: PagamentoMeta | null;
}

export function RegistrarPagamentoDialog({
  parcelaId,
  descricao,
  valor,
  dataVencimento,
  status,
  dataPagamento,
  pagamentoMeta,
}: Props) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [open, setOpen] = React.useState(false);
  const [dataPag, setDataPag] = React.useState(new Date().toISOString().slice(0, 10));
  const [forma, setForma] = React.useState<string>('pix');
  const [conta, setConta] = React.useState<string>('');
  const [obs, setObs] = React.useState<string>('');
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, startTransition] = React.useTransition();
  const isPago = status === 'pago';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dataPag) { toast.error('Informe a data do pagamento.'); return; }
    let comprovantePath: string | null = null;
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Comprovante maior que 50 MB. Reduza o arquivo (use iLovePDF Compress).');
        return;
      }
      const ext = file.name.split('.').pop() ?? 'pdf';
      comprovantePath = `parcelas/${parcelaId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('funcionario-docs').upload(comprovantePath, file);
      if (upErr) { toast.error('Erro ao subir comprovante: ' + upErr.message); return; }
    }
    const fd = new FormData();
    fd.set('data_pagamento', dataPag);
    fd.set('forma_pagamento', forma);
    if (conta) fd.set('pago_via_conta', conta);
    if (obs) fd.set('observacoes', obs);
    if (comprovantePath) fd.set('comprovante_path', comprovantePath);
    startTransition(async () => {
      const res = await registrarPagamentoParcela(parcelaId, fd);
      if (res.error) {
        toast.error(res.error);
        if (comprovantePath) await supabase.storage.from('funcionario-docs').remove([comprovantePath]);
        return;
      }
      toast.success('Pagamento registrado.');
      setOpen(false);
      router.refresh();
    });
  }

  function reverter() {
    if (!confirm('Reverter o pagamento? A parcela volta pra "pendente".')) return;
    startTransition(async () => {
      const res = await reverterPagamentoParcela(parcelaId);
      if (res.error) { toast.error(res.error); return; }
      toast.success('Pagamento revertido.');
      setOpen(false);
      router.refresh();
    });
  }

  async function baixarComprovante() {
    if (!pagamentoMeta?.comprovante) return;
    const { data, error } = await supabase.storage.from('funcionario-docs').createSignedUrl(pagamentoMeta.comprovante, 60);
    if (error || !data?.signedUrl) { toast.error('Não foi possível gerar link.'); return; }
    window.open(data.signedUrl, '_blank');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={isPago ? 'ghost' : 'accent'}
          className={isPago ? 'text-emerald-700' : ''}
        >
          <CheckCircle2 className="size-3.5" /> {isPago ? 'Ver pagamento' : 'Registrar pagamento'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isPago ? 'Detalhes do pagamento' : 'Registrar pagamento'}</DialogTitle>
          <DialogDescription>
            <strong>{descricao}</strong> · venc. {formatDate(dataVencimento)} · <span className="font-mono">{formatBRL(valor)}</span>
          </DialogDescription>
        </DialogHeader>

        {isPago ? (
          <div className="space-y-3 text-sm">
            <Detail label="Data do pagamento" value={dataPagamento ? formatDate(dataPagamento) : '—'} />
            <Detail label="Forma de pagamento" value={formaPagamentoLabel(pagamentoMeta?.forma ?? null) ?? '—'} />
            <Detail label="Conta / origem" value={pagamentoMeta?.conta ?? '—'} />
            <Detail label="Observações" value={pagamentoMeta?.obs ?? '—'} />
            {pagamentoMeta?.comprovante ? (
              <div>
                <Label className="text-xs">Comprovante</Label>
                <div>
                  <Button type="button" variant="outline" size="sm" onClick={baixarComprovante}>
                    <Download className="size-3.5" /> Baixar comprovante
                  </Button>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Fechar</Button>
              <Button type="button" variant="outline" onClick={reverter} disabled={pending} className="text-red-700">
                <Undo2 className="size-3.5" /> {pending ? 'Revertendo…' : 'Reverter pagamento'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data do pagamento</Label>
                <Input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select value={forma} onValueChange={setForma}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO_PARCELA.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Conta bancária (origem do pagamento)</Label>
              <Input
                value={conta}
                onChange={(e) => setConta(e.target.value)}
                placeholder='Ex.: "Banco do Brasil ag 1234 cc 56789" ou "Caixa SLD"'
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comprovante-file">Comprovante (opcional)</Label>
              <input
                id="comprovante-file"
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-800"
              />
              {file ? <p className="text-xs text-brand-600">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
              <Button type="submit" variant="accent" disabled={pending}>
                <CheckCircle2 className="size-3.5" /> {pending ? 'Registrando…' : 'Confirmar pagamento'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="text-sm font-medium text-brand-900">{value}</div>
    </div>
  );
}
