-- Veículos: frota mista CPF/CNPJ, alocação por obra, custos e alertas

create type veiculo_propriedade as enum ('proprio_cnpj','parceria_cpf');
create type veiculo_status as enum ('ativo','manutencao','inativo','vendido');
create type veiculo_custo_tipo as enum ('combustivel','manutencao','documentacao','financiamento','seguro','outros');

create table veiculos (
  id uuid primary key default uuid_generate_v4(),
  placa text not null unique,
  modelo text not null,
  marca text,
  ano int,
  cor text,
  tipo_propriedade veiculo_propriedade not null,
  proprietario_nome text,
  proprietario_documento text,
  empresa_id uuid references empresas(id) on delete set null,
  status veiculo_status not null default 'ativo',
  doc_vencimento date,
  ultima_troca_oleo_data date,
  ultima_troca_oleo_km int,
  km_atual int,
  intervalo_oleo_km int default 10000,
  financiamento_ativo boolean not null default false,
  financiamento_parcela numeric(12,2),
  financiamento_parcelas_restantes int,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index on veiculos (status);
create trigger trg_veiculos_atualizado before update on veiculos
  for each row execute function set_atualizado_em();

create table veiculo_alocacoes (
  id uuid primary key default uuid_generate_v4(),
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete restrict,
  percentual numeric(5,2) not null check (percentual > 0 and percentual <= 100),
  periodo_inicio date not null,
  periodo_fim date,
  observacoes text,
  criado_em timestamptz not null default now(),
  exclude using gist (
    veiculo_id with =,
    obra_id with =,
    daterange(periodo_inicio, coalesce(periodo_fim, 'infinity'::date), '[]') with &&
  )
);

create index on veiculo_alocacoes (veiculo_id);

create table veiculo_custos (
  id uuid primary key default uuid_generate_v4(),
  veiculo_id uuid not null references veiculos(id) on delete cascade,
  tipo veiculo_custo_tipo not null,
  data date not null,
  valor numeric(12,2) not null check (valor > 0),
  km int,
  fornecedor_id uuid references fornecedores(id) on delete set null,
  descricao text,
  foto_comprovante_url text,
  criado_em timestamptz not null default now()
);

create index on veiculo_custos (veiculo_id, data desc);
