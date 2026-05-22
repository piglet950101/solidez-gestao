-- Parte 2: fn_dar_saida_estoque passa a aceitar o tipo 'saida_obra'.

create or replace function fn_dar_saida_estoque(
  p_item_id uuid,
  p_quantidade numeric,
  p_tipo item_movimentacao_tipo,
  p_obra_id uuid,
  p_origem_tipo text,
  p_origem_id uuid,
  p_observacao text default null
) returns uuid as $$
declare
  v_saldo numeric;
  v_valor_medio numeric;
  v_mov_id uuid;
begin
  if p_quantidade <= 0 then
    raise exception 'Quantidade deve ser positiva';
  end if;
  if p_tipo not in ('saida_requisicao','saida_epi','saida_obra','ajuste_negativo') then
    raise exception 'Tipo de saída inválido: %', p_tipo;
  end if;

  select saldo_atual, coalesce(valor_medio, 0)
    into v_saldo, v_valor_medio
    from itens where id = p_item_id for update;

  if v_saldo < p_quantidade then
    raise exception 'Saldo insuficiente: % disponível, % solicitado', v_saldo, p_quantidade;
  end if;

  update itens set saldo_atual = saldo_atual - p_quantidade where id = p_item_id;

  insert into itens_movimentacoes (item_id, tipo, quantidade, valor_unitario, obra_id, origem_tipo, origem_id, observacao, criado_por)
  values (p_item_id, p_tipo, p_quantidade, v_valor_medio, p_obra_id, p_origem_tipo, p_origem_id, p_observacao, auth.uid())
  returning id into v_mov_id;

  return v_mov_id;
end;
$$ language plpgsql security definer;
