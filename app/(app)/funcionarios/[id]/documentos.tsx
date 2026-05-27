'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, FileText, Upload, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { createClient } from '@/lib/supabase/client';
import {
  registrarDocumentoFuncionario,
  excluirDocumentoFuncionario,
  atualizarDocumentoFuncionario,
  registrarAdmissaoEmLote,
} from '@/actions/funcionarios';
import { formatDate } from '@/lib/format';

interface Documento {
  id: string;
  tipo: string;
  descricao: string | null;
  storage_path: string | null;
  data_realizacao: string | null;
  validade: string | null;
  criado_em: string;
}

const TIPOS = [
  { value: 'ASO_admissional', label: 'ASO admissional', validadeMeses: null },
  { value: 'ASO_periodico', label: 'ASO periódico', validadeMeses: 12 },
  { value: 'ASO_demissional', label: 'ASO demissional', validadeMeses: null },
  { value: 'NR01', label: 'NR-01 (Disposições gerais)', validadeMeses: 12 },
  { value: 'NR06', label: 'NR-06 (EPI)', validadeMeses: 24 },
  { value: 'NR12', label: 'NR-12 (Máquinas e equipamentos)', validadeMeses: 24 },
  { value: 'NR18', label: 'NR-18 (Construção civil)', validadeMeses: 24 },
  { value: 'NR35', label: 'NR-35 (Trabalho em altura)', validadeMeses: 24 },
  { value: 'contrato_admissional', label: 'Contrato admissional', validadeMeses: null },
  { value: 'rescisao', label: 'Rescisão', validadeMeses: null },
  { value: 'exame_complementar', label: 'Exame complementar', validadeMeses: null },
  { value: 'outro', label: 'Outro', validadeMeses: null },
];

// Documentos típicos da admissão (em lote: 1 PDF com tudo junto).
const ADMISSAO_TIPOS = [
  { value: 'contrato_admissional', label: 'Contrato admissional', validadeMeses: null },
  { value: 'ASO_admissional', label: 'ASO admissional', validadeMeses: null },
  { value: 'NR01', label: 'NR-01', validadeMeses: 12 },
  { value: 'NR06', label: 'NR-06', validadeMeses: 24 },
  { value: 'NR12', label: 'NR-12', validadeMeses: 24 },
  { value: 'NR18', label: 'NR-18', validadeMeses: 24 },
  { value: 'NR35', label: 'NR-35', validadeMeses: 24 },
];

