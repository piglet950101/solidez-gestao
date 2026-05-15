-- Fase C do aditivo: vínculo veículo × obra + auto-apropriação de combustível/manutenção
-- Reusa a tabela veiculo_alocacoes existente (que já tem periodo_inicio/periodo_fim com gist exclusion).
-- Adiciona ligação direta compra → veículo, e marcação de categorias "veiculares" via subtipo.

------------------------------------------------------------------
-- Categorias: subtipo opcional para classificar categorias de despesa de veículo
-- Valores reservados: 'combustivel','manutencao_veiculo','oleo','pneus','documentacao_veiculo'

alter table categorias
  add column if not exists subtipo text;

create index if not exists categorias_subtipo_idx on categorias (subtipo) where subtipo is not null;

-- Seed: marca categorias veiculares se já existirem (idempotente)
update categorias set subtipo = 'combustivel' where lower(nome) = 'combustível' and subtipo is null;
update categorias set subtipo = 'manutencao_veiculo' where lower(nome) = 'manutenção' and subtipo is null;

-- Garante que existam as categorias-base de despesa veicular (idempotente via ON CONFLICT do nome+tipo)
insert into categorias (nome, tipo, subtipo, ordem) values
  ('Combustível', 'despesa', 'combustivel', 30),
  ('Manutenção veículo', 'despesa', 'manutencao_veiculo', 31),
  ('Troca de óleo', 'despesa', 'oleo', 32),
  ('Pneus', 'despesa', 'pneus', 33),
  ('Documentação veículo', 'despesa', 'documentacao_veiculo', 34)
on conflict (nome, tipo) do update set subtipo = excluded.subtipo
  where categorias.subtipo is null or categorias.subtipo = excluded.subtipo;

------------------------------------------------------------------
-- Compras: vínculo opcional com um veículo
alter table compras
  add column if not exists veiculo_id uuid references veiculos(id) on delete set null;

create index if not exists compras_veiculo_id_idx on compras (veiculo_id) where veiculo_id is not null;

------------------------------------------------------------------
-- Veiculo_custos: rastreabilidade da compra que originou o custo
alter table veiculo_custos
  add column if not exists compra_id uuid references compras(id) on delete cascade;

create index if not exists veiculo_custos_compra_id_idx on veiculo_custos (compra_id) where compra_id is not null;

------------------------------------------------------------------
-- Helper: obra(s) atual(is) de um veículo numa data específica
-- Retorna 0..N linhas conforme veiculo_alocacoes (suporta veículo em múltiplas obras com percentual)

create or replace function fn_obras_do_veiculo(p_veiculo_id uuid, p_data date default current_date)
returns table (obra_id uuid, percentual numeric) as $$
  select va.obra_id, va.percentual
    from veiculo_alocacoes va
   where va.veiculo_id = p_veiculo_id
     and va.periodo_inicio <= p_data
     and (va.periodo_fim is null or va.periodo_fim >= p_data);
$$ language sql stable;

------------------------------------------------------------------
-- Helper: transferir veículo para uma nova obra (encerra alocação atual de 100% e abre nova)
-- Caso o veículo tenha rateio entre múltiplas obras, encerra todas as abertas e abre uma única em 100%.
-- Uso simples para o caso comum de "transferir para outra obra".

create or replace function fn_transferir_veiculo(
  p_veiculo_id uuid,
  p_nova_obra_id uuid,
  p_data_transferencia date default current_date,
  p_observacao text default null
) returns uuid as $$
declare
  v_nova_id uuid;
begin
  -- Encerra alocações ativas (data_fim = dia anterior à transferência)
  update veiculo_alocacoes
     set periodo_fim = p_data_transferencia - interval '1 day'
   where veiculo_id = p_veiculo_id
     and periodo_fim is null
     and periodo_inicio <= p_data_transferencia;

  -- Abre nova alocação 100% na obra destino
  insert into veiculo_alocacoes (veiculo_id, obra_id, percentual, periodo_inicio, observacoes)
  values (p_veiculo_id, p_nova_obra_id, 100, p_data_transferencia, p_observacao)
  returning id into v_nova_id;

  return v_nova_id;
end;
$$ language plpgsql security definer;

------------------------------------------------------------------
-- fn_criar_compra: aceita p_veiculo_id; quando informado, cria veiculo_custos automaticamente
-- mapeando categorias.subtipo para veiculo_custos.tipo.

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
  p_veiculo_id uuid default null
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

  insert into compras (
    empresa_id, fornecedor_id, categoria_id, descricao, valor_total, data_compra,
    num_parcelas, rateio_modo, quem_pagou, pago_por_socio_id, pago_por_funcionario_id,
    formato_pagamento, foto_nota_url, veiculo_id, criado_por
  ) values (
    p_empresa_id, p_fornecedor_id, p_categoria_id, p_descricao, p_valor_total, p_data_compra,
    jsonb_array_length(p_parcelas), p_rateio_modo, p_quem_pagou, p_pago_por_socio_id, p_pago_por_funcionario_id,
    p_formato_pagamento, p_foto_nota_url, p_veiculo_id, auth.uid()
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

  -- Se sócio pagou do bolso, gera reembolso pendente
  if p_quem_pagou = 'socio' then
    insert into pro_labore (socio_id, obra_id, mes_referencia, valor_definido, status, observacoes)
    select p_pago_por_socio_id, ca.obra_id, date_trunc('month', p_data_compra)::date,
           ca.valor_alocado, 'previsto'::pro_labore_status,
           'Reembolso compra ' || left(p_descricao, 40)
      from compra_alocacoes ca where ca.compra_id = v_compra_id
    on conflict (socio_id, obra_id, mes_referencia) do update
      set valor_definido = pro_labore.valor_definido + excluded.valor_definido;
  end if;

  -- Auto-criar veiculo_custos quando compra estiver vinculada a um veículo
  if p_veiculo_id is not null then
    -- Resolve o tipo do custo via subtipo da categoria (cai em 'outros' se não bater)
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

------------------------------------------------------------------
-- Quando uma compra vinculada a veículo é excluída, o veiculo_custos correspondente
-- também é excluído (ON DELETE CASCADE em veiculo_custos.compra_id já garante).
