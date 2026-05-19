-- Fase F do aditivo: entrega de EPI integrada (estoque + funcionário + obra).
-- Quando uma entrega é registrada:
--   1) cada item da entrega gera uma saída de estoque (tipo='saida_epi')
--   2) o custo cai na obra do funcionário no momento da entrega (snapshot,
--      não migra se o funcionário for transferido depois)
--   3) os EPIs ficam vinculados ao funcionário com CA, validade, lote

create table if not exists epi_entregas (
  id              uuid primary key default uuid_generate_v4(),
  funcionario_id  uuid not null references funcionarios(id) on delete restrict,
  obra_id         uuid not null references obras(id) on delete restrict,
  data_entrega    date not null default current_date,
  responsavel_id  uuid references auth.users(id) on delete set null,
  assinado_em     timestamptz,
  assinatura_url  text,
  observacao      text,
  criado_em       timestamptz not null default now()
);

create index if not exists epi_entregas_funcionario_idx on epi_entregas (funcionario_id, data_entrega desc);
create index if not exists epi_entregas_obra_idx on epi_entregas (obra_id);

create table if not exists epi_entrega_itens (
  id              uuid primary key default uuid_generate_v4(),
  entrega_id      uuid not null references epi_entregas(id) on delete cascade,
  item_id         uuid not null references itens(id) on delete restrict,
  quantidade      numeric(14,4) not null check (quantidade > 0),
  numero_ca       text,
  validade        date,
  lote            text,
  motivo          text  -- 'admissao' | 'troca_desgaste' | 'reposicao' | 'troca_validade'
);

create index if not exists epi_entrega_itens_entrega_idx on epi_entrega_itens (entrega_id);
create index if not exists epi_entrega_itens_item_idx on epi_entrega_itens (item_id);

------------------------------------------------------------------
-- RPC: registra entrega de EPI integrada (estoque + custo na obra).

create or replace function fn_registrar_entrega_epi(
  p_funcionario_id uuid,
  p_obra_id uuid,
  p_data_entrega date,
  p_observacao text,
  p_itens jsonb  -- [{ item_id, quantidade, numero_ca?, validade?, lote?, motivo? }]
) returns uuid as $$
declare
  v_entrega_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_qtd numeric;
begin
  if jsonb_array_length(p_itens) = 0 then
    raise exception 'Entrega precisa de pelo menos um item';
  end if;

  insert into epi_entregas (funcionario_id, obra_id, data_entrega, responsavel_id, observacao)
  values (p_funcionario_id, p_obra_id, p_data_entrega, auth.uid(), p_observacao)
  returning id into v_entrega_id;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_item_id := (v_item->>'item_id')::uuid;
    v_qtd := (v_item->>'quantidade')::numeric;
    if v_qtd <= 0 then continue; end if;

    -- Saída de estoque com valor_unitario = custo médio atual do item
    perform fn_dar_saida_estoque(
      v_item_id,
      v_qtd,
      'saida_epi'::item_movimentacao_tipo,
      p_obra_id,
      'epi_entrega',
      v_entrega_id,
      null
    );

    insert into epi_entrega_itens (entrega_id, item_id, quantidade, numero_ca, validade, lote, motivo)
    values (
      v_entrega_id,
      v_item_id,
      v_qtd,
      nullif(v_item->>'numero_ca', ''),
      nullif(v_item->>'validade', '')::date,
      nullif(v_item->>'lote', ''),
      nullif(v_item->>'motivo', '')
    );
  end loop;

  return v_entrega_id;
end;
$$ language plpgsql security definer;
