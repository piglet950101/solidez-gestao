-- Núcleo financeiro: compras, alocações, parcelas, custos fixos, medições, recebimentos, antecipações, imposto

create type rateio_modo as enum ('igual','percentual','valor','quantidade');
create type quem_pagou_tipo as enum ('empresa','socio','funcionario');
create type parcela_status as enum ('pendente','pago','atrasado','cancelado');
create type recebimento_tipo as enum ('dinheiro','permuta');
create type imposto_status as enum ('pendente_rateio','rateado','pago');

------------------------------------------------------------------
-- Compras

create table compras (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete restrict,
  fornecedor_id uuid references fornecedores(id) on delete set null,
  categoria_id uuid references categorias(id) on delete set null,
  descricao text not null,
  valor_total numeric(14,2) not null check (valor_total > 0),
  data_compra date not null,
  num_parcelas int not null default 1 check (num_parcelas >= 1),
  rateio_modo rateio_modo not null,
  quem_pagou quem_pagou_tipo not null default 'empresa',
  pago_por_socio_id uuid references socios(id) on delete set null,
  pago_por_funcionario_id uuid,
  formato_pagamento text,
  foto_nota_url text,
  observacoes text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (
    (quem_pagou = 'empresa' and pago_por_socio_id is null and pago_por_funcionario_id is null)
    or (quem_pagou = 'socio' and pago_por_socio_id is not null)
    or (quem_pagou = 'funcionario' and pago_por_funcionario_id is not null)
  )
);

create index on compras (empresa_id, data_compra desc);
create index on compras using gin (descricao gin_trgm_ops);
create trigger trg_compras_atualizado before update on compras
  for each row execute function set_atualizado_em();

create table compra_alocacoes (
  id uuid primary key default uuid_generate_v4(),
  compra_id uuid not null references compras(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete restrict,
  valor_alocado numeric(14,2) not null check (valor_alocado >= 0),
  qtd_alocada numeric(14,3),
  percentual_alocado numeric(5,2),
  unique (compra_id, obra_id)
);

create index on compra_alocacoes (obra_id);

create or replace function check_compra_alocacoes_total() returns trigger as $$
declare
  alocado numeric;
  total numeric;
  cid uuid := coalesce(new.compra_id, old.compra_id);
begin
  select coalesce(sum(valor_alocado),0) into alocado
    from compra_alocacoes where compra_id = cid;
  select valor_total into total from compras where id = cid;
  if alocado > total + 0.01 then
    raise exception 'Alocação (%) excede total da compra (%)', alocado, total;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_compra_alocacoes_check
  after insert or update or delete on compra_alocacoes
  for each row execute function check_compra_alocacoes_total();

------------------------------------------------------------------
-- Parcelas (datas e valores totalmente editáveis — sem padrão fixo 30/60/90)

create table parcelas (
  id uuid primary key default uuid_generate_v4(),
  compra_id uuid not null references compras(id) on delete cascade,
  num_parcela int not null,
  data_vencimento date not null,
  valor numeric(14,2) not null check (valor > 0),
  status parcela_status not null default 'pendente',
  data_pagamento date,
  observacoes text,
  unique (compra_id, num_parcela)
);

create index on parcelas (status, data_vencimento) where status in ('pendente','atrasado');
create index on parcelas (data_vencimento) where status = 'pendente';

------------------------------------------------------------------
-- Custos fixos atribuíveis (endereçamento manual, sem rateio uniforme)

create table custos_fixos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete restrict,
  descricao text not null,
  categoria_id uuid references categorias(id) on delete set null,
  valor_mensal numeric(14,2) not null,
  dia_vencimento int check (dia_vencimento between 1 and 31),
  vigencia_inicio date not null default current_date,
  vigencia_fim date,
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now()
);

create table custos_fixos_alocacoes (
  id uuid primary key default uuid_generate_v4(),
  custo_fixo_id uuid not null references custos_fixos(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete restrict,
  percentual numeric(5,2) not null check (percentual > 0 and percentual <= 100),
  unique (custo_fixo_id, obra_id)
);

------------------------------------------------------------------
-- Receitas: medições + recebimentos + antecipações

create table medicoes (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid not null references obras(id) on delete restrict,
  etapa_id uuid references etapas_obra(id) on delete set null,
  num_medicao int not null,
  descricao text,
  valor_bruto numeric(14,2) not null check (valor_bruto > 0),
  valor_liquido numeric(14,2) not null check (valor_liquido > 0),
  percentual_imposto_estimado numeric(5,2),
  data_emissao date not null,
  num_nota_fiscal text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (obra_id, num_medicao)
);

create index on medicoes (obra_id, data_emissao desc);
create trigger trg_medicoes_atualizado before update on medicoes
  for each row execute function set_atualizado_em();

create table recebimentos (
  id uuid primary key default uuid_generate_v4(),
  medicao_id uuid not null references medicoes(id) on delete cascade,
  valor numeric(14,2) not null check (valor > 0),
  data_recebimento date not null,
  tipo recebimento_tipo not null default 'dinheiro',
  descricao_permuta text,
  observacoes text,
  criado_em timestamptz not null default now(),
  check ((tipo = 'permuta' and descricao_permuta is not null) or tipo = 'dinheiro')
);

create index on recebimentos (medicao_id);
create index on recebimentos (data_recebimento desc, tipo);

-- Antecipação: contratante paga (ex.) dia 20, depois abate na medição final do mês.
create table antecipacoes (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid not null references obras(id) on delete restrict,
  data_recebimento date not null,
  valor numeric(14,2) not null check (valor > 0),
  abatido_em_medicao_id uuid references medicoes(id) on delete set null,
  observacoes text,
  criado_em timestamptz not null default now()
);

create index on antecipacoes (obra_id, data_recebimento desc);
create index on antecipacoes (abatido_em_medicao_id);

------------------------------------------------------------------
-- Imposto em duas etapas

create table impostos (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete restrict,
  mes_referencia date not null,
  valor_total numeric(14,2) not null check (valor_total > 0),
  status imposto_status not null default 'pendente_rateio',
  data_vencimento date,
  data_pagamento date,
  num_boleto text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, mes_referencia, num_boleto)
);

create trigger trg_impostos_atualizado before update on impostos
  for each row execute function set_atualizado_em();

create table imposto_alocacoes (
  imposto_id uuid not null references impostos(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete restrict,
  valor numeric(14,2) not null check (valor >= 0),
  primary key (imposto_id, obra_id)
);

create or replace function check_imposto_alocacoes_total() returns trigger as $$
declare
  total numeric;
  alocado numeric;
  iid uuid := coalesce(new.imposto_id, old.imposto_id);
begin
  select coalesce(sum(valor),0) into alocado from imposto_alocacoes where imposto_id = iid;
  select valor_total into total from impostos where id = iid;
  if alocado > total + 0.01 then
    raise exception 'Alocação de imposto (%) excede total (%)', alocado, total;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_imposto_alocacoes_check
  after insert or update or delete on imposto_alocacoes
  for each row execute function check_imposto_alocacoes_total();
