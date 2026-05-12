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
-- Alertas + envios WhatsApp (semáforo verde / amarelo / vermelho)

create type alerta_severidade as enum ('verde','amarelo','vermelho');
create type alerta_tipo as enum (
  'conta_a_vencer',
  'conta_vencida',
  'doc_veiculo',
  'troca_oleo',
  'fim_experiencia',
  'imposto_pendente',
  'lucro_em_risco',
  'medicao_atrasada'
);
create type whatsapp_envio_status as enum ('pendente','enviado','entregue','lido','falhou');

create table alertas (
  id uuid primary key default uuid_generate_v4(),
  tipo alerta_tipo not null,
  severidade alerta_severidade not null,
  empresa_id uuid references empresas(id) on delete cascade,
  obra_id uuid references obras(id) on delete cascade,
  entidade_tabela text not null,
  entidade_id uuid not null,
  mensagem text not null,
  contexto jsonb,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  unique (tipo, entidade_tabela, entidade_id, severidade) deferrable
);

create index on alertas (empresa_id, severidade) where resolvido_em is null;
create index on alertas (criado_em desc);

create table whatsapp_envios (
  id uuid primary key default uuid_generate_v4(),
  alerta_id uuid references alertas(id) on delete set null,
  destinatario_user_id uuid references auth.users(id) on delete set null,
  telefone_destino text not null,
  template_name text,
  template_vars jsonb,
  status whatsapp_envio_status not null default 'pendente',
  message_id_meta text,
  resposta_meta jsonb,
  enviado_em timestamptz,
  erro text,
  criado_em timestamptz not null default now()
);

create index on whatsapp_envios (status, criado_em);
-- Views agregadoras: margem por obra, lucro distribuível, KPIs do dashboard

------------------------------------------------------------------
-- Receita reconhecida por obra (medições, todas as formas)

create or replace view vw_receita_obra as
select
  m.obra_id,
  m.id as medicao_id,
  m.mes_referencia,
  m.valor_liquido as valor_medicao,
  coalesce(sum(r.valor) filter (where r.tipo = 'dinheiro'), 0) as recebido_dinheiro,
  coalesce(sum(r.valor) filter (where r.tipo = 'permuta'), 0) as recebido_permuta,
  coalesce(sum(a.valor) filter (where a.abatido_em_medicao_id = m.id), 0) as antecipacao_abatida
from (
  select id, obra_id, valor_liquido, date_trunc('month', data_emissao)::date as mes_referencia
  from medicoes
) m
left join recebimentos r on r.medicao_id = m.id
left join antecipacoes a on a.abatido_em_medicao_id = m.id
group by m.obra_id, m.id, m.mes_referencia, m.valor_liquido;

------------------------------------------------------------------
-- Despesa rateada por obra (compras + custos fixos + folha + veículo + imposto)

create or replace view vw_despesa_obra as
with compras_obra as (
  select ca.obra_id,
         date_trunc('month', c.data_compra)::date as mes,
         sum(ca.valor_alocado) as valor
    from compra_alocacoes ca
    join compras c on c.id = ca.compra_id
   group by ca.obra_id, date_trunc('month', c.data_compra)
), custos_obra as (
  select cfa.obra_id,
         date_trunc('month', current_date)::date as mes,
         sum(cf.valor_mensal * cfa.percentual / 100.0) as valor
    from custos_fixos_alocacoes cfa
    join custos_fixos cf on cf.id = cfa.custo_fixo_id
   where cf.ativo
   group by cfa.obra_id
), folha_obra as (
  select obra_id,
         mes_referencia as mes,
         sum(valor_liquido) as valor
    from lancamentos_folha
   group by obra_id, mes_referencia
), imposto_obra as (
  select ia.obra_id,
         i.mes_referencia as mes,
         sum(ia.valor) as valor
    from imposto_alocacoes ia
    join impostos i on i.id = ia.imposto_id
   group by ia.obra_id, i.mes_referencia
), veiculo_obra as (
  select va.obra_id,
         date_trunc('month', vc.data)::date as mes,
         sum(vc.valor * va.percentual / 100.0) as valor
    from veiculo_custos vc
    join veiculo_alocacoes va on va.veiculo_id = vc.veiculo_id
                              and vc.data between va.periodo_inicio and coalesce(va.periodo_fim, 'infinity'::date)
   group by va.obra_id, date_trunc('month', vc.data)
)
select obra_id, mes,
       sum(case when origem = 'compra' then valor else 0 end) as compras,
       sum(case when origem = 'custo_fixo' then valor else 0 end) as custos_fixos,
       sum(case when origem = 'folha' then valor else 0 end) as folha,
       sum(case when origem = 'imposto' then valor else 0 end) as imposto,
       sum(case when origem = 'veiculo' then valor else 0 end) as veiculo,
       sum(valor) as despesa_total
  from (
    select obra_id, mes, valor, 'compra'::text as origem from compras_obra
    union all select obra_id, mes, valor, 'custo_fixo' from custos_obra
    union all select obra_id, mes, valor, 'folha' from folha_obra
    union all select obra_id, mes, valor, 'imposto' from imposto_obra
    union all select obra_id, mes, valor, 'veiculo' from veiculo_obra
  ) t
 group by obra_id, mes;

