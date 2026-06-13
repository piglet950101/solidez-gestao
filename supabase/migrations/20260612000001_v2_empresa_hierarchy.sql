-- V2: empresa hierarchy (matriz SLD → empreiteiras → obras) + categorização de despesas
-- Suporta o novo fluxo: SLD (Lucro Real) recebe das construtoras, paga as empreiteiras,
-- compras de EPI/Material vão pro estoque sem rateio, compras administrativas têm rateio
-- proporcional automático, compras individuais caem direto na obra.

------------------------------------------------------------------
-- 1) Hierarquia de empresas: matriz → empreiteiras

alter table empresas add column if not exists tipo text;
update empresas set tipo = 'empreiteira' where tipo is null;
alter table empresas alter column tipo set default 'empreiteira';
alter table empresas alter column tipo set not null;
alter table empresas add constraint empresas_tipo_check
  check (tipo in ('matriz', 'empreiteira'));

alter table empresas add column if not exists matriz_id uuid
  references empresas(id) on delete restrict;

alter table empresas add column if not exists regime_tributario text
  check (regime_tributario in ('simples_nacional', 'lucro_presumido', 'lucro_real'));

-- CNPJ vira opcional pra matriz (SLD pode estar em processo de cadastro)
alter table empresas alter column cnpj drop not null;
drop index if exists empresas_cnpj_idx;
create unique index if not exists empresas_cnpj_unique on empresas (cnpj) where cnpj is not null;

create index if not exists empresas_matriz_idx on empresas (matriz_id);
create index if not exists empresas_tipo_idx on empresas (tipo);

comment on column empresas.tipo is 'matriz=hub financeiro (SLD), empreiteira=executa obras';
comment on column empresas.matriz_id is 'pra empreiteiras, aponta pra matriz que centraliza recebimento';
comment on column empresas.regime_tributario is 'simples_nacional|lucro_presumido|lucro_real';

------------------------------------------------------------------
-- 2) Categorização de despesas: individual / administrativa / estoque

alter table categorias add column if not exists tipo_despesa text;
update categorias set tipo_despesa = 'individual_obra' where tipo_despesa is null and tipo = 'despesa';
alter table categorias add constraint categorias_tipo_despesa_check
  check (tipo_despesa is null or tipo_despesa in ('individual_obra', 'administrativa', 'estoque'));

-- Marca categorias de estoque (EPI/Material): item vai pro estoque, custo é rateado na saída
update categorias set tipo_despesa = 'estoque'
  where tipo = 'despesa' and nome in ('EPI', 'Material');

-- Marca categorias administrativas (rateio proporcional automático)
update categorias set tipo_despesa = 'administrativa'
  where tipo = 'despesa' and (
    nome like 'Indireto%'
    or nome = 'Material de escritório'
    or nome = 'Custos Indiretos / Rateios'
  );

comment on column categorias.tipo_despesa is
  'individual_obra=cai direto numa obra; administrativa=rateio proporcional entre obras; estoque=vai pro estoque, custo rateado na saída';

------------------------------------------------------------------
-- 3) Compras: relaxa exigência de rateio quando categoria é estoque

-- Marca a compra com o tipo_despesa que ela usou (snapshot — categoria pode mudar depois)
alter table compras add column if not exists tipo_despesa text
  check (tipo_despesa is null or tipo_despesa in ('individual_obra', 'administrativa', 'estoque'));

comment on column compras.tipo_despesa is
  'cópia do categorias.tipo_despesa no momento da compra. estoque=sem alocações; individual_obra=1 alocação 100%; administrativa=rateio automático.';

------------------------------------------------------------------
-- 4) Insert SLD como matriz (se ainda não existe)

insert into empresas (nome, razao_social, cnpj, tipo, regime_tributario, ativo)
select 'SLD', 'SLD - Central Financeira (Lucro Real)', null, 'matriz', 'lucro_real', true
where not exists (select 1 from empresas where nome = 'SLD');

