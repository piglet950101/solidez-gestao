'use client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL } from '@/lib/format';

interface MargemObraChartProps {
  data: { obra: string; receita: number; despesa: number; margem: number }[];
}

export function MargemObraChart({ data }: MargemObraChartProps) {
  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dcf2e3" />
          <XAxis dataKey="obra" stroke="#1f7253" fontSize={11} />
          <YAxis stroke="#1f7253" fontSize={11} tickFormatter={(v) => formatBRL(v)} />
          <Tooltip
            formatter={(v: number) => formatBRL(v)}
            contentStyle={{ borderRadius: 12, border: '1px solid #dcf2e3', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="receita" name="Receita" fill="#1f7253" radius={[3, 3, 0, 0]} />
          <Bar dataKey="despesa" name="Despesa" fill="#c2410c" radius={[3, 3, 0, 0]} />
          <Bar dataKey="margem" name="Margem">
            {data.map((d, i) => (
              <Cell key={i} fill={d.margem >= 0 ? '#15803d' : '#dc2626'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
