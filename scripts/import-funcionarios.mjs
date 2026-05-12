/**
 * Import the 72 funcionários from `CONTROLE FUNC. EMPREITEIRA v3 (1).xlsx`.
 *
 *   pnpm run import:funcionarios -- --file "../CONTROLE FUNC. EMPREITEIRA v3 (1).xlsx"
 *   pnpm run import:funcionarios -- --file "../CONTROLE FUNC. EMPREITEIRA v3 (1).xlsx" --apply
 *
 * Without --apply, runs as a dry-run: prints what would be inserted and exits.
 * With --apply, performs the actual upserts against Supabase via service_role.
 *
 * Strategy
 * --------
 * - Reads the "CADASTRO DE FUNCIONARIOS" sheet (header on row 5).
 * - Column layout: ID, NOME, PIX, REGISTRADO, OS, CARGO, OBRA, SAL_HR, SAL_MES, CONTATO, OBS, SAPATO, CAMISETA, CALÇA, STATUS
 * - tipo_contrato inferred:
 *     SAL_MES present  → 'clt'
 *     SAL_HR  present  → 'horista'
 *     neither          → 'empreitada' (medição — typical when obs = "MEDIÇÃO")
 * - PIX as 11-digit string → also treated as CPF candidate when registrado.
 * - Bruno Boehme is special: pre-existing in seed; skipped here to avoid duplicate.
 */
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const fileArgIdx = args.indexOf('--file');
const file = fileArgIdx >= 0 ? args[fileArgIdx + 1] : null;
const apply = args.includes('--apply');

if (!file) {
  console.error('Uso: node scripts/import-funcionarios.mjs --file <path.xlsx> [--apply]');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (apply && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios em --apply');
  process.exit(1);
}

const HEADER_IDX = 4;
const COL = {
  ID: 0, NOME: 1, PIX: 2, REGISTRADO: 3, OS: 4, CARGO: 5,
  OBRA: 6, SAL_HR: 7, SAL_MES: 8, CONTATO: 9, OBS: 10,
  SAPATO: 11, CAMISETA: 12, CALCA: 13, STATUS: 14,
};

const wb = XLSX.read(readFileSync(resolve(file)));
const sheet = wb.Sheets['CADASTRO DE FUNCIONARIOS'];
if (!sheet) {
  console.error('Aba CADASTRO DE FUNCIONARIOS não encontrada');
  process.exit(1);
}
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, header: 1 });
const dataRows = rows.slice(HEADER_IDX + 1);

function normalize(s) {
  return s == null ? null : String(s).replace(/\s+/g, ' ').trim();
}

function toBool(v) {
  if (v == null) return false;
  const k = String(v).trim().toUpperCase();
  return ['SIM', 'X', '1', 'TRUE', 'YES', 'ENTRANDO'].includes(k);
}

function preservePix(v) {
  if (v == null) return null;
  if (typeof v === 'number') {
    const s = String(v);
    // CPF needs 11 digits — pad leading zero if it's 10 (xlsx ate it)
    return s.length === 10 ? '0' + s : s;
  }
  return String(v).trim() || null;
}

function inferTipo(salHr, salMes) {
  if (salMes != null && Number(salMes) > 0) return 'clt';
  if (salHr != null && Number(salHr) > 0) return 'horista';
  return 'empreitada';
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
}

