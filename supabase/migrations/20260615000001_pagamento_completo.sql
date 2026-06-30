-- Fecha o ciclo de contas a pagar: parcela.pagar agora aceita forma de
-- pagamento, comprovante e observações estruturadas. Antes só tinha
-- data_pagamento + observacoes texto livre.

alter table parcelas add column if not exists forma_pagamento text;
alter table parcelas add column if not exists comprovante_url text;
alter table parcelas add column if not exists pago_via_conta text;

comment on column parcelas.forma_pagamento is
  'pix | a_vista | debito | credito | boleto_loja | ted | doc | dinheiro | outro';
comment on column parcelas.comprovante_url is
  'storage path do comprovante (PDF ou imagem) no bucket parcela-comprovantes';
comment on column parcelas.pago_via_conta is
  'descrição livre da conta bancária de origem (banco/agência/conta), até integrar gestão de contas';
