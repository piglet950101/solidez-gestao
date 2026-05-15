-- Fix: fn_transferir_veiculo rejeitava transferência no mesmo dia
-- (a alocação aberta tinha periodo_inicio = hoje; ao setar periodo_fim = hoje - 1
-- o daterange ficava inválido com lower > upper).
-- Solução: se existir alocação aberta começando exatamente em p_data_transferencia,
-- DELETE-la (não existiu na prática); só fecha com periodo_fim quem começou em data anterior.

create or replace function fn_transferir_veiculo(
  p_veiculo_id uuid,
  p_nova_obra_id uuid,
  p_data_transferencia date default current_date,
  p_observacao text default null
) returns uuid as $$
declare
  v_nova_id uuid;
begin
  -- Caso "mesmo dia": apaga alocações abertas que começaram hoje (transferência sendo refeita).
  delete from veiculo_alocacoes
   where veiculo_id = p_veiculo_id
     and periodo_fim is null
     and periodo_inicio = p_data_transferencia;

  -- Caso normal: encerra alocações abertas no dia anterior à transferência.
  update veiculo_alocacoes
     set periodo_fim = p_data_transferencia - interval '1 day'
   where veiculo_id = p_veiculo_id
     and periodo_fim is null
     and periodo_inicio < p_data_transferencia;

  insert into veiculo_alocacoes (veiculo_id, obra_id, percentual, periodo_inicio, observacoes)
  values (p_veiculo_id, p_nova_obra_id, 100, p_data_transferencia, p_observacao)
  returning id into v_nova_id;

  return v_nova_id;
end;
$$ language plpgsql security definer;