function cargoNormalize(s) {
  if (!s) return null;
  return String(s).replace(/\s+/g, ' ').trim().toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

const SKIP_NAMES = new Set(['BRUNO BOEHME']);

const records = [];
const skipped = [];
const issues = [];

for (const r of dataRows) {
  if (!r) continue;
  const nome = normalize(r[COL.NOME]);
  if (!nome || nome.length < 2 || nome === 'NOME DO FUNCIONARIOS') continue;

  const nameKey = nome.toUpperCase().replace(/\s+/g, ' ').trim();
  if (SKIP_NAMES.has(nameKey)) {
    skipped.push({ nome, motivo: 'já existe no seed (Bruno sócio + CLT)' });
    continue;
  }

  const pix = preservePix(r[COL.PIX]);
  const tipo = inferTipo(r[COL.SAL_HR], r[COL.SAL_MES]);
  const cpf = pix && /^\d{11}$/.test(pix) ? pix.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : null;
  const obraTag = normalize(r[COL.OBRA]);
  const obs = normalize(r[COL.OBS]);

  const record = {
    nome,
    cpf,                                         // null se PIX não é CPF
    chave_pix: pix,
    cargo: cargoNormalize(r[COL.CARGO]),
    tipo_contrato: tipo,
    salario_hora: tipo === 'horista' ? num(r[COL.SAL_HR]) : null,
    salario_mes: tipo === 'clt' ? num(r[COL.SAL_MES]) : null,
    contato: normalize(r[COL.CONTATO]),
    registrado: toBool(r[COL.REGISTRADO]),
    tem_os_curso: toBool(r[COL.OS]),
    tamanho_sapato: normalize(r[COL.SAPATO]),
    tamanho_camiseta: normalize(r[COL.CAMISETA]),
    tamanho_calca: normalize(r[COL.CALCA]),
    status: String(r[COL.STATUS] ?? 'ATIVO').trim().toLowerCase() === 'desligado' ? 'desligado' : 'ativo',
    observacoes: [obraTag ? `Obra atual: ${obraTag}` : null, obs].filter(Boolean).join(' · ') || null,
  };

  if (!record.cargo) issues.push({ nome, problema: 'sem cargo' });
  if (record.tipo_contrato === 'clt' && !record.salario_mes) issues.push({ nome, problema: 'CLT sem salário mensal' });

  records.push(record);
}

console.log(`\nTotal de funcionários a importar: ${records.length}`);
console.log(`Pulados (já existem no seed): ${skipped.length}`);
console.log(`Avisos: ${issues.length}`);

console.log('\n=== Distribuição de tipo_contrato ===');
const tipos = {};
for (const r of records) tipos[r.tipo_contrato] = (tipos[r.tipo_contrato] ?? 0) + 1;
console.table(tipos);

console.log('\n=== Cargos únicos (top 15 por contagem) ===');
const cargos = {};
for (const r of records) cargos[r.cargo ?? '(vazio)'] = (cargos[r.cargo ?? '(vazio)'] ?? 0) + 1;
console.table(Object.fromEntries(
  Object.entries(cargos).sort((a, b) => b[1] - a[1]).slice(0, 15),
));

console.log('\n=== 5 amostras de registros prontos ===');
console.log(JSON.stringify(records.slice(0, 5), null, 2));

if (skipped.length) {
  console.log('\n=== Pulados ===');
  console.table(skipped);
}
if (issues.length) {
  console.log('\n=== Avisos ===');
  console.table(issues.slice(0, 30));
}

if (!apply) {
  console.log('\nDRY RUN — nada foi gravado. Re-execute com --apply para aplicar.');
  process.exit(0);
}

console.log('\nAplicando…');
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

let inserted = 0;
let updated = 0;
let failed = [];

for (const rec of records) {
  // Tentativa: match por CPF se existir, senão por nome + cargo
  let existingId = null;
  if (rec.cpf) {
    const { data } = await supabase.from('funcionarios').select('id').eq('cpf', rec.cpf).maybeSingle();
    existingId = data?.id ?? null;
  }
  if (!existingId) {
    const { data } = await supabase
      .from('funcionarios')
      .select('id')
      .eq('nome', rec.nome)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (existingId) {
    const { error } = await supabase.from('funcionarios').update(rec).eq('id', existingId);
    if (error) failed.push({ nome: rec.nome, erro: error.message });
    else updated++;
  } else {
    const { error } = await supabase.from('funcionarios').insert(rec);
    if (error) failed.push({ nome: rec.nome, erro: error.message });
    else inserted++;
  }
}

console.log(`\nResultado: inseridos=${inserted}  atualizados=${updated}  falhas=${failed.length}`);
if (failed.length) {
  console.log('\nFalhas:');
  console.table(failed.slice(0, 30));
}
