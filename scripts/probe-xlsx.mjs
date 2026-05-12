import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';

const path = process.argv[2];
const buf = readFileSync(path);
const wb = XLSX.read(buf);
const sheet = wb.Sheets['CADASTRO DE FUNCIONARIOS'];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, header: 1 });

// Header is row index 4
const HEADER_IDX = 4;
const headers = rows[HEADER_IDX];
console.log('Cabeçalhos identificados (row 5):');
headers.forEach((h, i) => console.log(`  [${i}] ${h}`));

// Data starts at row index 5
const dataRows = rows.slice(HEADER_IDX + 1);
const nonEmpty = dataRows.filter(r => r && r[1] && String(r[1]).trim().length > 1 && r[1] !== 'NOME DO FUNCIONARIOS');
console.log(`\nLinhas com nome preenchido (excluindo header repetido): ${nonEmpty.length}`);

console.log('\n--- Amostra de 10 linhas ---');
const sample = nonEmpty.slice(0, 10);
for (const r of sample) {
  console.log(JSON.stringify({
    nome: r[1],
    pix: r[2],
    registrado: r[3],
    os: r[4],
    cargo: r[5],
    obra: r[6],
    sal_hr: r[7],
    sal_mes: r[8],
    contato: r[9],
    obs: r[10],
    sapato: r[11],
    camiseta: r[12],
    calca: r[13],
    status: r[14],
  }));
}

console.log('\n--- Distribuição de STATUS ---');
const statuses = {};
for (const r of nonEmpty) {
  const s = String(r[14] ?? '(vazio)').toUpperCase();
  statuses[s] = (statuses[s] ?? 0) + 1;
}
console.log(statuses);

console.log('\n--- Distribuição CLT vs horista ---');
let clt = 0, horista = 0, ambos = 0, nenhum = 0;
for (const r of nonEmpty) {
  const hasHr = r[7] != null && r[7] !== '';
  const hasMes = r[8] != null && r[8] !== '';
  if (hasHr && hasMes) ambos++;
  else if (hasMes) clt++;
  else if (hasHr) horista++;
  else nenhum++;
}
console.log({ clt_mensal: clt, horista: horista, ambos: ambos, nenhum: nenhum });

console.log('\n--- Distribuição REGISTRADO ---');
const reg = {};
for (const r of nonEmpty) {
  const v = String(r[3] ?? '(vazio)').toUpperCase();
  reg[v] = (reg[v] ?? 0) + 1;
}
console.log(reg);
