// Cálculo de rateio de compra entre obras (4 modos)

export type RateioModo = 'igual' | 'percentual' | 'valor' | 'quantidade';

export interface RateioInputObra {
  obra_id: string;
  percentual?: number;
  valor?: number;
  quantidade?: number;
}

export interface RateioOutputObra {
  obra_id: string;
  valor_alocado: number;
  qtd_alocada: number | null;
  percentual_alocado: number | null;
}

export function calcularRateio(
  modo: RateioModo,
  valorTotal: number,
  obras: RateioInputObra[],
): RateioOutputObra[] {
  if (obras.length === 0) return [];
  switch (modo) {
    case 'igual': {
      const partilha = round2(valorTotal / obras.length);
      // distribui o resto de centavos na primeira obra
      const total = partilha * obras.length;
      const resto = round2(valorTotal - total);
      return obras.map((o, i) => ({
        obra_id: o.obra_id,
        valor_alocado: i === 0 ? round2(partilha + resto) : partilha,
        qtd_alocada: null,
        percentual_alocado: round2(100 / obras.length),
      }));
    }
    case 'percentual': {
      const soma = obras.reduce((acc, o) => acc + (o.percentual ?? 0), 0);
      if (Math.abs(soma - 100) > 0.01) {
        throw new Error(`Percentuais devem somar 100% (atual: ${soma.toFixed(2)}%)`);
      }
      return obras.map((o) => ({
        obra_id: o.obra_id,
        valor_alocado: round2((valorTotal * (o.percentual ?? 0)) / 100),
        qtd_alocada: null,
        percentual_alocado: o.percentual ?? null,
      }));
    }
    case 'valor': {
      const soma = obras.reduce((acc, o) => acc + (o.valor ?? 0), 0);
      if (Math.abs(soma - valorTotal) > 0.01) {
        throw new Error(`Soma dos valores (R$ ${soma.toFixed(2)}) não bate com total (R$ ${valorTotal.toFixed(2)})`);
      }
      return obras.map((o) => ({
        obra_id: o.obra_id,
        valor_alocado: round2(o.valor ?? 0),
        qtd_alocada: null,
        percentual_alocado: round2(((o.valor ?? 0) / valorTotal) * 100),
      }));
    }
    case 'quantidade': {
      const total = obras.reduce((acc, o) => acc + (o.quantidade ?? 0), 0);
      if (total <= 0) throw new Error('Quantidade total deve ser maior que zero');
      return obras.map((o) => {
        const fracao = (o.quantidade ?? 0) / total;
        return {
          obra_id: o.obra_id,
          valor_alocado: round2(valorTotal * fracao),
          qtd_alocada: o.quantidade ?? null,
          percentual_alocado: round2(fracao * 100),
        };
      });
    }
  }
}

export function gerarParcelas(
  valorTotal: number,
  numParcelas: number,
  primeiraData: Date,
  intervaloDias = 30,
): { num_parcela: number; data_vencimento: string; valor: number }[] {
  if (numParcelas <= 0) return [];
  const valorBase = round2(valorTotal / numParcelas);
  const totalAlocado = valorBase * numParcelas;
  const resto = round2(valorTotal - totalAlocado);
  return Array.from({ length: numParcelas }).map((_, i) => {
    const due = new Date(primeiraData);
    due.setDate(due.getDate() + intervaloDias * i);
    return {
      num_parcela: i + 1,
      data_vencimento: due.toISOString().slice(0, 10),
      valor: i === 0 ? round2(valorBase + resto) : valorBase,
    };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
