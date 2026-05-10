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
