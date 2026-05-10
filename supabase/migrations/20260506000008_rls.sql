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
