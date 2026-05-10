'use client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/format';

interface DisbursementCurveProps {
  data: { semana_inicio: string; obra: string; valor: number }[];
}

const PALETTE = ['#1f7253', '#c2410c', '#0369a1', '#7c3aed', '#0891b2', '#b45309', '#dc2626', '#475569', '#15803d'];

export function DisbursementCurve({ data }: DisbursementCurveProps) {
  // Pivota para series stacked por obra
  const obras = Array.from(new Set(data.map((d) => d.obra)));
  const weeks = Array.from(new Set(data.map((d) => d.semana_inicio))).sort();
  const series = weeks.map((w) => {
    const row: Record<string, number | string> = {
      semana: format(parseISO(w), "dd/MM", { locale: ptBR }),
    };
    for (const o of obras) {
      row[o] = data.find((d) => d.semana_inicio === w && d.obra === o)?.valor ?? 0;
    }
    return row;
  });

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dcf2e3" />
          <XAxis dataKey="semana" stroke="#1f7253" fontSize={11} />
          <YAxis stroke="#1f7253" fontSize={11} tickFormatter={(v) => formatBRL(v).replace('R$ ', 'R$ ')} />
          <Tooltip
            cursor={{ fill: '#f0f9f4' }}
            formatter={(v: number) => formatBRL(v)}
            contentStyle={{ borderRadius: 12, border: '1px solid #dcf2e3', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {obras.map((o, i) => (
            <Bar key={o} dataKey={o} stackId="x" fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
