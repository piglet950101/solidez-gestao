-- V2 fix: SLD foi inserida pela migration de hierarquia, mas RLS empresas_select
-- exige user_empresas (Débora/Michael/etc. precisam ter row apontando pra SLD).
-- Sem isso, dropdown de empresa em /compras/nova oculta SLD.
-- Aqui: pra cada user que tem acesso a QUALQUER empreiteira, concede acesso à matriz.

insert into user_empresas (user_id, empresa_id)
select distinct ue.user_id, sld.id
  from user_empresas ue
  cross join empresas sld
 where sld.tipo = 'matriz'
on conflict do nothing;
