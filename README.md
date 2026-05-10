# Solidez Gestão

Sistema financeiro multi-empresa para a Solidez Empreiteira (Solidez Trento + Solidez BR).

## Stack

- Next.js 15 (App Router · Server Actions) + TypeScript estrito
- Supabase Postgres 16 + Auth + Storage + Edge Functions
- Tailwind 4 (CSS-first config) + Radix primitives + shadcn-style components
- React Hook Form + Zod
- Recharts · date-fns (locale pt-BR) · sonner

## Ambiente

```bash
pnpm install
cp .env.local.example .env.local        # preencher chaves
pnpm supabase start                      # banco local em Docker
pnpm db:reset                            # aplica migrations + seed
pnpm dev                                 # http://localhost:3000
```

## Migrations

Sequência ordenada em `supabase/migrations/`:

1. `01_core` — empresas, obras, etapas, perfis, sócios, obra_socios
2. `02_catalogs` — categorias (Marmita inclusa), fornecedores
3. `03_finance` — compras, alocações, parcelas, custos fixos, recebimentos, antecipações, medições, imposto
4. `04_payroll` — funcionários, lançamentos de folha, vales, empreitada, comissões, pró-labore
5. `05_vehicles` — veículos, alocações, custos
6. `06_alerts` — alertas e envios WhatsApp
7. `07_views` — `vw_margem_obra`, `vw_lucro_distribuivel`, `vw_dashboard_kpis`
8. `08_rls` — Row-Level Security multi-empresa
9. `09_functions` — RPC para fluxos compostos

## Decisões críticas (ver `docs/PLANO_IMPLEMENTACAO.md`)

- **Rateio** sempre via tabela de alocações, nunca direto na compra (4 modos).
- **Custos fixos atribuíveis** com endereçamento manual — sem rateio uniforme automático.
- **Imposto em 2 etapas**: status `pendente_rateio` → `rateado` na chegada do detalhe.
- **Permuta ≠ caixa**: resultado da obra inclui permuta; fluxo de caixa só dinheiro.
- **Antecipação dia 20**: tabela `antecipacoes` concilia com a medição final do mês.
- **Margem por obra** substitui o orçado vs realizado (cliente é prestador, não incorporador).
- **Comissão genérica** por funcionário/obra/mês — não trancada na Débora.
- **Bruno em duplicidade**: linha em `socios` (Triad/DG) **e** linha em `funcionarios` (CLT engenheiro). Tabelas independentes.

## Estrutura de pastas

```
app/                    rotas Next.js (App Router)
  (auth)/               login, convite, reset
  (app)/                área autenticada com sidebar
components/             UI primitives + domain components
lib/                    Supabase clients, format, utils
actions/                Server Actions com validação Zod
types/                  database.ts (gerado) + domain.ts
supabase/
  migrations/           SQL versionado
  seed.sql              dados de partida (2 CNPJs reais, 9 obras, sócios)
  functions/            Edge Functions (WhatsApp, importação)
docs/                   proposta, plano, mockup, arquitetura
scripts/                ferramentas de desenvolvimento (importação)
```

## Observabilidade

- Sentry (free tier) para erros runtime.
- `whatsapp_envios.message_id_meta` rastreia entregas.
- `pg_cron` dispara alertas diários às 07:00 BRT.

## Handover

Banco e repositório serão transferidos para conta da Solidez ao final da S4.