------------------------------------------------------------------
-- Margem por obra (substitui orçado vs realizado — cliente é prestador de serviço)

create or replace view vw_margem_obra as
with receita_mensal as (
  select obra_id, mes_referencia as mes, sum(valor_medicao) as receita_total,
         sum(recebido_dinheiro + antecipacao_abatida) as receita_caixa
    from vw_receita_obra
   group by obra_id, mes_referencia
)
select o.id as obra_id,
       o.empresa_id,
       o.nome,
       coalesce(r.mes, d.mes) as mes,
       coalesce(r.receita_total, 0) as receita_total,
       coalesce(r.receita_caixa, 0) as receita_caixa,
       coalesce(d.despesa_total, 0) as despesa_total,
       coalesce(r.receita_total, 0) - coalesce(d.despesa_total, 0) as margem,
       coalesce(r.receita_caixa, 0) - coalesce(d.despesa_total, 0) as caixa_liquido
  from obras o
  left join receita_mensal r on r.obra_id = o.id
  left join vw_despesa_obra d on d.obra_id = o.id and d.mes = r.mes
 where coalesce(r.mes, d.mes) is not null;

------------------------------------------------------------------
-- Lucro distribuível por obra
-- Fórmula:
--   receita em dinheiro recebida
--   − despesas pagas
--   − despesas com vencimento futuro vinculadas à obra
--   − imposto rateado e provisão estimada
--   − pró-labore previsto até o fim da obra

create or replace function fn_lucro_distribuivel(p_obra_id uuid)
returns table (
  receita_caixa numeric,
  despesas_pagas numeric,
  despesas_pendentes numeric,
  imposto_rateado numeric,
  imposto_estimado numeric,
  pro_labore_previsto numeric,
  lucro_distribuivel numeric,
  comprometido numeric,
  alerta boolean
) as $$
declare
  v_receita numeric;
  v_pagas numeric;
  v_pendentes numeric;
  v_imp_rat numeric;
  v_imp_est numeric;
  v_pro_lab numeric;
  v_lucro numeric;
  v_comp numeric;
