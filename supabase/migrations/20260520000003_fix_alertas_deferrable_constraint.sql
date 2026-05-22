-- Bugfix: a constraint única de dedupe de alertas foi criada como DEFERRABLE.
-- Postgres NÃO aceita constraint deferrable como árbitro de ON CONFLICT — então
-- TODOS os blocos de fn_gerar_alertas_diarios (contas, doc veículo, experiência,
-- imposto) falhavam silenciosamente no primeiro INSERT ... ON CONFLICT DO NOTHING.
-- Resultado: o cron de alertas nunca gerou nada desde o setup inicial.
--
-- Correção: troca a constraint deferrable por um índice único normal, que
-- funciona como árbitro de ON CONFLICT. Isso conserta o pipeline de alertas
-- inteiro (não só os novos alertas de curso/documento de funcionário).

alter table alertas drop constraint if exists alertas_tipo_entidade_tabela_entidade_id_severidade_key;

create unique index if not exists alertas_dedup_idx
  on alertas (tipo, entidade_tabela, entidade_id, severidade);
