-- Folha de pagamento: funcionários, lançamentos, vales, empreitada, comissões, pró-labore

create type tipo_contrato as enum ('clt','horista','empreitada','temporario');
create type funcionario_status as enum ('ativo','desligado','experiencia','afastado');
create type folha_status as enum ('aberta','fechada','paga');

create table funcionarios (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  cpf text,
  rg text,
  chave_pix text,
  contato text,
  cargo text,
  tipo_contrato tipo_contrato not null default 'horista',
  salario_hora numeric(10,2),
  salario_mes numeric(10,2),
  status funcionario_status not null default 'ativo',
  data_admissao date,
  data_desligamento date,
  registrado boolean not null default false,
  tem_os_curso boolean not null default false,
  os_curso_validade date,
  tamanho_sapato text,
  tamanho_camiseta text,
  tamanho_calca text,
  observacoes text,
  cabeca_de_empreitada boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index funcionarios_cpf_unique on funcionarios (cpf) where cpf is not null;
create index on funcionarios (status, nome);
create index on funcionarios using gin (nome gin_trgm_ops);
create trigger trg_funcionarios_atualizado before update on funcionarios
  for each row execute function set_atualizado_em();

-- Permite carga inicial de compras pagas pelo funcionário (FK delayed acima)
alter table compras add constraint compras_pago_funcionario_fk
  foreign key (pago_por_funcionario_id) references funcionarios(id) on delete set null;

------------------------------------------------------------------
-- Lançamentos da folha (mensal/quinzenal por obra)

create table lancamentos_folha (
  id uuid primary key default uuid_generate_v4(),
  funcionario_id uuid not null references funcionarios(id) on delete restrict,
  obra_id uuid not null references obras(id) on delete restrict,
  empresa_id uuid not null references empresas(id) on delete restrict,
  mes_referencia date not null,
  dias_9h numeric(6,2) not null default 0,
  dias_8h numeric(6,2) not null default 0,
  horas_extras numeric(6,2) not null default 0,
  horas_faltantes numeric(6,2) not null default 0,
  valor_extras numeric(12,2) not null default 0,
  total_horas numeric(8,2) generated always as (dias_9h*9 + dias_8h*8 + horas_extras - horas_faltantes) stored,
  valor_horas numeric(12,2) not null default 0,
  valor_salario_fixo numeric(12,2) not null default 0,
  valor_comissao numeric(12,2) not null default 0,
  valor_vales numeric(12,2) not null default 0,
  valor_outros_descontos numeric(12,2) not null default 0,
  valor_liquido numeric(12,2) not null default 0,
  valor_em_especie numeric(12,2) not null default 0,
  status folha_status not null default 'aberta',
  data_pagamento date,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (funcionario_id, obra_id, mes_referencia)
);

create index on lancamentos_folha (mes_referencia desc, status);
create index on lancamentos_folha (funcionario_id, mes_referencia desc);
create trigger trg_lancamentos_folha_atualizado before update on lancamentos_folha
  for each row execute function set_atualizado_em();

------------------------------------------------------------------
-- Vales lançáveis em campo, descontados na próxima folha

create table vales (
  id uuid primary key default uuid_generate_v4(),
  funcionario_id uuid not null references funcionarios(id) on delete restrict,
  obra_id uuid references obras(id) on delete set null,
  data date not null,
  valor numeric(10,2) not null check (valor > 0),
  descontado_em_folha_id uuid references lancamentos_folha(id) on delete set null,
  lancado_por uuid references auth.users(id) on delete set null,
  observacoes text,
  criado_em timestamptz not null default now()
);

create index on vales (funcionario_id) where descontado_em_folha_id is null;

------------------------------------------------------------------
-- Empreitada com pagamento ao cabeça (sem cadastrar a equipe)

create type empreitada_status as enum ('em_andamento','concluida','cancelada');

create table empreitadas (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid not null references obras(id) on delete restrict,
  descricao text not null,
  valor_total numeric(14,2) not null check (valor_total > 0),
  cabeca_funcionario_id uuid not null references funcionarios(id) on delete restrict,
  status empreitada_status not null default 'em_andamento',
  data_inicio date not null,
  data_conclusao date,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger trg_empreitadas_atualizado before update on empreitadas
  for each row execute function set_atualizado_em();

create table empreitada_pagamentos (
  id uuid primary key default uuid_generate_v4(),
  empreitada_id uuid not null references empreitadas(id) on delete cascade,
  data date not null,
  valor numeric(14,2) not null check (valor > 0),
  observacoes text,
  criado_em timestamptz not null default now()
);

create index on empreitada_pagamentos (empreitada_id, data desc);

------------------------------------------------------------------
-- Comissão genérica (qualquer funcionário, por obra/mês)

create table funcionario_comissoes (
  id uuid primary key default uuid_generate_v4(),
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete restrict,
  mes_referencia date not null,
  valor numeric(12,2) not null check (valor > 0),
  descricao text,
  criado_em timestamptz not null default now()
);

create index on funcionario_comissoes (funcionario_id, mes_referencia desc);

------------------------------------------------------------------
-- Pró-labore mensal (valor definido no início, valor pago no fim)

create type pro_labore_status as enum ('previsto','pago','suspenso');

create table pro_labore (
  id uuid primary key default uuid_generate_v4(),
  socio_id uuid not null references socios(id) on delete restrict,
  obra_id uuid not null references obras(id) on delete restrict,
  mes_referencia date not null,
  valor_definido numeric(12,2) not null,
  valor_pago numeric(12,2),
  status pro_labore_status not null default 'previsto',
  data_pagamento date,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (socio_id, obra_id, mes_referencia)
);

create trigger trg_pro_labore_atualizado before update on pro_labore
  for each row execute function set_atualizado_em();
