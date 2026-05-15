-- Limpeza: PostgreSQL mantinha 3 versões de fn_criar_compra
-- (14, 15 e 17 argumentos) por causa dos defaults adicionados em migrations
-- incrementais. Isso causava "Could not choose the best candidate function"
-- quando o client chamava sem passar os args opcionais.
-- Removemos as 2 versões antigas, deixando só a mais nova (17 args).

drop function if exists fn_criar_compra(
  uuid, uuid, uuid, text, numeric, date,
  rateio_modo, quem_pagou_tipo, uuid, uuid,
  text, text, jsonb, jsonb
);

drop function if exists fn_criar_compra(
  uuid, uuid, uuid, text, numeric, date,
  rateio_modo, quem_pagou_tipo, uuid, uuid,
  text, text, jsonb, jsonb, uuid
);

-- A versão de 17 args (com p_veiculo_id, p_funcionario_id, p_fase_funcionario
-- todas com default null) permanece e atende todos os clients que chamam
-- a função sem esses argumentos opcionais.
