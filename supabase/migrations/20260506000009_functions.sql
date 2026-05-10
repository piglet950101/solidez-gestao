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
