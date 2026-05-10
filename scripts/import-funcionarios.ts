/**
 * Importa os 72 funcionários da planilha "CONTROLE FUNC. EMPREITEIRA v3.xlsx"
 * para a tabela `funcionarios`. Idempotente: usa CPF como chave de upsert
 * quando disponível, senão usa nome + data_admissao.
 *
 * Uso:
 *   pnpm import:funcionarios -- --file ../source-data/CONTROLE\ FUNC.\ EMPREITEIRA\ v3\ \(1\).xlsx
 *
 * Variáveis de ambiente necessárias:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Row {
  Nome?: string;
  CPF?: string;
  RG?: string;
  Cargo?: string;
  PIX?: string;
  Contato?: string;
  Admissao?: string | number;
  Desligamento?: string | number;
  TipoContrato?: string;
  Salario?: string | number;
  TamanhoSapato?: string;
  TamanhoCamiseta?: string;
  TamanhoCalca?: string;
  TemOSCurso?: string | boolean;
  Registrado?: string | boolean;
  CabecaEmpreitada?: string | boolean;
}

const ALIASES: Record<string, keyof Row> = {
  nome: 'Nome',
  funcionario: 'Nome',
  'nome funcionario': 'Nome',
  cpf: 'CPF',
  rg: 'RG',
  cargo: 'Cargo',
  funcao: 'Cargo',
  pix: 'PIX',
  'chave pix': 'PIX',
  contato: 'Contato',
  telefone: 'Contato',
  whatsapp: 'Contato',
  admissao: 'Admissao',
  'data admissao': 'Admissao',
  desligamento: 'Desligamento',
  'data desligamento': 'Desligamento',
  contrato: 'TipoContrato',
  'tipo contrato': 'TipoContrato',
  tipo: 'TipoContrato',
  salario: 'Salario',
  valor: 'Salario',
  sapato: 'TamanhoSapato',
  camiseta: 'TamanhoCamiseta',
  calca: 'TamanhoCalca',
  os: 'TemOSCurso',
  'os curso': 'TemOSCurso',
  registrado: 'Registrado',
  cabeca: 'CabecaEmpreitada',
  empreitada: 'CabecaEmpreitada',
};

function pickArg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function normalizeKey(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function mapHeaders(raw: Record<string, unknown>): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = normalizeKey(k);
    const target = ALIASES[key];
    if (target) (out as Record<string, unknown>)[target] = v as never;
  }
  return out;
}

function excelDate(v: string | number | undefined): string | null {
  if (!v) return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m && m[1] && m[2] && m[3]) {
    const dd = m[1];
    const mm = m[2];
    const yy = m[3];
    const year = yy.length === 2 ? `20${yy}` : yy;
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}

function tipoContrato(v: string | undefined): 'clt' | 'horista' | 'empreitada' | 'temporario' {
  if (!v) return 'horista';
  const k = normalizeKey(v);
  if (k.includes('clt') || k.includes('mensal')) return 'clt';
  if (k.includes('empreitada') || k.includes('producao')) return 'empreitada';
  if (k.includes('temp')) return 'temporario';
  return 'horista';
}

function bool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v > 0;
  if (typeof v === 'string') {
    const k = normalizeKey(v);
    return ['sim', 's', 'yes', 'true', 'x', '1'].includes(k);
  }
  return false;
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function cleanCPF(v: string | undefined): string | null {
  if (!v) return null;
  const d = String(v).replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : null;
}

async function main() {
  const file = pickArg('file');
  if (!file) {
    console.error('--file <path>.xlsx é obrigatório');
    process.exit(1);
  }
  const path = resolve(process.cwd(), file);
  const buf = readFileSync(path);
  const wb = XLSX.read(buf);
  const sheetName = wb.SheetNames.find((n) => /cadastro/i.test(n)) ?? wb.SheetNames[0];
  if (!sheetName) {
    console.error('Planilha vazia.');
    process.exit(1);
  }
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.error(`Aba ${sheetName} não encontrada.`);
    process.exit(1);
  }
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const rows: Record<string, unknown>[] = [];
  for (const r of raw) {
    const m = mapHeaders(r);
    if (!m.Nome || String(m.Nome).trim().length < 2) continue;
    const tipo = tipoContrato(m.TipoContrato);
    rows.push({
      nome: String(m.Nome).trim(),
      cpf: cleanCPF(m.CPF),
      rg: m.RG ? String(m.RG).trim() : null,
      chave_pix: m.PIX ? String(m.PIX).trim() : null,
      contato: m.Contato ? String(m.Contato).trim() : null,
      cargo: m.Cargo ? String(m.Cargo).trim() : null,
      tipo_contrato: tipo,
      salario_hora: tipo === 'horista' ? num(m.Salario) : null,
      salario_mes: tipo === 'clt' || tipo === 'temporario' ? num(m.Salario) : null,
      data_admissao: excelDate(m.Admissao),
      data_desligamento: excelDate(m.Desligamento),
      tamanho_sapato: m.TamanhoSapato ? String(m.TamanhoSapato).trim() : null,
      tamanho_camiseta: m.TamanhoCamiseta ? String(m.TamanhoCamiseta).trim() : null,
      tamanho_calca: m.TamanhoCalca ? String(m.TamanhoCalca).trim() : null,
      tem_os_curso: bool(m.TemOSCurso),
      registrado: bool(m.Registrado),
      cabeca_de_empreitada: bool(m.CabecaEmpreitada),
      status: m.Desligamento ? 'desligado' : 'ativo',
    });
  }

  console.log(`Aba: ${sheetName} · linhas válidas: ${rows.length}`);

  let inseridos = 0;
  let atualizados = 0;
  for (const row of rows) {
    if (row.cpf) {
      const { data: existing } = await supabase
        .from('funcionarios')
        .select('id')
        .eq('cpf', row.cpf as string)
        .maybeSingle();
      if (existing) {
        await supabase.from('funcionarios').update(row).eq('id', existing.id);
        atualizados++;
        continue;
      }
    }
    const { error } = await supabase.from('funcionarios').insert(row);
    if (error) {
      console.warn(`✗ ${row.nome}: ${error.message}`);
    } else {
      inseridos++;
    }
  }
  console.log(`Inseridos: ${inseridos} · Atualizados: ${atualizados}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