begin
  -- Receita em dinheiro = recebimentos do tipo dinheiro + antecipações (cada uma somada uma vez)
  select coalesce((
           select sum(r.valor)
             from recebimentos r
             join medicoes m on m.id = r.medicao_id
            where m.obra_id = p_obra_id and r.tipo = 'dinheiro'
         ), 0)
       + coalesce((
           select sum(valor) from antecipacoes where obra_id = p_obra_id
         ), 0)
    into v_receita;

  -- Proporcional ao rateio: cada parcela contribui apenas com a fatia atribuída à obra
  select coalesce(sum(p.valor * ca.valor_alocado / nullif(c.valor_total, 0)), 0)
    into v_pagas
    from parcelas p
    join compras c on c.id = p.compra_id
    join compra_alocacoes ca on ca.compra_id = c.id and ca.obra_id = p_obra_id
   where p.status = 'pago';

  select coalesce(sum(p.valor * ca.valor_alocado / nullif(c.valor_total, 0)), 0)
    into v_pendentes
    from parcelas p
    join compras c on c.id = p.compra_id
    join compra_alocacoes ca on ca.compra_id = c.id and ca.obra_id = p_obra_id
   where p.status in ('pendente','atrasado');

  select coalesce(sum(ia.valor),0)
    into v_imp_rat
    from imposto_alocacoes ia
    join impostos i on i.id = ia.imposto_id
   where ia.obra_id = p_obra_id and i.status in ('rateado','pago');

  -- Provisão estimada = soma das medições * alíquota média
  select coalesce(sum(m.valor_liquido * coalesce(m.percentual_imposto_estimado,0) / 100.0), 0)
    into v_imp_est
    from medicoes m
   where m.obra_id = p_obra_id
     and not exists (
       select 1 from imposto_alocacoes ia2
        join impostos i2 on i2.id = ia2.imposto_id
        where ia2.obra_id = m.obra_id
          and date_trunc('month', i2.mes_referencia) = date_trunc('month', m.data_emissao)
     );

  select coalesce(sum(valor_definido),0)
    into v_pro_lab
    from pro_labore
   where obra_id = p_obra_id
     and status in ('previsto','suspenso')
     and mes_referencia >= date_trunc('month', current_date);

  v_comp := v_pendentes + v_imp_est + v_pro_lab;
  v_lucro := v_receita - v_pagas - v_comp - v_imp_rat;

  return query select v_receita, v_pagas, v_pendentes, v_imp_rat, v_imp_est, v_pro_lab,
                      greatest(v_lucro, 0)::numeric, v_comp::numeric,
                      (v_lucro < 0 or v_comp > v_receita * 0.5);
end;
$$ language plpgsql stable;

------------------------------------------------------------------
-- Curva de desembolso 13 semanas

create or replace view vw_desembolso_13s as
with semanas as (
  select generate_series(
    date_trunc('week', current_date),
    date_trunc('week', current_date) + interval '12 weeks',
    interval '1 week'
  )::date as semana_inicio
), parcelas_pendentes as (
  select date_trunc('week', p.data_vencimento)::date as semana,
         ca.obra_id,
         sum(p.valor * ca.valor_alocado / nullif(c.valor_total, 0)) as valor
    from parcelas p
    join compras c on c.id = p.compra_id
    join compra_alocacoes ca on ca.compra_id = c.id
   where p.status in ('pendente','atrasado')
     and p.data_vencimento between current_date - interval '7 days' and current_date + interval '13 weeks'
   group by date_trunc('week', p.data_vencimento), ca.obra_id
)
select s.semana_inicio,
       o.id as obra_id,
       o.nome as obra,
       o.empresa_id,
       coalesce(p.valor, 0) as valor
  from semanas s
  cross join obras o
  left join parcelas_pendentes p on p.semana = s.semana_inicio and p.obra_id = o.id;

------------------------------------------------------------------
-- KPIs consolidados

create or replace view vw_dashboard_kpis as
select
  e.id as empresa_id,
  e.nome as empresa,
  (select coalesce(sum(p.valor),0)
     from parcelas p
     join compras c on c.id = p.compra_id
    where c.empresa_id = e.id and p.status in ('pendente','atrasado')) as total_a_pagar,
  (select coalesce(sum(m.valor_liquido - coalesce(rec.recebido,0)),0)
     from medicoes m
     join obras o on o.id = m.obra_id
     left join lateral (
       select sum(valor) as recebido from recebimentos where medicao_id = m.id
     ) rec on true
    where o.empresa_id = e.id) as total_a_receber,
  (select count(*) from alertas a
    where a.empresa_id = e.id and a.resolvido_em is null) as alertas_ativos,
  (select count(*) from alertas a
    where a.empresa_id = e.id and a.resolvido_em is null and a.severidade = 'vermelho') as alertas_criticos
from empresas e
where e.ativo;
-- Row-Level Security: isolamento multi-empresa via perfis_usuario
-- Os 3 usuários (Michael, Bruno, Débora) têm acesso a TODAS as empresas pelo papel 'admin'.
-- Granularidade futura (mestre, comprador) entra como aditivo posterior.