-- Aponta empreiteiras existentes pra matriz SLD
update empresas
   set matriz_id = (select id from empresas where nome = 'SLD'),
       regime_tributario = coalesce(regime_tributario, 'simples_nacional')
 where tipo = 'empreiteira' and matriz_id is null;

------------------------------------------------------------------
-- 5) Seed obra_socios com os percentuais do fluxograma
-- Só insere se a obra AINDA NÃO TEM nenhum sócio configurado (não sobrescreve)

do $$
declare
  m_id uuid; r_id uuid; b_id uuid;
  v_obra_id uuid;
begin
  select id into m_id from socios where nome ilike '%michael%' or nome ilike '%maiki%' limit 1;
  select id into r_id from socios where nome ilike '%reule%' limit 1;
  select id into b_id from socios where nome ilike '%bruno%' limit 1;

  if m_id is null then raise notice 'Sócio Michael não encontrado — pulando seed obra_socios'; return; end if;

  -- LIBERTY-PASQUALOTO: Michael 100
  select id into v_obra_id from obras where nome ilike 'liberty%' limit 1;
  if v_obra_id is not null and not exists (select 1 from obra_socios where obra_id = v_obra_id) then
    insert into obra_socios (obra_id, socio_id, percentual) values (v_obra_id, m_id, 100);
  end if;

  -- SELECT-AP: Michael 100
  select id into v_obra_id from obras where nome ilike 'select%' limit 1;
  if v_obra_id is not null and not exists (select 1 from obra_socios where obra_id = v_obra_id) then
    insert into obra_socios (obra_id, socio_id, percentual) values (v_obra_id, m_id, 100);
  end if;

  -- HOME-N1 (Home in Garden): Michael 50 / Reule 50
  select id into v_obra_id from obras where nome ilike 'home%' limit 1;
  if v_obra_id is not null and r_id is not null and not exists (select 1 from obra_socios where obra_id = v_obra_id) then
    insert into obra_socios (obra_id, socio_id, percentual) values (v_obra_id, m_id, 50), (v_obra_id, r_id, 50);
  end if;

  -- THE ONE-AGUIAR: Michael 100
  select id into v_obra_id from obras where nome ilike 'the one%' or nome ilike '%aguiar%' limit 1;
  if v_obra_id is not null and not exists (select 1 from obra_socios where obra_id = v_obra_id) then
    insert into obra_socios (obra_id, socio_id, percentual) values (v_obra_id, m_id, 100);
  end if;

  -- ENSEADA-SANTANA: Reule 50 / Michael 50
  select id into v_obra_id from obras where nome ilike 'enseada%' or nome ilike '%santana%' limit 1;
  if v_obra_id is not null and r_id is not null and not exists (select 1 from obra_socios where obra_id = v_obra_id) then
    insert into obra_socios (obra_id, socio_id, percentual) values (v_obra_id, m_id, 50), (v_obra_id, r_id, 50);
  end if;

  -- TWENTY-TRIAD: Bruno 50 / Michael 50
  select id into v_obra_id from obras where nome ilike '%triad%' or nome ilike '%twenty%' limit 1;
  if v_obra_id is not null and b_id is not null and not exists (select 1 from obra_socios where obra_id = v_obra_id) then
    insert into obra_socios (obra_id, socio_id, percentual) values (v_obra_id, m_id, 50), (v_obra_id, b_id, 50);
  end if;

  -- DREANS-N1 (Dreams): Michael 100
  select id into v_obra_id from obras where nome ilike 'dream%' or nome ilike 'drean%' limit 1;
  if v_obra_id is not null and not exists (select 1 from obra_socios where obra_id = v_obra_id) then
    insert into obra_socios (obra_id, socio_id, percentual) values (v_obra_id, m_id, 100);
  end if;

  -- DG: Bruno 50 / Michael 50
  select id into v_obra_id from obras where nome ilike 'dg%' or nome = 'DG' limit 1;
  if v_obra_id is not null and b_id is not null and not exists (select 1 from obra_socios where obra_id = v_obra_id) then
    insert into obra_socios (obra_id, socio_id, percentual) values (v_obra_id, m_id, 50), (v_obra_id, b_id, 50);
  end if;
end $$;
