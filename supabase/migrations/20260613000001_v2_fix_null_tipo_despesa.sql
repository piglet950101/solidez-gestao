-- V2 fix: fn_criar_compra com p_tipo_despesa NULL e p_alocacoes vazio caía no
-- bypass (NULL <> 'estoque' = NULL → AND short-circuit). Resultado: compra
-- criada sem alocações. Agora exige alocação salvo quando explicitamente estoque.

create or replace function fn_criar_compra(
  p_empresa_id uuid,
  p_fornecedor_id uuid,
  p_categoria_id uuid,
  p_descricao text,
  p_valor_total numeric,
  p_data_compra date,
  p_rateio_modo rateio_modo,
  p_quem_pagou quem_pagou_tipo,
  p_pago_por_socio_id uuid,
  p_pago_por_funcionario_id uuid,
  p_formato_pagamento text,
  p_foto_nota_url text,
  p_alocacoes jsonb,
  p_parcelas jsonb,
  p_veiculo_id uuid default null,
  p_funcionario_id uuid default null,
  p_fase_funcionario fase_funcionario default null,
  p_tipo_despesa text default null
) returns uuid as $$
declare
  v_compra_id uuid;
  v_alocacao jsonb;
  v_parcela jsonb;
  v_idx int := 1;
  v_subtipo text;
  v_veiculo_custo_tipo veiculo_custo_tipo;
begin
  -- Só compras explicitamente marcadas como estoque podem ter alocações vazias
  if coalesce(p_tipo_despesa, '') <> 'estoque' and jsonb_array_length(p_alocacoes) = 0 then
    raise exception 'Compra precisa de pelo menos uma alocação';
  end if;
  if jsonb_array_length(p_parcelas) = 0 then
    raise exception 'Compra precisa de pelo menos uma parcela';
  end if;
  if (p_funcionario_id is not null) <> (p_fase_funcionario is not null) then
    raise exception 'funcionario_id e fase_funcionario devem ser informados juntos';
  end if;
  if p_tipo_despesa is not null and p_tipo_despesa not in ('individual_obra','administrativa','estoque') then
    raise exception 'tipo_despesa inválido: %', p_tipo_despesa;
  end if;

  insert into compras (
    empresa_id, fornecedor_id, categoria_id, descricao, valor_total, data_compra,
    num_parcelas, rateio_modo, quem_pagou, pago_por_socio_id, pago_por_funcionario_id,
    formato_pagamento, foto_nota_url, veiculo_id, funcionario_id, fase_funcionario,
    tipo_despesa, criado_por
  ) values (
    p_empresa_id, p_fornecedor_id, p_categoria_id, p_descricao, p_valor_total, p_data_compra,
    jsonb_array_length(p_parcelas), p_rateio_modo, p_quem_pagou, p_pago_por_socio_id, p_pago_por_funcionario_id,
    p_formato_pagamento, p_foto_nota_url, p_veiculo_id, p_funcionario_id, p_fase_funcionario,
    p_tipo_despesa, auth.uid()
  ) returning id into v_compra_id;

  for v_alocacao in select * from jsonb_array_elements(p_alocacoes) loop
    insert into compra_alocacoes (compra_id, obra_id, valor_alocado, qtd_alocada, percentual_alocado)
    values (
      v_compra_id,
      (v_alocacao->>'obra_id')::uuid,
      (v_alocacao->>'valor_alocado')::numeric,
      (v_alocacao->>'qtd_alocada')::numeric,
      (v_alocacao->>'percentual_alocado')::numeric
    );
  end loop;

  for v_parcela in select * from jsonb_array_elements(p_parcelas) loop
    insert into parcelas (compra_id, num_parcela, data_vencimento, valor)
    values (
      v_compra_id,
      v_idx,
      (v_parcela->>'data_vencimento')::date,
      (v_parcela->>'valor')::numeric
    );
    v_idx := v_idx + 1;
  end loop;

  if p_quem_pagou = 'socio' then
    insert into pro_labore (socio_id, obra_id, mes_referencia, valor_definido, status, observacoes)
    select p_pago_por_socio_id, ca.obra_id, date_trunc('month', p_data_compra)::date,
           ca.valor_alocado, 'previsto'::pro_labore_status,
           'Reembolso compra ' || left(p_descricao, 40)
      from compra_alocacoes ca where ca.compra_id = v_compra_id
    on conflict (socio_id, obra_id, mes_referencia) do update
      set valor_definido = pro_labore.valor_definido + excluded.valor_definido;
  end if;

  if p_veiculo_id is not null then
    select categorias.subtipo into v_subtipo from categorias where id = p_categoria_id;
    v_veiculo_custo_tipo := case v_subtipo
      when 'combustivel' then 'combustivel'::veiculo_custo_tipo
      when 'manutencao_veiculo' then 'manutencao'::veiculo_custo_tipo
      when 'oleo' then 'manutencao'::veiculo_custo_tipo
      when 'pneus' then 'manutencao'::veiculo_custo_tipo
      when 'documentacao_veiculo' then 'documentacao'::veiculo_custo_tipo
      else 'outros'::veiculo_custo_tipo
    end;
    insert into veiculo_custos (veiculo_id, tipo, data, valor, fornecedor_id, descricao, compra_id)
    values (p_veiculo_id, v_veiculo_custo_tipo, p_data_compra, p_valor_total, p_fornecedor_id, p_descricao, v_compra_id);
  end if;

  return v_compra_id;
end;
$$ language plpgsql security definer;