create table user_empresas (
  user_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  papel text not null default 'admin',
  primary key (user_id, empresa_id)
);

create or replace function has_empresa_access(p_empresa_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from user_empresas where user_id = auth.uid() and empresa_id = p_empresa_id
  );
$$;

alter table empresas enable row level security;
alter table obras enable row level security;
alter table etapas_obra enable row level security;
alter table perfis_usuario enable row level security;
alter table socios enable row level security;
alter table obra_socios enable row level security;
alter table categorias enable row level security;
alter table fornecedores enable row level security;
alter table compras enable row level security;
alter table compra_alocacoes enable row level security;
alter table parcelas enable row level security;
alter table custos_fixos enable row level security;
alter table custos_fixos_alocacoes enable row level security;
alter table medicoes enable row level security;
alter table recebimentos enable row level security;
alter table antecipacoes enable row level security;
alter table impostos enable row level security;
alter table imposto_alocacoes enable row level security;
alter table funcionarios enable row level security;
alter table lancamentos_folha enable row level security;
alter table vales enable row level security;
alter table empreitadas enable row level security;
alter table empreitada_pagamentos enable row level security;
alter table funcionario_comissoes enable row level security;
alter table pro_labore enable row level security;
alter table veiculos enable row level security;
alter table veiculo_alocacoes enable row level security;
alter table veiculo_custos enable row level security;
alter table alertas enable row level security;
alter table whatsapp_envios enable row level security;
alter table user_empresas enable row level security;

-- Empresas e tabelas com empresa_id direto
create policy empresas_select on empresas for select using (has_empresa_access(id));
create policy obras_all on obras for all using (has_empresa_access(empresa_id)) with check (has_empresa_access(empresa_id));
create policy compras_all on compras for all using (has_empresa_access(empresa_id)) with check (has_empresa_access(empresa_id));
create policy custos_fixos_all on custos_fixos for all using (has_empresa_access(empresa_id)) with check (has_empresa_access(empresa_id));
create policy impostos_all on impostos for all using (has_empresa_access(empresa_id)) with check (has_empresa_access(empresa_id));
create policy lancamentos_folha_all on lancamentos_folha for all using (has_empresa_access(empresa_id)) with check (has_empresa_access(empresa_id));

-- Tabelas com empresa_id via FK (subquery)
create policy etapas_obra_all on etapas_obra for all using (
  exists (select 1 from obras o where o.id = etapas_obra.obra_id and has_empresa_access(o.empresa_id))
);
create policy obra_socios_all on obra_socios for all using (
  exists (select 1 from obras o where o.id = obra_socios.obra_id and has_empresa_access(o.empresa_id))
);
create policy compra_alocacoes_all on compra_alocacoes for all using (
  exists (select 1 from compras c where c.id = compra_alocacoes.compra_id and has_empresa_access(c.empresa_id))
);
create policy parcelas_all on parcelas for all using (
  exists (select 1 from compras c where c.id = parcelas.compra_id and has_empresa_access(c.empresa_id))
);
create policy custos_fixos_alocacoes_all on custos_fixos_alocacoes for all using (
  exists (select 1 from custos_fixos cf where cf.id = custos_fixos_alocacoes.custo_fixo_id and has_empresa_access(cf.empresa_id))
);
create policy medicoes_all on medicoes for all using (
  exists (select 1 from obras o where o.id = medicoes.obra_id and has_empresa_access(o.empresa_id))
);
create policy recebimentos_all on recebimentos for all using (
  exists (select 1 from medicoes m join obras o on o.id = m.obra_id
          where m.id = recebimentos.medicao_id and has_empresa_access(o.empresa_id))
);
create policy antecipacoes_all on antecipacoes for all using (
  exists (select 1 from obras o where o.id = antecipacoes.obra_id and has_empresa_access(o.empresa_id))
);
create policy imposto_alocacoes_all on imposto_alocacoes for all using (
  exists (select 1 from impostos i where i.id = imposto_alocacoes.imposto_id and has_empresa_access(i.empresa_id))
);
create policy vales_all on vales for all using (
  exists (select 1 from funcionarios f where f.id = vales.funcionario_id)
);
create policy empreitadas_all on empreitadas for all using (
  exists (select 1 from obras o where o.id = empreitadas.obra_id and has_empresa_access(o.empresa_id))
);
create policy empreitada_pagamentos_all on empreitada_pagamentos for all using (
  exists (select 1 from empreitadas e join obras o on o.id = e.obra_id
          where e.id = empreitada_pagamentos.empreitada_id and has_empresa_access(o.empresa_id))
);
create policy funcionario_comissoes_all on funcionario_comissoes for all using (
  exists (select 1 from obras o where o.id = funcionario_comissoes.obra_id and has_empresa_access(o.empresa_id))
);
create policy pro_labore_all on pro_labore for all using (
  exists (select 1 from obras o where o.id = pro_labore.obra_id and has_empresa_access(o.empresa_id))
);
create policy veiculos_select on veiculos for all using (
  empresa_id is null or has_empresa_access(empresa_id)
);
create policy veiculo_alocacoes_all on veiculo_alocacoes for all using (
  exists (select 1 from obras o where o.id = veiculo_alocacoes.obra_id and has_empresa_access(o.empresa_id))
);
create policy veiculo_custos_all on veiculo_custos for all using (
  exists (select 1 from veiculos v where v.id = veiculo_custos.veiculo_id and (v.empresa_id is null or has_empresa_access(v.empresa_id)))
);
create policy alertas_all on alertas for all using (
  empresa_id is null or has_empresa_access(empresa_id)
);

