'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { createClient } from '@/lib/supabase/client';
import { registrarDocumentoFuncionario, excluirDocumentoFuncionario } from '@/actions/funcionarios';
import { formatDate } from '@/lib/format';

interface Documento {
  id: string;
  tipo: string;
  descricao: string | null;
  storage_path: string;
  validade: string | null;
  criado_em: string;
}

const TIPOS = [
  { value: 'ASO_admissional', label: 'ASO admissional' },
  { value: 'ASO_periodico', label: 'ASO periódico' },
  { value: 'ASO_demissional', label: 'ASO demissional' },
  { value: 'NR10', label: 'NR-10' },
  { value: 'NR18', label: 'NR-18' },
  { value: 'NR35', label: 'NR-35' },
  { value: 'contrato_admissional', label: 'Contrato admissional' },
  { value: 'rescisao', label: 'Rescisão' },
  { value: 'exame_complementar', label: 'Exame complementar' },
  { value: 'outro', label: 'Outro' },
];

function labelDoTipo(tipo: string): string {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

function diasAteValidade(validade: string | null): number | null {
  if (!validade) return null;
  const diff = new Date(validade).getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

interface Props {
  funcionarioId: string;
  documentos: Documento[];
}

export function DocumentosFuncionario({ funcionarioId, documentos }: Props) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [tipo, setTipo] = React.useState<string>('ASO_admissional');
  const [file, setFile] = React.useState<File | null>(null);
  const [validade, setValidade] = React.useState<string>('');
  const [descricao, setDescricao] = React.useState<string>('');
  const [uploading, setUploading] = React.useState(false);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      toast.error('Selecione um arquivo.');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'pdf';
      const path = `${funcionarioId}/${tipo}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('funcionario-docs').upload(path, file);
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const fd = new FormData();
      fd.set('tipo', tipo);
      fd.set('storage_path', path);
      if (descricao) fd.set('descricao', descricao);
      if (validade) fd.set('validade', validade);
      const res = await registrarDocumentoFuncionario(funcionarioId, fd);
      if (res.error) {
        toast.error(res.error);
        // Best-effort: remove the uploaded file since metadata failed
        await supabase.storage.from('funcionario-docs').remove([path]);
        return;
      }
      toast.success('Documento adicionado.');
      setFile(null);
      setValidade('');
      setDescricao('');
      const formEl = e.currentTarget as HTMLFormElement;
      formEl.reset();
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function onDownload(path: string) {
    const { data, error } = await supabase.storage.from('funcionario-docs').createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? 'Não foi possível gerar o link.');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  async function onDelete(documentoId: string, storagePath: string) {
    const res = await excluirDocumentoFuncionario(documentoId, funcionarioId, storagePath);
    if (res.error) {
      return res;
    }
    toast.success('Documento excluído.');
    router.refresh();
    return {};
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
        <span className="text-xs text-brand-500">
          ASOs, NRs, contratos, exames. PDF ou imagem. Alerta automático 30 dias antes do vencimento.
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onUpload} className="grid grid-cols-1 gap-3 rounded-md border border-brand-100 bg-brand-50/40 p-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TextField
            label="Validade"
            name="validade"
            type="date"
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
            hint="Opcional. Para ASO/NR — vira alerta quando faltar 30 dias."
          />
          <TextField
            label="Descrição"
            name="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="md:col-span-2"
            placeholder="Ex.: ASO periódico de janeiro/2027"
          />
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="doc-file">Arquivo</Label>
            <input
              id="doc-file"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-800"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="accent" disabled={uploading || !file}>
              <Upload className="size-4" /> {uploading ? 'Enviando…' : 'Adicionar documento'}
            </Button>
          </div>
        </form>

        {documentos.length === 0 ? (
          <div className="rounded-md border border-dashed border-brand-200 px-6 py-8 text-center text-sm text-brand-500">
            Sem documentos cadastrados.
          </div>
        ) : (
          <ul className="divide-y divide-brand-100">
            {documentos.map((d) => {
              const dias = diasAteValidade(d.validade);
              const tone: 'red' | 'amber' | 'green' | 'neutral' =
                dias === null ? 'neutral' : dias < 0 ? 'red' : dias <= 30 ? 'amber' : 'green';
              return (
                <li key={d.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 size-4 text-brand-500" />
                    <div>
                      <div className="text-sm font-medium text-brand-900">{labelDoTipo(d.tipo)}</div>
                      {d.descricao ? <div className="text-xs text-brand-600">{d.descricao}</div> : null}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-brand-500">Adicionado em {formatDate(d.criado_em)}</span>
                        {d.validade ? (
                          <Badge tone={tone}>
                            {dias === null
                              ? `validade ${formatDate(d.validade)}`
                              : dias < 0
                                ? `vencido em ${formatDate(d.validade)}`
                                : dias <= 30
                                  ? `vence em ${dias}d (${formatDate(d.validade)})`
                                  : `válido até ${formatDate(d.validade)}`}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => onDownload(d.storage_path)} aria-label="Baixar">
                      <Download className="size-4" />
                    </Button>
                    <ConfirmDeleteDialog
                      iconOnly
                      title="Excluir documento"
                      description={`${labelDoTipo(d.tipo)}${d.descricao ? ` · ${d.descricao}` : ''}`}
                      onConfirm={async () => onDelete(d.id, d.storage_path)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
