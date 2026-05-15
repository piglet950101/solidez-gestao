-- Fase G do aditivo: modos de rateio para custos fixos
-- Adiciona modo_rateio em custos_fixos com 3 opções:
--   manual: o usuário define os percentuais por obra (comportamento atual)
--   igual_obras_ativas: divide igualmente entre obras com status='ativa' no mês de referência
--   proporcional_faturamento: divide proporcionalmente ao valor_liquido das medições do mês

create type custo_fixo_modo as enum ('manual','igual_obras_ativas','proporcional_faturamento');

alter table custos_fixos
  add column if not exists modo_rateio custo_fixo_modo not null default 'manual';

------------------------------------------------------------------
-- Helper: alocações efetivas de um custo fixo em um mês de referência
-- Retorna { obra_id, percentual, valor } conforme o modo:
--   manual -> lê custos_fixos_alocacoes
--   igual_obras_ativas -> divide entre obras ativas naquele mês
--   proporcional_faturamento -> divide por valor_liquido de medições do mês

create or replace function fn_custo_fixo_alocacoes_efetivas(
  p_custo_fixo_id uuid,
  p_mes_referencia date default date_trunc('month', current_date)::date
) returns table (obra_id uuid, percentual numeric, valor numeric) as $$
declare
  v_modo custo_fixo_modo;
  v_empresa_id uuid;
  v_valor_mensal numeric;
  v_total_medicoes numeric;
  v_count_obras int;
begin
  select cf.modo_rateio, cf.empresa_id, cf.valor_mensal
    into v_modo, v_empresa_id, v_valor_mensal
    from custos_fixos cf where cf.id = p_custo_fixo_id;

  if v_modo = 'manual' then
    return query
      select cfa.obra_id, cfa.percentual, round(v_valor_mensal * cfa.percentual / 100, 2)
        from custos_fixos_alocacoes cfa
       where cfa.custo_fixo_id = p_custo_fixo_id;

  elsif v_modo = 'igual_obras_ativas' then
    select count(*) into v_count_obras
      from obras o
     where o.empresa_id = v_empresa_id
       and o.status = 'ativa';
    if v_count_obras = 0 then return; end if;
    return query
      select o.id, round(100::numeric / v_count_obras, 4), round(v_valor_mensal / v_count_obras, 2)
        from obras o
       where o.empresa_id = v_empresa_id
         and o.status = 'ativa';

  elsif v_modo = 'proporcional_faturamento' then
    -- Soma valor_liquido das medições do mês para esta empresa
    select coalesce(sum(m.valor_liquido), 0) into v_total_medicoes
      from medicoes m
      join obras o on o.id = m.obra_id
     where o.empresa_id = v_empresa_id
       and date_trunc('month', m.data_emissao) = date_trunc('month', p_mes_referencia);
    if v_total_medicoes = 0 then
      -- Sem medições no mês: cai pra rateio igual entre obras ativas
      select count(*) into v_count_obras
        from obras o where o.empresa_id = v_empresa_id and o.status = 'ativa';
      if v_count_obras = 0 then return; end if;
      return query
        select o.id, round(100::numeric / v_count_obras, 4), round(v_valor_mensal / v_count_obras, 2)
          from obras o
         where o.empresa_id = v_empresa_id and o.status = 'ativa';
    else
      return query
        select o.id,
               round(sum(m.valor_liquido) * 100 / v_total_medicoes, 4),
               round(v_valor_mensal * sum(m.valor_liquido) / v_total_medicoes, 2)
          from medicoes m
          join obras o on o.id = m.obra_id
         where o.empresa_id = v_empresa_id
           and date_trunc('month', m.data_emissao) = date_trunc('month', p_mes_referencia)
         group by o.id;
    end if;
  end if;
end;
$$ language plpgsql stable;
