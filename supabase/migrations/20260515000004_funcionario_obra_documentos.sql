-- Fase D (parte 1): funcionário × obra histórico + documentos do funcionário
-- Não toca em folha/encargos ainda — isso vem na parte 2 (D.3) junto com compras.

------------------------------------------------------------------
-- Histórico de vínculo funcionário × obra
-- Cada linha representa um período em que o funcionário esteve em uma obra.
-- A linha "ativa" tem data_fim = null.

create type funcionario_obra_motivo as enum ('admissao','transferencia','demissao');

create table if not exists funcionario_obra_historico (
  id              uuid primary key default uuid_generate_v4(),
  funcionario_id  uuid not null references funcionarios(id) on delete cascade,
  obra_id         uuid not null references obras(id) on delete restrict,
  data_inicio     date not null,
  data_fim        date,
  motivo          funcionario_obra_motivo not null,
  observacao      text,
  criado_por      uuid references auth.users(id) on delete set null,
  criado_em       timestamptz not null default now(),
  -- não permite dois períodos abertos pro mesmo funcionário
  exclude using gist (
    funcionario_id with =,
    daterange(data_inicio, coalesce(data_fim, 'infinity'::date), '[]') with &&
  )
);

create index if not exists funcionario_obra_historico_funcionario_idx on funcionario_obra_historico (funcionario_id, data_inicio desc);
create index if not exists funcionario_obra_historico_obra_idx on funcionario_obra_historico (obra_id);

------------------------------------------------------------------
-- Snapshots de obra na tabela funcionarios (lock no momento certo)

alter table funcionarios
  add column if not exists obra_admissao_id uuid references obras(id) on delete restrict,
  add column if not exists obra_atual_id   uuid references obras(id) on delete restrict,
  add column if not exists obra_demissao_id uuid references obras(id) on delete restrict;

------------------------------------------------------------------
-- Helpers RPC

-- Transferir funcionário pra outra obra: encerra alocação ativa e abre nova.
-- Mesmo dia: a alocação aberta começou hoje → DELETE (não existiu na prática).
-- Dia anterior: data_fim = data_transferencia - 1.

create or replace function fn_transferir_funcionario(
  p_funcionario_id uuid,
  p_nova_obra_id uuid,
  p_data_transferencia date default current_date,
  p_observacao text default null
) returns uuid as $$
declare
  v_nova_id uuid;
  v_status text;
begin
  select status::text into v_status from funcionarios where id = p_funcionario_id;
  if v_status = 'desligado' then
    raise exception 'Funcionário está desligado — não pode ser transferido';
  end if;

  -- Same-day: drop a 0-duration row to avoid daterange constraint
  delete from funcionario_obra_historico
   where funcionario_id = p_funcionario_id
     and data_fim is null
     and data_inicio = p_data_transferencia;

  -- Normal: close the current open row
  update funcionario_obra_historico
     set data_fim = p_data_transferencia - interval '1 day'
   where funcionario_id = p_funcionario_id
     and data_fim is null
     and data_inicio < p_data_transferencia;

  insert into funcionario_obra_historico (funcionario_id, obra_id, data_inicio, motivo, observacao)
  values (p_funcionario_id, p_nova_obra_id, p_data_transferencia, 'transferencia', p_observacao)
  returning id into v_nova_id;

  update funcionarios set obra_atual_id = p_nova_obra_id where id = p_funcionario_id;

  return v_nova_id;
end;
$$ language plpgsql security definer;

-- Desligar funcionário: fecha o vínculo ativo, registra obra_demissao_id

create or replace function fn_desligar_funcionario(
  p_funcionario_id uuid,
  p_data_desligamento date default current_date,
  p_observacao text default null
) returns void as $$
declare
  v_obra_atual uuid;
begin
  select obra_atual_id into v_obra_atual from funcionarios where id = p_funcionario_id;
  if v_obra_atual is null then
    raise exception 'Funcionário sem obra atual — não é possível desligar pela regra de apropriação';
  end if;

  update funcionario_obra_historico
     set data_fim = p_data_desligamento, motivo = 'demissao', observacao = coalesce(p_observacao, observacao)
   where funcionario_id = p_funcionario_id
     and data_fim is null;

  update funcionarios
     set status = 'desligado',
         data_desligamento = p_data_desligamento,
         obra_demissao_id = v_obra_atual,
         obra_atual_id = null
   where id = p_funcionario_id;
end;
$$ language plpgsql security definer;

------------------------------------------------------------------
-- Documentos do funcionário (Supabase Storage + metadata)

create table if not exists funcionario_documentos (
  id              uuid primary key default uuid_generate_v4(),
  funcionario_id  uuid not null references funcionarios(id) on delete cascade,
  tipo            text not null,                 -- 'ASO_admissional','ASO_periodico','ASO_demissional','NR10','NR18','NR35','contrato_admissional','rescisao','exame_complementar','outro'
  descricao       text,
  storage_path    text not null,                 -- caminho no bucket 'funcionario-docs'
  validade        date,                          -- pra ASO/NR
  criado_por      uuid references auth.users(id) on delete set null,
  criado_em       timestamptz not null default now()
);

create index if not exists funcionario_documentos_funcionario_idx on funcionario_documentos (funcionario_id);
create index if not exists funcionario_documentos_validade_idx on funcionario_documentos (validade) where validade is not null;

-- Bucket de storage (privado)
insert into storage.buckets (id, name, public) values ('funcionario-docs', 'funcionario-docs', false)
on conflict (id) do nothing;

-- RLS: ler/escrever apenas autenticados
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Auth read funcionario-docs') then
    create policy "Auth read funcionario-docs" on storage.objects
      for select to authenticated using (bucket_id = 'funcionario-docs');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Auth write funcionario-docs') then
    create policy "Auth write funcionario-docs" on storage.objects
      for insert to authenticated with check (bucket_id = 'funcionario-docs');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Auth delete funcionario-docs') then
    create policy "Auth delete funcionario-docs" on storage.objects
      for delete to authenticated using (bucket_id = 'funcionario-docs');
  end if;
end $$;

------------------------------------------------------------------
-- Migration de dados: pra funcionários ativos sem obra_admissao_id, deixa null
-- (cliente pode preencher manualmente no /funcionarios/[id] depois). Isso garante
-- que o sistema entra em vigor pra novos funcionários sem perturbar os 72 atuais.
