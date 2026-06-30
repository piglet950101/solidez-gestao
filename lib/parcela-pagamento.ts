// Helper pra encode/decode metadados de pagamento que vivem dentro de
// parcelas.observacoes como JSON, até que as colunas próprias sejam criadas.

export interface PagamentoMeta {
  forma: string | null;
  conta: string | null;
  comprovante: string | null;
  obs: string | null;
}

export function decodePagamento(observacoes: string | null | undefined): PagamentoMeta | null {
  if (!observacoes) return null;
  // Heurística: se começa com { e tem JSON válido com pelo menos uma das chaves esperadas
  const t = observacoes.trim();
  if (!t.startsWith('{')) {
    return { forma: null, conta: null, comprovante: null, obs: t };
  }
  try {
    const parsed = JSON.parse(t);
    return {
      forma: typeof parsed.forma === 'string' ? parsed.forma : null,
      conta: typeof parsed.conta === 'string' ? parsed.conta : null,
      comprovante: typeof parsed.comprovante === 'string' ? parsed.comprovante : null,
      obs: typeof parsed.obs === 'string' ? parsed.obs : null,
    };
  } catch {
    return { forma: null, conta: null, comprovante: null, obs: t };
  }
}

const FORMA_LABELS: Record<string, string> = {
  pix: 'PIX',
  ted: 'TED',
  doc: 'DOC',
  a_vista: 'À vista',
  debito: 'Débito',
  credito: 'Crédito',
  boleto_loja: 'Boleto na loja',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  cheque: 'Cheque',
  outro: 'Outro',
};

export function formaPagamentoLabel(forma: string | null | undefined): string | null {
  if (!forma) return null;
  return FORMA_LABELS[forma] ?? forma;
}

export const FORMAS_PAGAMENTO_PARCELA = [
  { value: 'pix', label: 'PIX' },
  { value: 'ted', label: 'TED' },
  { value: 'doc', label: 'DOC' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'outro', label: 'Outro' },
] as const;
