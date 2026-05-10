import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PCT = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const formatBRL = (value: number | null | undefined): string =>
  value == null ? 'R$ 0,00' : BRL.format(value);

export const formatNumber = (value: number | null | undefined): string =>
  value == null ? '0,00' : NUM.format(value);

export const formatPercent = (value: number | null | undefined): string =>
  value == null ? '0%' : PCT.format(value);

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

export const formatRelative = (value: string | Date): string => {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
};

export const formatMonthRef = (value: string | Date): string => {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, 'MMM/yy', { locale: ptBR }).replace('.', '');
};

export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '—';
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return phone;
}

export function brlToNumber(input: string): number {
  if (!input) return 0;
  return Number(input.replace(/[^\d,-]/g, '').replace(',', '.'));
}
