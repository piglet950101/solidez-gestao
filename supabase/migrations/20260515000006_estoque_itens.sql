-- Fase A do aditivo: estoque central + itens + linhas de itens na compra
-- Não toca em compras existentes (mantém compras.descricao livre como antes).
-- Compras novas podem ter linhas detalhadas em compra_itens; quando tiverem,
-- a entrada no estoque é gerada automaticamente.

create type item_movimentacao_tipo as enum (
  'entrada_compra',
  'saida_requisicao',
  'saida_epi',
  'ajuste_positivo',
  'ajuste_negativo',
  'devolucao'
);

------------------------------------------------------------------
-- Itens cadastrados (almoxarifado)

create table if not exists itens (
  id                 uuid primary key default uuid_generate_v4(),
  nome               text not null,
  codigo_interno     text unique,
  unidade            text not null,             -- 'un','kg','m','L','sc','cx','par'
  categoria_id       uuid references categorias(id) on delete set null,
  valor_medio        numeric(14,4),             -- média móvel ponderada
  saldo_atual        numeric(14,4) not null default 0,
  estoque_minimo     numeric(14,4),
  controla_validade  boolean not null default false,
  eh_epi             boolean not null default false,
  ativo              boolean not null default true,
  observacoes        text,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

create index if not exists itens_categoria_idx on itens (categoria_id);
create index if not exists itens_ativo_idx on itens (ativo);
create index if not exists itens_eh_epi_idx on itens (eh_epi) where eh_epi = true;
create index if not exists itens_nome_trgm_idx on itens using gin (nome gin_trgm_ops);

create trigger trg_itens_atualizado before update on itens
  for each row execute function set_atualizado_em();

------------------------------------------------------------------
-- Movimentações de estoque

create table if not exists itens_movimentacoes (
  id              uuid primary key default uuid_generate_v4(),
  item_id         uuid not null references itens(id) on delete restrict,
  tipo            item_movimentacao_tipo not null,
  quantidade      numeric(14,4) not null check (quantidade > 0),
  valor_unitario  numeric(14,4),
  obra_id         uuid references obras(id) on delete set null,  -- destino em saídas, null em entradas
  origem_tipo     text,                                          -- 'compra' | 'requisicao' | 'epi_entrega' | 'ajuste_manual'
  origem_id       uuid,                                          -- FK polimórfica (não declara constraint aqui)
  observacao      text,
  criado_por      uuid references auth.users(id) on delete set null,
  criado_em       timestamptz not null default now()
);

create index if not exists itens_movs_item_idx on itens_movimentacoes (item_id, criado_em desc);
create index if not exists itens_movs_obra_idx on itens_movimentacoes (obra_id) where obra_id is not null;
create index if not exists itens_movs_origem_idx on itens_movimentacoes (origem_tipo, origem_id);

------------------------------------------------------------------
-- Linhas de itens em uma compra (substitui descrição livre quando NF detalhada)

create table if not exists compra_itens (
  id              uuid primary key default uuid_generate_v4(),
  compra_id       uuid not null references compras(id) on delete cascade,
  item_id         uuid not null references itens(id) on delete restrict,
  quantidade      numeric(14,4) not null check (quantidade > 0),
  valor_unitario  numeric(14,4) not null check (valor_unitario >= 0),
  valor_total     numeric(14,4) generated always as (quantidade * valor_unitario) stored,
  observacao      text
);

create index if not exists compra_itens_compra_idx on compra_itens (compra_id);
create index if not exists compra_itens_item_idx on compra_itens (item_id);

------------------------------------------------------------------
-- Trigger: ao inserir compra_itens, cria entrada de estoque e atualiza saldo + valor médio

create or replace function fn_aplicar_compra_item() returns trigger as $$
declare
  v_saldo_anterior numeric;
  v_valor_anterior numeric;
  v_novo_saldo numeric;
  v_novo_valor_medio numeric;
begin
  -- Lock the item row
  select saldo_atual, coalesce(valor_medio, 0)
    into v_saldo_anterior, v_valor_anterior
    from itens where id = new.item_id for update;

  v_novo_saldo := v_saldo_anterior + new.quantidade;
  -- Média móvel ponderada: ((saldo * valor_medio) + (qtd * valor_unit)) / novo_saldo
  if v_novo_saldo > 0 then
    v_novo_valor_medio := round(
      ((v_saldo_anterior * v_valor_anterior) + (new.quantidade * new.valor_unitario)) / v_novo_saldo,
      4
    );
  else
    v_novo_valor_medio := new.valor_unitario;
  end if;

  update itens
     set saldo_atual = v_novo_saldo,
         valor_medio = v_novo_valor_medio
   where id = new.item_id;

  insert into itens_movimentacoes (item_id, tipo, quantidade, valor_unitario, origem_tipo, origem_id, criado_por)
  values (new.item_id, 'entrada_compra', new.quantidade, new.valor_unitario, 'compra', new.compra_id, auth.uid());

  return new;
end;
$$ language plpgsql;

create trigger trg_compra_itens_aplicar
  after insert on compra_itens
  for each row execute function fn_aplicar_compra_item();

-- Reverter quando compra_itens é deletado (em caso de exclusão de compra)
create or replace function fn_reverter_compra_item() returns trigger as $$
begin
  update itens
     set saldo_atual = saldo_atual - old.quantidade
   where id = old.item_id;
  -- Movimentação de reversão fica no histórico
  insert into itens_movimentacoes (item_id, tipo, quantidade, valor_unitario, origem_tipo, origem_id, observacao, criado_por)
  values (old.item_id, 'ajuste_negativo', old.quantidade, old.valor_unitario, 'compra', old.compra_id,
          'Reversão automática — compra excluída', auth.uid());
  return old;
end;
$$ language plpgsql;

create trigger trg_compra_itens_reverter
  before delete on compra_itens
  for each row execute function fn_reverter_compra_item();

------------------------------------------------------------------
-- RPC: dá saída no estoque (usado por requisições e entrega de EPI)
-- Validação: rejeita saída maior que saldo atual

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
  if p_tipo not in ('saida_requisicao','saida_epi','ajuste_negativo') then
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
