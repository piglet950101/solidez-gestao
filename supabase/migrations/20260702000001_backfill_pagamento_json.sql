-- Backfill: parcelas que já foram pagas via a versão anterior guardaram os
-- metadados como JSON dentro de parcelas.observacoes. Agora que as colunas
-- próprias existem (forma_pagamento, pago_via_conta, comprovante_url), migra
-- os dados pra os campos certos e restaura observacoes pra ser texto livre
-- só com o campo "obs" original (ou NULL).

do $$
declare
  r record;
  parsed jsonb;
begin
  for r in
    select id, observacoes
      from parcelas
     where observacoes is not null
       and trim(observacoes) like '{%'
  loop
    begin
      parsed := r.observacoes::jsonb;
    exception when others then
      -- não é JSON válido, ignora
      continue;
    end;

    -- Só migra se tem pelo menos uma chave do formato esperado
    if not (parsed ? 'forma' or parsed ? 'conta' or parsed ? 'comprovante' or parsed ? 'obs') then
      continue;
    end if;

    update parcelas
       set forma_pagamento = coalesce(forma_pagamento, nullif(parsed->>'forma', '')),
           pago_via_conta = coalesce(pago_via_conta, nullif(parsed->>'conta', '')),
           comprovante_url = coalesce(comprovante_url, nullif(parsed->>'comprovante', '')),
           observacoes = nullif(parsed->>'obs', '')
     where id = r.id;
  end loop;
end $$;