-- Tabelas globais (catálogos compartilhados entre empresas)
create policy categorias_select on categorias for select using (true);
create policy categorias_modify on categorias for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy fornecedores_select on fornecedores for select using (true);
create policy fornecedores_modify on fornecedores for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy socios_select on socios for select using (auth.role() = 'authenticated');
create policy socios_modify on socios for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy funcionarios_select on funcionarios for select using (auth.role() = 'authenticated');
create policy funcionarios_modify on funcionarios for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy perfis_usuario_select on perfis_usuario for select using (auth.role() = 'authenticated');
create policy perfis_usuario_self on perfis_usuario for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy whatsapp_envios_select on whatsapp_envios for select using (auth.role() = 'authenticated');

create policy user_empresas_select on user_empresas for select using (user_id = auth.uid());
-- RPCs de fluxo composto (compra com rateio + parcelas, antecipação conciliação, fechamento de folha)

-- Cria uma compra com suas alocações e parcelas em uma única transação.
create or replace function fn_criar_compra(
  p_empresa_id uuid,
  p_fornecedor_id uuid,
  p_categoria_id uuid,
  p_descricao text,
  p_valor_total numeric,
  p_data_compra date,
  p_rateio_modo rateio_modo,
  p_quem_pagou quem_pagou_tipo,
  p_pago_por_socio_id uuid,
  p_pago_por_funcionario_id uuid,
  p_formato_pagamento text,
  p_foto_nota_url text,
  p_alocacoes jsonb,
  p_parcelas jsonb
) returns uuid as $$
declare
  v_compra_id uuid;
  v_alocacao jsonb;
  v_parcela jsonb;
  v_idx int := 1;
