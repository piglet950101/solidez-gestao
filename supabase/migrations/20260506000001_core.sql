-- Núcleo organizacional: empresas, obras, etapas, perfis, sócios

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "btree_gist";

create type obra_status as enum ('planejada','ativa','pausada','encerrada');
create type obra_tipo as enum ('regular','curto_prazo');

create table empresas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  razao_social text not null,
  cnpj text not null unique,
  nome_fantasia text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  municipio text,
  uf char(2),
  cep text,
  email text,
  telefone text,
  porte text,
  atividade_principal text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index on empresas (cnpj);

create table obras (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references empresas(id) on delete restrict,
  nome text not null,
  codigo text,
  status obra_status not null default 'ativa',
  tipo obra_tipo not null default 'regular',
  com_permuta boolean not null default false,
  data_inicio date,
  data_fim_prevista date,
  data_fim_real date,
  endereco text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, nome)
);

create index on obras (empresa_id, status);

create table etapas_obra (
  id uuid primary key default uuid_generate_v4(),
  obra_id uuid not null references obras(id) on delete cascade,
  nome text not null,
  ordem int not null,
  valor_orcado numeric(14,2),
  criado_em timestamptz not null default now(),
  unique (obra_id, ordem)
);

create table perfis_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  telefone_whatsapp text,
  cargo text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table socios (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  cpf text,
  contato text,
  email text,
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now()
);

create unique index socios_cpf_unique on socios (cpf) where cpf is not null;

create table obra_socios (
  obra_id uuid not null references obras(id) on delete cascade,
  socio_id uuid not null references socios(id) on delete restrict,
  percentual numeric(5,2) not null check (percentual >= 0 and percentual <= 100),
  primary key (obra_id, socio_id)
);

create or replace function check_obra_socios_total() returns trigger as $$
declare
  total numeric;
begin
  select coalesce(sum(percentual), 0) into total
  from obra_socios where obra_id = coalesce(new.obra_id, old.obra_id);
  if total > 100.01 then
    raise exception 'Soma de percentuais por obra (%) excede 100', total;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_obra_socios_check
  after insert or update or delete on obra_socios
  for each row execute function check_obra_socios_total();

create or replace function set_atualizado_em() returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_empresas_atualizado before update on empresas
  for each row execute function set_atualizado_em();

create trigger trg_obras_atualizado before update on obras
  for each row execute function set_atualizado_em();
