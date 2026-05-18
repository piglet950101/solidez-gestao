-- Extensão da Fase G: novo modo de rateio "por quantidade de funcionários"
-- + seed das categorias indiretas (Sindicato, Medicina do trabalho, EPI, etc).
--
-- Postgres não permite usar um novo enum value na mesma transação em que ele
-- foi adicionado — então este arquivo está dividido em 2 partes que precisam
-- ser executadas separadamente (a migration runner aplica statement por
-- statement; aplicamos via Management API em 2 chamadas).

-- =============================================================
-- PARTE 1 (rodar primeiro, isoladamente):
-- =============================================================

alter type custo_fixo_modo add value if not exists 'proporcional_funcionarios';

------------------------------------------------------------------
-- Categoria-pai "Custos Indiretos / Rateios" + 8 subcategorias.
-- A tabela categorias é flat (sem parent_id), então usamos a convenção
-- de nome com prefixo "Indireto · " pra agrupar visualmente.

insert into categorias (nome, tipo, ordem) values
  ('Custos Indiretos / Rateios', 'despesa', 200),
  ('Indireto · Sindicato',           'despesa', 201),
  ('Indireto · Medicina do trabalho','despesa', 202),
  ('Indireto · EPI (geral)',         'despesa', 203),
  ('Indireto · Uniforme',            'despesa', 204),
  ('Indireto · Treinamento',         'despesa', 205),
  ('Indireto · Administrativo',      'despesa', 206),
  ('Indireto · Contabilidade',       'despesa', 207),
  ('Indireto · Sistema / Software',  'despesa', 208),
  ('Indireto · Outros',              'despesa', 209)
on conflict (nome, tipo) do nothing;