begin
  if jsonb_array_length(p_alocacoes) = 0 then
    raise exception 'Compra precisa de pelo menos uma alocação';
  end if;
  if jsonb_array_length(p_parcelas) = 0 then
    raise exception 'Compra precisa de pelo menos uma parcela';
  end if;

  insert into compras (
    empresa_id, fornecedor_id, categoria_id, descricao, valor_total, data_compra,
    num_parcelas, rateio_modo, quem_pagou, pago_por_socio_id, pago_por_funcionario_id,
    formato_pagamento, foto_nota_url, criado_por
  ) values (
    p_empresa_id, p_fornecedor_id, p_categoria_id, p_descricao, p_valor_total, p_data_compra,
    jsonb_array_length(p_parcelas), p_rateio_modo, p_quem_pagou, p_pago_por_socio_id, p_pago_por_funcionario_id,
    p_formato_pagamento, p_foto_nota_url, auth.uid()
  ) returning id into v_compra_id;

  for v_alocacao in select * from jsonb_array_elements(p_alocacoes) loop
    insert into compra_alocacoes (compra_id, obra_id, valor_alocado, qtd_alocada, percentual_alocado)
    values (
      v_compra_id,
      (v_alocacao->>'obra_id')::uuid,
      (v_alocacao->>'valor_alocado')::numeric,
      (v_alocacao->>'qtd_alocada')::numeric,
      (v_alocacao->>'percentual_alocado')::numeric
    );
  end loop;

  for v_parcela in select * from jsonb_array_elements(p_parcelas) loop
    insert into parcelas (compra_id, num_parcela, data_vencimento, valor)
    values (
      v_compra_id,
      v_idx,
      (v_parcela->>'data_vencimento')::date,
      (v_parcela->>'valor')::numeric
    );
    v_idx := v_idx + 1;
  end loop;

  -- Se sócio pagou do bolso, gera reembolso pendente
  if p_quem_pagou = 'socio' then
    insert into pro_labore (socio_id, obra_id, mes_referencia, valor_definido, status, observacoes)
    select p_pago_por_socio_id, ca.obra_id, date_trunc('month', p_data_compra)::date,
           ca.valor_alocado, 'previsto'::pro_labore_status,
           'Reembolso compra ' || left(p_descricao, 40)
      from compra_alocacoes ca where ca.compra_id = v_compra_id
    on conflict (socio_id, obra_id, mes_referencia) do update
      set valor_definido = pro_labore.valor_definido + excluded.valor_definido;
  end if;

  return v_compra_id;
end;
$$ language plpgsql security definer;

------------------------------------------------------------------
-- Conciliação de antecipação na medição

create or replace function fn_conciliar_antecipacao(
  p_antecipacao_id uuid,
  p_medicao_id uuid
) returns void as $$
declare
  v_obra_antec uuid;
  v_obra_med uuid;
begin
  select obra_id into v_obra_antec from antecipacoes where id = p_antecipacao_id;
  select obra_id into v_obra_med from medicoes where id = p_medicao_id;
  if v_obra_antec is null or v_obra_med is null or v_obra_antec <> v_obra_med then
    raise exception 'Antecipação e medição precisam ser da mesma obra';
  end if;
  update antecipacoes set abatido_em_medicao_id = p_medicao_id where id = p_antecipacao_id;
end;
$$ language plpgsql security definer;

------------------------------------------------------------------
-- Fechamento de folha mensal: aplica vales e comissões abertas

create or replace function fn_fechar_folha(
  p_funcionario_id uuid,
  p_obra_id uuid,
  p_mes_referencia date
) returns uuid as $$
declare
  v_folha_id uuid;
  v_vales numeric;
  v_comissao numeric;
begin
  select id into v_folha_id from lancamentos_folha
   where funcionario_id = p_funcionario_id
     and obra_id = p_obra_id
     and mes_referencia = p_mes_referencia;

  if v_folha_id is null then
    raise exception 'Lançamento de folha não encontrado';
  end if;

  -- Soma vales pendentes
  select coalesce(sum(valor),0) into v_vales
    from vales
   where funcionario_id = p_funcionario_id
     and descontado_em_folha_id is null
     and data <= (p_mes_referencia + interval '1 month' - interval '1 day');

  -- Soma comissões do mês
  select coalesce(sum(valor),0) into v_comissao
    from funcionario_comissoes
   where funcionario_id = p_funcionario_id
     and obra_id = p_obra_id
     and date_trunc('month', mes_referencia) = date_trunc('month', p_mes_referencia);

  update lancamentos_folha
     set valor_vales = v_vales,
         valor_comissao = v_comissao,
         valor_liquido = valor_horas + valor_salario_fixo + v_comissao + valor_extras
                       - v_vales - valor_outros_descontos,
         status = 'fechada'
   where id = v_folha_id;

  update vales set descontado_em_folha_id = v_folha_id
   where funcionario_id = p_funcionario_id
     and descontado_em_folha_id is null
     and data <= (p_mes_referencia + interval '1 month' - interval '1 day');

  return v_folha_id;
end;
$$ language plpgsql security definer;

------------------------------------------------------------------
-- Geração diária de alertas (chamada por pg_cron 07:00 BRT)

create or replace function fn_gerar_alertas_diarios()
returns int as $$
declare
  v_count int := 0;
