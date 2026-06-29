export const FORMATOS_PAGAMENTO = [
  { value: 'pix', label: 'PIX' },
  { value: 'a_vista', label: 'À vista' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'boleto_loja', label: 'Boleto na loja' },
] as const;

export type FormatoPagamento = (typeof FORMATOS_PAGAMENTO)[number]['value'];

const LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  FORMATOS_PAGAMENTO.map((f) => [f.value, f.label]),
);

export function formatoPagamentoLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return LABEL_BY_VALUE[value] ?? value;
}
