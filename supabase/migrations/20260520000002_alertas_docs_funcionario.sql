-- Parte 2: estende fn_gerar_alertas_diarios pra incluir documentos/cursos
-- de funcionário vencendo (NR-10/18/35/33/06, ASO, etc).
-- O painel de Alertas passa a listar os documentos que vencem nos próximos
-- 30 dias (amarelo) ou já vencidos (vermelho). Quando o WhatsApp entrar
-- (etapa final), esses alertas já viram notificação automática.

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
    c.empresa_id, 'parcelas', p.id,
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

  -- NOVO: Documentos / cursos de funcionário vencendo (NR, ASO, etc)
  insert into alertas (tipo, severidade, empresa_id, entidade_tabela, entidade_id, mensagem, contexto)
  select 'doc_funcionario_vencendo',
         case when fd.validade < current_date then 'vermelho'::alerta_severidade
              when fd.validade <= current_date + 30 then 'amarelo'::alerta_severidade
              else 'verde'::alerta_severidade end,
         null, 'funcionario_documentos', fd.id,
         case when fd.validade < current_date then
           replace(fd.tipo, '_', ' ') || ' de ' || f.nome || ' VENCEU em ' || to_char(fd.validade, 'DD/MM/YYYY')
         else
           replace(fd.tipo, '_', ' ') || ' de ' || f.nome || ' vence em ' || (fd.validade - current_date) || ' dia(s) (' || to_char(fd.validade, 'DD/MM/YYYY') || ')'
         end,
         jsonb_build_object('funcionario', f.nome, 'tipo', fd.tipo, 'validade', fd.validade, 'data_realizacao', fd.data_realizacao)
  from funcionario_documentos fd
  join funcionarios f on f.id = fd.funcionario_id
  where fd.validade is not null
    and fd.validade <= current_date + 30
    and f.status <> 'desligado'
  on conflict do nothing;

  return v_count;
end;
$$ language plpgsql security definer;