function labelDoTipo(tipo: string): string {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}
function metaDoTipo(tipo: string) {
  return TIPOS.find((t) => t.value === tipo);
}
function addMeses(dataISO: string, meses: number): string {
  // Pure calendar arithmetic, evita drift de timezone (DST/offset).
  const [y, m, d] = dataISO.split('-').map(Number);
  const result = new Date(Date.UTC(y, m - 1 + meses, d));
  return result.toISOString().slice(0, 10);
}
function diasAteValidade(validade: string | null): number | null {
  if (!validade) return null;
  return Math.floor((new Date(validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface Props {
  funcionarioId: string;
  documentos: Documento[];
}

export function DocumentosFuncionario({ funcionarioId, documentos }: Props) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const temAdmissaoDocs = documentos.some((d) => ADMISSAO_TIPOS.some((t) => t.value === d.tipo));

  async function onDownload(path: string) {
    const { data, error } = await supabase.storage.from('funcionario-docs').createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? 'Não foi possível gerar o link.');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  async function onDelete(documentoId: string, storagePath: string | null) {
    const res = await excluirDocumentoFuncionario(documentoId, funcionarioId, storagePath);
    if (res.error) return res;
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
        {/* === BULK ADMISSION FORM === */}
        <details open={!temAdmissaoDocs} className="rounded-md border border-brand-100 bg-brand-50/40">
          <summary className="cursor-pointer select-none rounded-md px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50">
            📋 Cadastro de admissão completa (em lote)
            {temAdmissaoDocs ? <span className="ml-2 text-xs font-normal text-brand-500">— já tem documentos de admissão</span> : null}
          </summary>
          <div className="px-3 pb-3">
            <BulkAdmissaoForm
              funcionarioId={funcionarioId}
              supabase={supabase}
              onSaved={() => { router.refresh(); }}
            />
          </div>
        </details>

        {/* === AVULSO DOC === */}
        <details className="rounded-md border border-brand-100 bg-white">
          <summary className="cursor-pointer select-none rounded-md px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50">
            + Adicionar documento avulso
            <span className="ml-2 text-xs font-normal text-brand-500">(ASO periódico, exame complementar, rescisão, outro)</span>
          </summary>
          <div className="px-3 pb-3">
            <AvulsoDocForm
              funcionarioId={funcionarioId}
              supabase={supabase}
              onSaved={() => { router.refresh(); }}
            />
          </div>
        </details>

        {/* === LIST === */}
        {documentos.length === 0 ? (
          <div className="rounded-md border border-dashed border-brand-200 px-6 py-8 text-center text-sm text-brand-500">
            Sem documentos cadastrados.
          </div>
        ) : (
          <ul className="divide-y divide-brand-100">
            {documentos.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                onDownload={onDownload}
                onDelete={onDelete}
                onRenovar={async (id, data, val) => {
                  const fd = new FormData();
                  if (data) fd.set('data_realizacao', data);
                  if (val) fd.set('validade', val);
                  const res = await atualizarDocumentoFuncionario(id, funcionarioId, fd);
                  if (res.error) { toast.error(res.error); return false; }
                  toast.success('Data atualizada.');
                  router.refresh();
                  return true;
                }}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================================
// Bulk admission form — multiple doc types, single file, single save.
// =====================================================================

type BulkLine = { tipo: string; data_realizacao: string; validade: string };

function BulkAdmissaoForm({
  funcionarioId,
  supabase,
  onSaved,
}: {
  funcionarioId: string;
  supabase: ReturnType<typeof createClient>;
  onSaved: () => void;
}) {
  const [linhas, setLinhas] = React.useState<BulkLine[]>(() =>
    ADMISSAO_TIPOS.map((t) => ({ tipo: t.value, data_realizacao: '', validade: '' })),
  );
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);

  function setData(idx: number, dataRealizacao: string) {
    setLinhas((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const tipoMeta = ADMISSAO_TIPOS.find((t) => t.value === l.tipo);
        const validadeAuto = tipoMeta?.validadeMeses && dataRealizacao ? addMeses(dataRealizacao, tipoMeta.validadeMeses) : '';
        return { ...l, data_realizacao: dataRealizacao, validade: validadeAuto || l.validade };
      }),
    );
  }
  function setValidade(idx: number, validade: string) {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, validade } : l)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const preenchidas = linhas.filter((l) => l.data_realizacao || l.validade);
    if (preenchidas.length === 0) {
      toast.error('Preencha a data de pelo menos um documento.');
      return;
    }
    setPending(true);
    try {
      let path: string | null = null;
      if (file) {
        const ext = file.name.split('.').pop() ?? 'pdf';
        path = `${funcionarioId}/admissao-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('funcionario-docs').upload(path, file);
        if (upErr) { toast.error(upErr.message); return; }
      }
      const fd = new FormData();
      if (path) fd.set('storage_path', path);
      fd.set('docs_json', JSON.stringify(preenchidas));
      const res = await registrarAdmissaoEmLote(funcionarioId, fd);
      if (res.error) {
        toast.error(res.error);
        if (path) await supabase.storage.from('funcionario-docs').remove([path]);
        return;
      }
      toast.success(`${res.count} documento(s) registrado(s)${path ? ' com o mesmo arquivo' : ''}.`);
      setLinhas(ADMISSAO_TIPOS.map((t) => ({ tipo: t.value, data_realizacao: '', validade: '' })));
      setFile(null);
      const formEl = e.currentTarget as HTMLFormElement;
      formEl.reset();
      onSaved();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 pt-2">
      <p className="text-xs text-brand-600">
        Preencha as datas que tiver — o sistema calcula a validade sozinho conforme o tipo. Anexe <strong>um único PDF</strong> com tudo junto
        (contrato + ASO + NRs), e todos os documentos vão referenciar esse arquivo.
      </p>
      <div className="overflow-hidden rounded-md border border-brand-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-xs uppercase tracking-wide text-brand-600">
            <tr>
              <th className="px-3 py-2 text-left">Documento</th>
              <th className="px-3 py-2 text-left">Data de realização</th>
              <th className="px-3 py-2 text-left">Validade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {linhas.map((l, idx) => {
              const meta = ADMISSAO_TIPOS.find((t) => t.value === l.tipo);
              return (
                <tr key={l.tipo}>
                  <td className="px-3 py-2 font-medium text-brand-900">{meta?.label ?? l.tipo}</td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={l.data_realizacao}
                      onChange={(e) => setData(idx, e.target.value)}
                      className="w-full rounded-md border border-brand-200 bg-white px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={l.validade}
                      onChange={(e) => setValidade(idx, e.target.value)}
                      className={`w-full rounded-md border bg-white px-2 py-1 text-sm ${meta?.validadeMeses && l.data_realizacao && l.validade ? 'border-emerald-200 text-emerald-800' : 'border-brand-200'}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bulk-file">Arquivo único (PDF completo — opcional)</Label>
        <input
          id="bulk-file"
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-800"
        />
        <p className="text-xs text-brand-500">
          Pode salvar agora só com as datas e anexar o PDF depois (em qualquer um dos documentos via "Adicionar documento avulso").
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="accent" disabled={pending}>
          <Upload className="size-4" /> {pending ? 'Salvando…' : 'Salvar admissão'}
        </Button>
      </div>
    </form>
  );
}

// =====================================================================
// Single-doc form (avulso) — for ASO periódico, exames, rescisão, outros.
// =====================================================================

function AvulsoDocForm({
  funcionarioId,
  supabase,
  onSaved,
}: {
  funcionarioId: string;
  supabase: ReturnType<typeof createClient>;
  onSaved: () => void;
}) {
  const [tipo, setTipo] = React.useState<string>('ASO_periodico');
  const [file, setFile] = React.useState<File | null>(null);
  const [dataRealizacao, setDataRealizacao] = React.useState<string>('');
  const [validade, setValidade] = React.useState<string>('');
  const [validadeAuto, setValidadeAuto] = React.useState<boolean>(false);
  const [descricao, setDescricao] = React.useState<string>('');
  const [uploading, setUploading] = React.useState(false);
  const tipoMeta = metaDoTipo(tipo);

  React.useEffect(() => {
    if (tipoMeta?.validadeMeses && dataRealizacao) {
      setValidade(addMeses(dataRealizacao, tipoMeta.validadeMeses));
      setValidadeAuto(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, dataRealizacao]);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file && !dataRealizacao && !validade) {
      toast.error('Anexe um arquivo ou informe a data de realização / validade.');
      return;
    }
    setUploading(true);
    try {
      let path: string | null = null;
      if (file) {
        const ext = file.name.split('.').pop() ?? 'pdf';
        path = `${funcionarioId}/${tipo}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('funcionario-docs').upload(path, file);
        if (upErr) { toast.error(upErr.message); return; }
      }
      const fd = new FormData();
      fd.set('tipo', tipo);
      if (path) fd.set('storage_path', path);
      if (descricao) fd.set('descricao', descricao);
      if (dataRealizacao) fd.set('data_realizacao', dataRealizacao);
      if (validade) fd.set('validade', validade);
      const res = await registrarDocumentoFuncionario(funcionarioId, fd);
      if (res.error) {
        toast.error(res.error);
        if (path) await supabase.storage.from('funcionario-docs').remove([path]);
        return;
      }
      toast.success(path ? 'Documento adicionado.' : 'Data registrada.');
      setFile(null); setDataRealizacao(''); setValidade(''); setValidadeAuto(false); setDescricao('');
      const formEl = e.currentTarget as HTMLFormElement;
      formEl.reset();
      onSaved();
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onUpload} className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <TextField
        label="Data de realização"
        name="data_realizacao"
        type="date"
        value={dataRealizacao}
        onChange={(e) => setDataRealizacao(e.target.value)}
        hint={tipoMeta?.validadeMeses ? `Calcula validade auto (+${tipoMeta.validadeMeses} meses).` : 'Quando o funcionário fez/recebeu.'}
      />
      <TextField
        label="Validade"
        name="validade"
        type="date"
        value={validade}
        onChange={(e) => { setValidade(e.target.value); setValidadeAuto(false); }}
        hint={validadeAuto ? '✓ Auto — pode ajustar.' : 'Vira alerta quando faltar 30 dias.'}
      />
      <TextField
        label="Descrição"
        name="descricao"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Ex.: ASO periódico de janeiro/2027"
      />
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="avulso-file">Arquivo (opcional)</Label>
        <input
          id="avulso-file"
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-800"
        />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" variant="accent" disabled={uploading || (!file && !dataRealizacao && !validade)}>
          <Upload className="size-4" /> {uploading ? 'Salvando…' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
}

// =====================================================================
// Doc row with inline "renovar" (renew date + auto-validade).
// =====================================================================

function DocRow({
  doc,
  onDownload,
  onDelete,
  onRenovar,
}: {
  doc: Documento;
  onDownload: (p: string) => void;
  onDelete: (id: string, sp: string | null) => Promise<{ error?: string } | void>;
  onRenovar: (id: string, data: string, validade: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [data, setData] = React.useState<string>(doc.data_realizacao ?? '');
  const [validade, setValidade] = React.useState<string>(doc.validade ?? '');
  const [saving, setSaving] = React.useState(false);
  const tipoMeta = metaDoTipo(doc.tipo);

  React.useEffect(() => {
    if (editing && tipoMeta?.validadeMeses && data && data !== doc.data_realizacao) {
      setValidade(addMeses(data, tipoMeta.validadeMeses));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, editing]);

  const dias = diasAteValidade(doc.validade);
  const tone: 'red' | 'amber' | 'green' | 'neutral' =
    dias === null ? 'neutral' : dias < 0 ? 'red' : dias <= 30 ? 'amber' : 'green';

  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 size-4 text-brand-500" />
        <div className="space-y-1">
          <div className="text-sm font-medium text-brand-900">{labelDoTipo(doc.tipo)}</div>
          {doc.descricao ? <div className="text-xs text-brand-600">{doc.descricao}</div> : null}
          {!editing ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {doc.data_realizacao ? (
                <span className="text-brand-500">Realizado em {formatDate(doc.data_realizacao)}</span>
              ) : (
                <span className="text-brand-500">Adicionado em {formatDate(doc.criado_em)}</span>
              )}
              {doc.validade ? (
                <Badge tone={tone}>
                  {dias === null
                    ? `validade ${formatDate(doc.validade)}`
                    : dias < 0
                      ? `vencido em ${formatDate(doc.validade)}`
                      : dias <= 30
                        ? `vence em ${dias}d (${formatDate(doc.validade)})`
                        : `válido até ${formatDate(doc.validade)}`}
                </Badge>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-2 pt-1 text-xs">
              <div>
                <div className="mb-0.5 text-[10px] uppercase tracking-wide text-brand-500">Realização</div>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs" />
              </div>
              <div>
                <div className="mb-0.5 text-[10px] uppercase tracking-wide text-brand-500">Validade</div>
                <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs" />
              </div>
              <Button
                type="button"
                variant="accent"
                size="sm"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  const ok = await onRenovar(doc.id, data, validade);
                  setSaving(false);
                  if (ok) setEditing(false);
                }}
              >
                <Check className="size-3.5" /> {saving ? '…' : 'Salvar'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setData(doc.data_realizacao ?? ''); setValidade(doc.validade ?? ''); }}>
                <X className="size-3.5" /> Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!editing ? (
          <Button type="button" variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Renovar/atualizar data">
            <Pencil className="size-4" />
          </Button>
        ) : null}
        {doc.storage_path ? (
          <Button type="button" variant="ghost" size="icon" onClick={() => onDownload(doc.storage_path as string)} aria-label="Baixar">
            <Download className="size-4" />
          </Button>
        ) : (
          <span className="px-2 text-xs italic text-brand-400">sem anexo</span>
        )}
        <ConfirmDeleteDialog
          iconOnly
          title="Excluir documento"
          description={`${labelDoTipo(doc.tipo)}${doc.descricao ? ` · ${doc.descricao}` : ''}`}
          onConfirm={async () => onDelete(doc.id, doc.storage_path)}
        />
      </div>
    </li>
  );
}
