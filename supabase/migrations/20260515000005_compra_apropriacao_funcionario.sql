-- Fase D (parte 2): apropriação de custos do funcionário por fase
-- Regra de negócio:
--   admissional -> obra de origem (funcionarios.obra_admissao_id)
--   recorrente  -> obra atual (funcionarios.obra_atual_id)
--   demissional -> última obra antes do desligamento (funcionarios.obra_demissao_id)

create type fase_funcionario as enum ('admissional','recorrente','demissional');

alter table compras
  add column if not exists funcionario_id uuid references funcionarios(id) on delete set null,
  add column if not exists fase_funcionario fase_funcionario;

create index if not exists compras_funcionario_id_idx on compras (funcionario_id) where funcionario_id is not null;

------------------------------------------------------------------
-- Helper: resolve a obra que deve absorver o custo, dado funcionário + fase
create or replace function fn_obra_para_apropriacao_funcionario(
  p_funcionario_id uuid,
  p_fase fase_funcionario
) returns uuid as $$
declare
  v_obra_id uuid;
begin
  select case p_fase
    when 'admissional' then obra_admissao_id
    when 'recorrente'  then coalesce(obra_atual_id, obra_admissao_id) -- fallback se ainda não vinculou
    when 'demissional' then coalesce(obra_demissao_id, obra_atual_id)
  end
  into v_obra_id
  from funcionarios where id = p_funcionario_id;

  return v_obra_id;
end;
$$ language plpgsql stable;

------------------------------------------------------------------
-- fn_criar_compra ganha p_funcionario_id e p_fase_funcionario opcionais.
-- Se ambos vierem, o sistema persiste os 2 campos em compras (rateio
-- continua sendo definido pelo cliente — o form pre-preenche com a obra
-- resolvida, mas o usuário pode ajustar antes de salvar).

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
  p_fase_funcionario fase_funcionario default null
) returns uuid as $$
declare
  v_compra_id uuid;
  v_alocacao jsonb;
  v_parcela jsonb;
  v_idx int := 1;
  v_subtipo text;
  v_veiculo_custo_tipo veiculo_custo_tipo;
begin
  if jsonb_array_length(p_alocacoes) = 0 then
    raise exception 'Compra precisa de pelo menos uma alocação';
  end if;
  if jsonb_array_length(p_parcelas) = 0 then
    raise exception 'Compra precisa de pelo menos uma parcela';
  end if;
  if (p_funcionario_id is not null) <> (p_fase_funcionario is not null) then
    raise exception 'funcionario_id e fase_funcionario devem ser informados juntos';
  end if;

  insert into compras (
    empresa_id, fornecedor_id, categoria_id, descricao, valor_total, data_compra,
    num_parcelas, rateio_modo, quem_pagou, pago_por_socio_id, pago_por_funcionario_id,
    formato_pagamento, foto_nota_url, veiculo_id, funcionario_id, fase_funcionario, criado_por
  ) values (
    p_empresa_id, p_fornecedor_id, p_categoria_id, p_descricao, p_valor_total, p_data_compra,
    jsonb_array_length(p_parcelas), p_rateio_modo, p_quem_pagou, p_pago_por_socio_id, p_pago_por_funcionario_id,
    p_formato_pagamento, p_foto_nota_url, p_veiculo_id, p_funcionario_id, p_fase_funcionario, auth.uid()
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
