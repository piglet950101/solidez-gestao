-- Refinamento da feature de documentos do funcionário (pedido da Débora):
-- - data de realização do curso (além da validade)
-- - novo tipo de alerta pra documentos vencendo
--
-- Parte 1 (rodar isolada — Postgres não usa novo enum value na mesma transação).

alter type alerta_tipo add value if not exists 'doc_funcionario_vencendo';

alter table funcionario_documentos
  add column if not exists data_realizacao date;
