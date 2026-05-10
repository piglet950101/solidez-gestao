import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

interface LucroDistribuivelCardProps {
  receita_caixa: number;
  despesas_pagas: number;
  despesas_pendentes: number;
  imposto_rateado: number;
  imposto_estimado: number;
  pro_labore_previsto: number;
  lucro_distribuivel: number;
  comprometido: number;
  alerta: boolean;
}

export function LucroDistribuivelCard(props: LucroDistribuivelCardProps) {
  const linhas: { label: string; valor: number; sign: 1 | -1; ghost?: boolean }[] = [
    { label: 'Receita em dinheiro recebida', valor: props.receita_caixa, sign: 1 },
    { label: 'Despesas pagas', valor: props.despesas_pagas, sign: -1 },
    { label: 'Despesas com vencimento futuro', valor: props.despesas_pendentes, sign: -1 },
    { label: 'Imposto rateado', valor: props.imposto_rateado, sign: -1 },
    { label: 'Imposto estimado (provisão)', valor: props.imposto_estimado, sign: -1, ghost: true },
    { label: 'Pró-labore previsto', valor: props.pro_labore_previsto, sign: -1 },
  ];

  return (
    <div className="rounded-[14px] border border-brand-100 bg-white shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-brand-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-brand-500">Lucro distribuível</h3>
          <p className="text-xs text-brand-500">Quanto pode sair sem comprometer o caixa da obra.</p>
        </div>
        {props.alerta ? (
          <div className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
            <AlertTriangle className="size-3" /> atenção
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="size-3" /> seguro
          </div>
        )}
      </div>

      <ul className="divide-y divide-brand-50 text-sm">
        {linhas.map((l) => (
          <li
            key={l.label}
            className={cn(
              'flex items-center justify-between px-5 py-2.5',
              l.ghost && 'bg-amber-50/40 text-amber-900',
            )}
          >
            <span className="text-brand-700">
              {l.label}
              {l.ghost ? <em className="ml-2 text-[11px] text-amber-700">estimativa</em> : null}
            </span>
            <span className={cn('font-mono font-semibold', l.sign === 1 ? 'text-emerald-700' : 'text-red-700')}>
              {l.sign === 1 ? '+' : '−'} {formatBRL(l.valor)}
            </span>
          </li>
        ))}
      </ul>

      <div
        className={cn(
          'flex items-center justify-between border-t-2 px-5 py-4',
          props.alerta ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50',
        )}
      >
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand-700">Disponível para distribuir</div>
          {props.alerta ? (
            <div className="mt-1 max-w-md text-[11px] text-red-700">
              Há {formatBRL(props.comprometido)} comprometidos com contas pendentes, imposto e pró-labore. Distribuir
              agora pode comprometer o caixa.
            </div>
          ) : null}
        </div>
        <div className={cn('font-mono text-2xl font-extrabold', props.alerta ? 'text-red-700' : 'text-emerald-700')}>
          {formatBRL(Math.max(props.lucro_distribuivel, 0))}
        </div>
      </div>
    </div>
  );
}
