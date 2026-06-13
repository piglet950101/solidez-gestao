import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface ApuracaoRow {
  obra_id: string;
  obra_nome: string;
  empreiteira_id: string;
  empreiteira_nome: string;
  matriz_id: string | null;
  matriz_nome: string | null;
  status: string;
  receita_total: string | number;
  despesa_individual: string | number;
  despesa_administrativa: string | number;
  despesa_estoque: string | number;
  despesa_folha: string | number;
  impostos: string | number;
  despesa_veiculo: string | number;
  despesa_total: string | number;
  lucro_liquido: string | number;
}

interface LucroSocioRow {
  socio_id: string;
  socio_nome: string;
  obra_id: string;
  obra_nome: string;
  empreiteira_nome: string;
  percentual: string | number;
  lucro_liquido: string | number;
  lucro_socio: string | number;
}

const n = (v: string | number | null | undefined) => Number(v ?? 0);

export default async function ApuracaoPage() {
  const supabase = await createClient();
  const [{ data: apuracaoRaw }, { data: lucroSocioRaw }] = await Promise.all([
    supabase.from('vw_apuracao_obra' as 'obras').select('*').order('lucro_liquido', { ascending: false }),
    supabase.from('vw_lucro_socio' as 'socios').select('*').order('lucro_socio', { ascending: false }),
  ]);
  const apuracao = (apuracaoRaw ?? []) as unknown as ApuracaoRow[];
  const lucroSocio = (lucroSocioRaw ?? []) as unknown as LucroSocioRow[];

  // Agrega por empreiteira
  const porEmpreiteira = new Map<string, { nome: string; receita: number; despesa: number; lucro: number }>();
  for (const r of apuracao) {
    const cur = porEmpreiteira.get(r.empreiteira_id) ?? { nome: r.empreiteira_nome, receita: 0, despesa: 0, lucro: 0 };
    cur.receita += n(r.receita_total);
    cur.despesa += n(r.despesa_total);
    cur.lucro += n(r.lucro_liquido);
    porEmpreiteira.set(r.empreiteira_id, cur);
  }

  // Agrega por sócio (consolidado de todas as obras)
  const porSocio = new Map<string, { nome: string; total: number; obras: number }>();
  for (const r of lucroSocio) {
    const cur = porSocio.get(r.socio_id) ?? { nome: r.socio_nome, total: 0, obras: 0 };
    cur.total += n(r.lucro_socio);
    cur.obras += 1;
    porSocio.set(r.socio_id, cur);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apuração por obra"
        description="P&L cumulativo lifetime: receita − despesas (individuais + administrativas + estoque + folha + impostos + veículo) = lucro líquido. Distribuição aos sócios conforme participação."
      />

      {/* Consolidado SLD: todas as empreiteiras */}
      <Card>
        <CardHeader>
          <CardTitle>Consolidado por empreiteira</CardTitle>
        </CardHeader>
        <CardContent>
          {porEmpreiteira.size === 0 ? (
            <p className="text-sm text-brand-500">Sem dados.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Empreiteira</TH>
                  <TH className="text-right">Receita</TH>
                  <TH className="text-right">Despesa</TH>
                  <TH className="text-right">Lucro líquido</TH>
                </TR>
              </THead>
              <TBody>
                {Array.from(porEmpreiteira.values()).map((e) => (
                  <TR key={e.nome}>
                    <TD className="font-medium">{e.nome}</TD>
                    <TD className="text-right font-mono">{formatBRL(e.receita)}</TD>
                    <TD className="text-right font-mono text-red-700">{formatBRL(e.despesa)}</TD>
                    <TD className={`text-right font-mono font-semibold ${e.lucro >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatBRL(e.lucro)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Por obra: P&L detalhado */}
      <Card>
        <CardHeader>
          <CardTitle>P&L por obra (cumulativo)</CardTitle>
        </CardHeader>
        <CardContent>
          {apuracao.length === 0 ? (
            <p className="text-sm text-brand-500">Sem obras.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Obra</TH>
                    <TH>Empreiteira</TH>
                    <TH className="text-right">Receita</TH>
                    <TH className="text-right">Desp. indiv.</TH>
                    <TH className="text-right">Rateio admin.</TH>
                    <TH className="text-right">Estoque</TH>
                    <TH className="text-right">Folha</TH>
                    <TH className="text-right">Impostos</TH>
                    <TH className="text-right">Veículo</TH>
                    <TH className="text-right">Lucro líquido</TH>
                  </TR>
                </THead>
                <TBody>
                  {apuracao.map((r) => {
                    const lucro = n(r.lucro_liquido);
                    return (
                      <TR key={r.obra_id}>
                        <TD className="font-medium text-brand-900">{r.obra_nome}</TD>
                        <TD>
                          <span className="text-xs text-brand-600">{r.empreiteira_nome}</span>
                          {r.status !== 'ativa' ? <Badge tone="outline" className="ml-1">{r.status}</Badge> : null}
                        </TD>
                        <TD className="text-right font-mono">{formatBRL(n(r.receita_total))}</TD>
                        <TD className="text-right font-mono text-red-700">{formatBRL(n(r.despesa_individual))}</TD>
                        <TD className="text-right font-mono text-amber-700">{formatBRL(n(r.despesa_administrativa))}</TD>
                        <TD className="text-right font-mono text-amber-700">{formatBRL(n(r.despesa_estoque))}</TD>
                        <TD className="text-right font-mono">{formatBRL(n(r.despesa_folha))}</TD>
                        <TD className="text-right font-mono">{formatBRL(n(r.impostos))}</TD>
                        <TD className="text-right font-mono">{formatBRL(n(r.despesa_veiculo))}</TD>
                        <TD className={`text-right font-mono font-semibold ${lucro >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatBRL(lucro)}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribuição por sócio */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição aos sócios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Totais consolidados por sócio */}
          {porSocio.size === 0 ? (
            <p className="text-sm text-brand-500">Sem sócios vinculados a obras com lucro.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {Array.from(porSocio.values()).map((s) => (
                  <div key={s.nome} className="rounded-md border border-brand-100 bg-brand-50/40 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">{s.nome}</div>
                    <div className={`mt-1 font-mono text-lg font-bold ${s.total >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatBRL(s.total)}
                    </div>
                    <div className="text-xs text-brand-500">{s.obras} obra{s.obras === 1 ? '' : 's'}</div>
                  </div>
                ))}
              </div>

              {/* Detalhe linha por linha */}
              <Table>
                <THead>
                  <TR>
                    <TH>Sócio</TH>
                    <TH>Obra</TH>
                    <TH>Empreiteira</TH>
                    <TH className="text-right">%</TH>
                    <TH className="text-right">Lucro da obra</TH>
                    <TH className="text-right">Cota do sócio</TH>
                  </TR>
                </THead>
                <TBody>
                  {lucroSocio.map((r, i) => {
                    const cota = n(r.lucro_socio);
                    return (
                      <TR key={i}>
                        <TD className="font-medium">{r.socio_nome}</TD>
                        <TD>{r.obra_nome}</TD>
                        <TD className="text-xs text-brand-600">{r.empreiteira_nome}</TD>
                        <TD className="text-right font-mono">{Number(r.percentual).toFixed(0)}%</TD>
                        <TD className="text-right font-mono">{formatBRL(n(r.lucro_liquido))}</TD>
                        <TD className={`text-right font-mono font-semibold ${cota >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatBRL(cota)}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