begin
  delete from alertas where resolvido_em is not null and criado_em < now() - interval '90 days';

  -- Contas a vencer (próximos 7 dias) e vencidas
  insert into alertas (tipo, severidade, empresa_id, entidade_tabela, entidade_id, mensagem, contexto)
  select
    case when p.data_vencimento < current_date then 'conta_vencida'::alerta_tipo
         else 'conta_a_vencer'::alerta_tipo end,
    case when p.data_vencimento < current_date then 'vermelho'::alerta_severidade
         when p.data_vencimento <= current_date + 2 then 'amarelo'::alerta_severidade
         else 'verde'::alerta_severidade end,
    c.empresa_id,
    'parcelas',
    p.id,
    case when p.data_vencimento < current_date then
      'Boleto vencido: R$ ' || to_char(p.valor,'FM999G999G999D00') || ' · ' || c.descricao
    else
      'Vence em ' || (p.data_vencimento - current_date) || ' dia(s): R$ ' || to_char(p.valor,'FM999G999G999D00') || ' · ' || c.descricao
    end,
    jsonb_build_object('valor', p.valor, 'data_vencimento', p.data_vencimento, 'compra', c.descricao)
  from parcelas p
  join compras c on c.id = p.compra_id
  where p.status in ('pendente','atrasado')
    and p.data_vencimento <= current_date + 7
  on conflict do nothing;

  get diagnostics v_count = row_count;

  -- Documento veículo
  insert into alertas (tipo, severidade, empresa_id, entidade_tabela, entidade_id, mensagem)
  select 'doc_veiculo',
         case when v.doc_vencimento < current_date then 'vermelho'
              when v.doc_vencimento <= current_date + 30 then 'amarelo'
              else 'verde' end,
         v.empresa_id, 'veiculos', v.id,
         'Documento do veículo ' || v.placa || ' · ' || v.modelo || ' vence ' || to_char(v.doc_vencimento, 'DD/MM/YYYY')
  from veiculos v
  where v.doc_vencimento is not null and v.doc_vencimento <= current_date + 30 and v.status = 'ativo'
  on conflict do nothing;

  -- Fim de período de experiência (45/90 dias)
  insert into alertas (tipo, severidade, empresa_id, entidade_tabela, entidade_id, mensagem)
  select 'fim_experiencia',
         case when (current_date - f.data_admissao) between 38 and 45 then 'amarelo'
              when (current_date - f.data_admissao) between 83 and 90 then 'vermelho'
              else 'verde' end,
         null, 'funcionarios', f.id,
         'Funcionário ' || f.nome || ' completa ' ||
         case when (current_date - f.data_admissao) <= 45 then '45' else '90' end ||
         ' dias em ' || to_char(f.data_admissao + case when (current_date - f.data_admissao) <= 45 then 45 else 90 end, 'DD/MM/YYYY')
  from funcionarios f
  where f.status in ('ativo','experiencia')
    and f.data_admissao is not null
    and (current_date - f.data_admissao) between 38 and 90
  on conflict do nothing;

  -- Imposto pendente de rateio
  insert into alertas (tipo, severidade, empresa_id, entidade_tabela, entidade_id, mensagem)
  select 'imposto_pendente', 'amarelo', i.empresa_id, 'impostos', i.id,
         'Imposto ' || to_char(i.mes_referencia, 'MM/YYYY') ||
         ' · R$ ' || to_char(i.valor_total,'FM999G999G999D00') || ' aguardando rateio do contador'
  from impostos i
  where i.status = 'pendente_rateio'
    and (i.criado_em < now() - interval '5 days')
  on conflict do nothing;

  return v_count;
end;
$$ language plpgsql security definer;
-- Buckets para fotos de notas fiscais e documentos

insert into storage.buckets (id, name, public) values ('notas', 'notas', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('docs-veiculos', 'docs-veiculos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

create policy "Authenticated read storage" on storage.objects
  for select to authenticated using (bucket_id in ('notas','docs-veiculos','comprovantes'));

create policy "Authenticated write storage" on storage.objects
  for insert to authenticated with check (bucket_id in ('notas','docs-veiculos','comprovantes'));
