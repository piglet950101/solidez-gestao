// Metadados de pagamento agora vivem em colunas próprias em parcelas
// (forma_pagamento, pago_via_conta, comprovante_url). Este módulo só expõe
// os labels de forma de pagamento e a lista pra dropdowns.

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
