-- Fase B do aditivo: requisições mobile pelo mestre da obra.
-- Fluxo: mestre na obra abre /requisicoes/nova, escolhe obra, adiciona itens com qtd,
-- envia. Almoxarife/escritório atende em /requisicoes/[id], saída sai do estoque,
-- custo cai na obra que pediu (via valor_medio atual do item).

create type requisicao_status as enum ('aberta','parcialmente_atendida','atendida','cancelada');

create table if not exists requisicoes (
  id                uuid primary key default uuid_generate_v4(),
  obra_id           uuid not null references obras(id) on delete restrict,
  solicitante_id    uuid references auth.users(id) on delete set null,
  status            requisicao_status not null default 'aberta',
  observacao        text,
  data_solicitacao  timestamptz not null default now(),
  data_atendimento  timestamptz,
  atendida_por      uuid references auth.users(id) on delete set null,
  criado_em         timestamptz not null default now()
);

create index if not exists requisicoes_obra_idx on requisicoes (obra_id, data_solicitacao desc);
create index if not exists requisicoes_status_idx on requisicoes (status) where status in ('aberta','parcialmente_atendida');

create table if not exists requisicao_itens (
  id                    uuid primary key default uuid_generate_v4(),
  requisicao_id         uuid not null references requisicoes(id) on delete cascade,
  item_id               uuid not null references itens(id) on delete restrict,
  quantidade_pedida     numeric(14,4) not null check (quantidade_pedida > 0),
  quantidade_atendida   numeric(14,4) not null default 0 check (quantidade_atendida >= 0),
  observacao            text,
  constraint requisicao_itens_unico unique (requisicao_id, item_id)
);

create index if not exists requisicao_itens_req_idx on requisicao_itens (requisicao_id);
create index if not exists requisicao_itens_item_idx on requisicao_itens (item_id);

------------------------------------------------------------------
-- RPC: atende uma requisição (ou parcialmente).
-- Recebe array de { item_id, quantidade } e para cada um:
--   1) confere saldo (fn_dar_saida_estoque já valida)
--   2) dá saída no estoque com tipo='saida_requisicao' e obra_id da requisição
--   3) atualiza quantidade_atendida na linha da requisição
-- Atualiza status da requisição: atendida se TODAS as linhas com pedido == atendido,
-- parcialmente_atendida caso alguma esteja parcial.

create or replace function fn_atender_requisicao(
  p_requisicao_id uuid,
  p_itens jsonb  -- [{ item_id: uuid, quantidade: number, observacao?: text }]
) returns void as $$
declare
  v_obra_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_qtd numeric;
  v_obs text;
  v_total_pendente numeric;
  v_total_atendido numeric;
begin
  select obra_id into v_obra_id from requisicoes where id = p_requisicao_id;
  if v_obra_id is null then
    raise exception 'Requisição não encontrada';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_item_id := (v_item->>'item_id')::uuid;
    v_qtd := (v_item->>'quantidade')::numeric;
    v_obs := v_item->>'observacao';
    if v_qtd <= 0 then continue; end if;

    -- Dá saída no estoque (fn_dar_saida_estoque valida saldo e cria movimentação)
    perform fn_dar_saida_estoque(
      v_item_id,
      v_qtd,
      'saida_requisicao'::item_movimentacao_tipo,
      v_obra_id,
      'requisicao',
      p_requisicao_id,
      v_obs
    );

    -- Atualiza quantidade_atendida na linha da requisição
    update requisicao_itens
       set quantidade_atendida = quantidade_atendida + v_qtd
     where requisicao_id = p_requisicao_id
       and item_id = v_item_id;
  end loop;

  -- Recalcula status
  select coalesce(sum(quantidade_pedida - quantidade_atendida), 0),
         coalesce(sum(quantidade_atendida), 0)
    into v_total_pendente, v_total_atendido
    from requisicao_itens where requisicao_id = p_requisicao_id;

  if v_total_pendente <= 0.0001 and v_total_atendido > 0 then
    update requisicoes
       set status = 'atendida',
           data_atendimento = now(),
           atendida_por = auth.uid()
     where id = p_requisicao_id;
  elsif v_total_atendido > 0 then
    update requisicoes
       set status = 'parcialmente_atendida',
           atendida_por = auth.uid()
     where id = p_requisicao_id;
  end if;
end;
$$ language plpgsql security definer;
