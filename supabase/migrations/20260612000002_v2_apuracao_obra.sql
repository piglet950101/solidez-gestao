-- V2: apuração de obra (P&L lifetime cumulativo) + distribuição aos sócios
-- Inclui custo de estoque saído (saida_requisicao + saida_epi), que vw_despesa_obra
-- antiga não contava.

------------------------------------------------------------------
-- vw_apuracao_obra: P&L cumulativo lifetime por obra

create or replace view vw_apuracao_obra as
with
  receita_obra as (
    select obra_id, sum(valor_liquido) as receita_total
      from medicoes
     group by obra_id
  ),
  -- despesas individuais (compras com tipo_despesa='individual_obra' OR não classificada)
  desp_individual as (
    select ca.obra_id, sum(ca.valor_alocado) as valor
      from compra_alocacoes ca
      join compras c on c.id = ca.compra_id
     where coalesce(c.tipo_despesa, 'individual_obra') = 'individual_obra'
     group by ca.obra_id
  ),
  -- despesas administrativas rateadas
  desp_administrativa as (
    select ca.obra_id, sum(ca.valor_alocado) as valor
      from compra_alocacoes ca
      join compras c on c.id = ca.compra_id
     where c.tipo_despesa = 'administrativa'
     group by ca.obra_id
  ),
  -- custos de estoque consumidos por obra (saída de requisição ou EPI)
  desp_estoque as (
    select obra_id, sum(quantidade * coalesce(valor_unitario, 0)) as valor
      from itens_movimentacoes
     where obra_id is not null
       and tipo in ('saida_requisicao', 'saida_epi')
     group by obra_id
  ),
  -- custos fixos alocados (% mensal por obra) — aproximação anual = 12x mensal
  desp_custos_fixos as (
    select cfa.obra_id, sum(cf.valor_mensal * cfa.percentual / 100.0) as valor_mensal
      from custos_fixos_alocacoes cfa
      join custos_fixos cf on cf.id = cfa.custo_fixo_id
     where cf.ativo
     group by cfa.obra_id
  ),
  desp_folha as (
    select obra_id, sum(valor_liquido) as valor
      from lancamentos_folha
     group by obra_id
  ),
  desp_imposto as (
    select ia.obra_id, sum(ia.valor) as valor
      from imposto_alocacoes ia
     group by ia.obra_id
  ),
  desp_veiculo as (
    select va.obra_id, sum(vc.valor * va.percentual / 100.0) as valor
      from veiculo_custos vc
      join veiculo_alocacoes va
        on va.veiculo_id = vc.veiculo_id
       and vc.data between va.periodo_inicio and coalesce(va.periodo_fim, 'infinity'::date)
     group by va.obra_id
  )
select
  o.id as obra_id,
  o.nome as obra_nome,
  o.empresa_id as empreiteira_id,
  e.nome as empreiteira_nome,
  e.matriz_id,
  m.nome as matriz_nome,
  o.status,
  coalesce(r.receita_total, 0)::numeric(14,2) as receita_total,
  coalesce(di.valor, 0)::numeric(14,2) as despesa_individual,
  coalesce(da.valor, 0)::numeric(14,2) as despesa_administrativa,
  coalesce(de.valor, 0)::numeric(14,2) as despesa_estoque,
  coalesce(dcf.valor_mensal, 0)::numeric(14,2) as custos_fixos_mensal,
  coalesce(df.valor, 0)::numeric(14,2) as despesa_folha,
  coalesce(di2.valor, 0)::numeric(14,2) as impostos,
  coalesce(dv.valor, 0)::numeric(14,2) as despesa_veiculo,
  (
    coalesce(di.valor, 0) + coalesce(da.valor, 0) + coalesce(de.valor, 0)
    + coalesce(df.valor, 0) + coalesce(di2.valor, 0) + coalesce(dv.valor, 0)
  )::numeric(14,2) as despesa_total,
  (
    coalesce(r.receita_total, 0)
    - coalesce(di.valor, 0) - coalesce(da.valor, 0) - coalesce(de.valor, 0)
    - coalesce(df.valor, 0) - coalesce(di2.valor, 0) - coalesce(dv.valor, 0)
  )::numeric(14,2) as lucro_liquido
from obras o
join empresas e on e.id = o.empresa_id
left join empresas m on m.id = e.matriz_id
left join receita_obra r on r.obra_id = o.id
left join desp_individual di on di.obra_id = o.id
left join desp_administrativa da on da.obra_id = o.id
left join desp_estoque de on de.obra_id = o.id
left join desp_custos_fixos dcf on dcf.obra_id = o.id
left join desp_folha df on df.obra_id = o.id
left join desp_imposto di2 on di2.obra_id = o.id
left join desp_veiculo dv on dv.obra_id = o.id;

comment on view vw_apuracao_obra is
  'P&L cumulativo lifetime por obra. Inclui custo de estoque consumido (saída requisição/EPI).';

------------------------------------------------------------------
-- vw_lucro_socio: distribuição do lucro líquido por sócio (todas as obras)

create or replace view vw_lucro_socio as
select
  s.id as socio_id,
  s.nome as socio_nome,
  ap.obra_id,
  ap.obra_nome,
  ap.empreiteira_id,
  ap.empreiteira_nome,
  os.percentual,
  ap.lucro_liquido,
  (ap.lucro_liquido * os.percentual / 100.0)::numeric(14,2) as lucro_socio
from obra_socios os
join socios s on s.id = os.socio_id
join vw_apuracao_obra ap on ap.obra_id = os.obra_id;

comment on view vw_lucro_socio is
  'Lucro líquido distribuído por sócio, por obra. Soma dá o lucro total que cada sócio recebe.';

------------------------------------------------------------------
-- Função: sugere rateio administrativo proporcional ao número de obras ativas
-- (estratégia simples e estável; pode evoluir pra proporcional à receita)

create or replace function fn_sugerir_rateio_administrativo(p_empresa_id uuid)
returns table(obra_id uuid, percentual numeric)
language plpgsql as $$
declare
  v_obras_ids uuid[];
  v_count int;
  v_pct numeric;
begin
  -- Pega obras ativas da empresa OU de todas as empreiteiras se for matriz
  select array_agg(o.id)
    into v_obras_ids
    from obras o
   where o.status = 'ativa'
     and (
       o.empresa_id = p_empresa_id
       or o.empresa_id in (select id from empresas where matriz_id = p_empresa_id)
     );

  v_count := coalesce(array_length(v_obras_ids, 1), 0);
  if v_count = 0 then
    return;
  end if;
  v_pct := round(100.0 / v_count, 4);

  return query
  select v_obras_ids[i],
         case when i = v_count
              then round(100.0 - (v_pct * (v_count - 1)), 4)
              else v_pct
         end
    from generate_series(1, v_count) i;
end $$;

comment on function fn_sugerir_rateio_administrativo is
  'Retorna alocações de rateio administrativo proporcional (igual entre obras ativas da empresa/matriz).';
