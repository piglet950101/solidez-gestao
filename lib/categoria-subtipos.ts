/**
 * Subtipos de categoria que identificam despesas relacionadas a um veículo.
 * Quando o usuário escolhe uma categoria com um destes subtipos no formulário
 * de Nova Compra, o sistema exige que um veículo seja selecionado e
 * pré-preenche o rateio com a obra atual do veículo.
 */
export const SUBTIPOS_VEICULO = [
  'combustivel',
  'manutencao_veiculo',
  'oleo',
  'pneus',
  'documentacao_veiculo',
] as const;

export type SubtipoVeiculo = (typeof SUBTIPOS_VEICULO)[number];

export function isSubtipoVeiculo(subtipo: string | null | undefined): boolean {
  if (!subtipo) return false;
  return (SUBTIPOS_VEICULO as readonly string[]).includes(subtipo);
}
