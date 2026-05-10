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
