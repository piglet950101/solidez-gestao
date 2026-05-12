-- Período de experiência configurável por funcionário
-- Padrão CLT brasileira: 90 dias total, com split editável (45+45, 30+60, etc.)

alter table funcionarios
  add column if not exists experiencia_dias_1 int default 45,
  add column if not exists experiencia_dias_2 int default 90;

-- Reescreve o gerador de alertas pra usar os dias custom de cada funcionário
create or replace function fn_gerar_alertas_diarios()
returns int as $$
declare
  v_count int := 0;
begin
  delete from alertas where resolvido_em is not null and criado_em < now() - interval '90 days';

  -- Contas a vencer / vencidas (mesmo de antes)
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

  -- Fim de período de experiência (custom por funcionário: dias_1 e dias_2)
  insert into alertas (tipo, severidade, empresa_id, entidade_tabela, entidade_id, mensagem)
  select 'fim_experiencia',
         case
           when (current_date - f.data_admissao) between (coalesce(f.experiencia_dias_2, 90) - 7) and coalesce(f.experiencia_dias_2, 90)
             then 'vermelho'::alerta_severidade
           when (current_date - f.data_admissao) between (coalesce(f.experiencia_dias_1, 45) - 7) and coalesce(f.experiencia_dias_1, 45)
             then 'amarelo'::alerta_severidade
           else 'verde'::alerta_severidade
         end,
         null, 'funcionarios', f.id,
         'Funcionário ' || f.nome || ' completa ' ||
           case
             when (current_date - f.data_admissao) <= coalesce(f.experiencia_dias_1, 45)
               then coalesce(f.experiencia_dias_1, 45)::text
             else coalesce(f.experiencia_dias_2, 90)::text
           end ||
         ' dias em ' ||
         to_char(
           f.data_admissao +
             case
               when (current_date - f.data_admissao) <= coalesce(f.experiencia_dias_1, 45)
                 then coalesce(f.experiencia_dias_1, 45)
               else coalesce(f.experiencia_dias_2, 90)
             end,
           'DD/MM/YYYY'
         )
  from funcionarios f
  where f.status in ('ativo','experiencia')
    and f.data_admissao is not null
    and coalesce(f.experiencia_dias_2, 90) > 0
    and (current_date - f.data_admissao) between 0 and coalesce(f.experiencia_dias_2, 90)
    and (
      (current_date - f.data_admissao) between (coalesce(f.experiencia_dias_1, 45) - 7) and coalesce(f.experiencia_dias_1, 45)
      or (current_date - f.data_admissao) between (coalesce(f.experiencia_dias_2, 90) - 7) and coalesce(f.experiencia_dias_2, 90)
    )
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
