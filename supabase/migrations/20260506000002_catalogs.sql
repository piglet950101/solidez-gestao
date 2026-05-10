-- Catálogos: categorias, fornecedores

create type categoria_tipo as enum ('despesa','receita','folha','imposto');

create table categorias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  tipo categoria_tipo not null default 'despesa',
  cor text,
  icone text,
  ativo boolean not null default true,
  ordem int not null default 100,
  criado_em timestamptz not null default now(),
  unique (nome, tipo)
);

create index on categorias (tipo) where ativo;

create table fornecedores (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  documento text,
  contato text,
  email text,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index fornecedores_doc_unique on fornecedores (documento) where documento is not null;
create index on fornecedores using gin (nome gin_trgm_ops);
create trigger trg_fornecedores_atualizado before update on fornecedores
  for each row execute function set_atualizado_em();
