// Supabase v2-compatible Database type. `pnpm db:types` regenerates from local
// Supabase once the project is bootstrapped; this hand-written scaffold matches
// the same shape so the app type-checks before the first generation run.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ObraStatus = 'planejada' | 'ativa' | 'pausada' | 'encerrada';
type ObraTipo = 'regular' | 'curto_prazo';
type RateioModo = 'igual' | 'percentual' | 'valor' | 'quantidade';
type QuemPagouTipo = 'empresa' | 'socio' | 'funcionario';
type ParcelaStatus = 'pendente' | 'pago' | 'atrasado' | 'cancelado';
type RecebimentoTipo = 'dinheiro' | 'permuta';
type ImpostoStatus = 'pendente_rateio' | 'rateado' | 'pago';
type TipoContrato = 'clt' | 'horista' | 'empreitada' | 'temporario';
type FuncionarioStatus = 'ativo' | 'desligado' | 'experiencia' | 'afastado';
type FolhaStatus = 'aberta' | 'fechada' | 'paga';
type EmpreitadaStatus = 'em_andamento' | 'concluida' | 'cancelada';
type ProLaboreStatus = 'previsto' | 'pago' | 'suspenso';
type VeiculoPropriedade = 'proprio_cnpj' | 'parceria_cpf';
type VeiculoStatus = 'ativo' | 'manutencao' | 'inativo' | 'vendido';
type VeiculoCustoTipo = 'combustivel' | 'manutencao' | 'documentacao' | 'financiamento' | 'seguro' | 'outros';
type CategoriaTipo = 'despesa' | 'receita' | 'folha' | 'imposto';
type AlertaSeveridade = 'verde' | 'amarelo' | 'vermelho';
type AlertaTipo =
  | 'conta_a_vencer'
  | 'conta_vencida'
  | 'doc_veiculo'
  | 'troca_oleo'
  | 'fim_experiencia'
  | 'imposto_pendente'
  | 'lucro_em_risco'
  | 'medicao_atrasada';
type WhatsAppEnvioStatus = 'pendente' | 'enviado' | 'entregue' | 'lido' | 'falhou';

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13';
  };
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          nome: string;
          razao_social: string;
          cnpj: string;
          nome_fantasia: string | null;
          logradouro: string | null;
          numero: string | null;
          complemento: string | null;
          bairro: string | null;
          municipio: string | null;
          uf: string | null;
          cep: string | null;
          email: string | null;
          telefone: string | null;
          porte: string | null;
          atividade_principal: string | null;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          razao_social: string;
          cnpj: string;
          nome_fantasia?: string | null;
          logradouro?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          municipio?: string | null;
          uf?: string | null;
          cep?: string | null;
          email?: string | null;
          telefone?: string | null;
          porte?: string | null;
          atividade_principal?: string | null;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database['public']['Tables']['empresas']['Insert']>;
        Relationships: [];
      };
      obras: {
        Row: {
          id: string;
          empresa_id: string;
          nome: string;
          codigo: string | null;
          status: ObraStatus;
          tipo: ObraTipo;
          com_permuta: boolean;
          data_inicio: string | null;
          data_fim_prevista: string | null;
          data_fim_real: string | null;
          endereco: string | null;
          observacoes: string | null;
          saldo_inicial: number | null;
          saldo_inicial_data: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          nome: string;
          codigo?: string | null;
          status?: ObraStatus;
          tipo?: ObraTipo;
          com_permuta?: boolean;
          data_inicio?: string | null;
          data_fim_prevista?: string | null;
          data_fim_real?: string | null;
          endereco?: string | null;
          observacoes?: string | null;
          saldo_inicial?: number | null;
          saldo_inicial_data?: string | null;
        };
        Update: Partial<Database['public']['Tables']['obras']['Insert']>;
        Relationships: [];
      };
      etapas_obra: {
        Row: { id: string; obra_id: string; nome: string; ordem: number; valor_orcado: number | null; criado_em: string };
        Insert: { id?: string; obra_id: string; nome: string; ordem: number; valor_orcado?: number | null };
        Update: Partial<Database['public']['Tables']['etapas_obra']['Insert']>;
        Relationships: [];
      };
      perfis_usuario: {
        Row: {
          user_id: string;
          nome: string;
          email: string;
          telefone_whatsapp: string | null;
          cargo: string | null;
          ativo: boolean;
          criado_em: string;
        };
        Insert: { user_id: string; nome: string; email: string; telefone_whatsapp?: string | null; cargo?: string | null; ativo?: boolean };
        Update: Partial<Database['public']['Tables']['perfis_usuario']['Insert']>;
        Relationships: [];
      };
      socios: {
        Row: {
          id: string;
          nome: string;
          cpf: string | null;
          contato: string | null;
          email: string | null;
          ativo: boolean;
          observacoes: string | null;
          criado_em: string;
        };
        Insert: { id?: string; nome: string; cpf?: string | null; contato?: string | null; email?: string | null; ativo?: boolean; observacoes?: string | null };
        Update: Partial<Database['public']['Tables']['socios']['Insert']>;
        Relationships: [];
      };
      obra_socios: {
        Row: { obra_id: string; socio_id: string; percentual: number };
        Insert: { obra_id: string; socio_id: string; percentual: number };
        Update: Partial<Database['public']['Tables']['obra_socios']['Insert']>;
        Relationships: [];
      };
      categorias: {
        Row: {
          id: string;
          nome: string;
          tipo: CategoriaTipo;
          cor: string | null;
          icone: string | null;
          ativo: boolean;
          ordem: number;
          subtipo: string | null;
          criado_em: string;
        };
        Insert: { id?: string; nome: string; tipo?: CategoriaTipo; cor?: string | null; icone?: string | null; ativo?: boolean; ordem?: number; subtipo?: string | null };
        Update: Partial<Database['public']['Tables']['categorias']['Insert']>;
        Relationships: [];
      };
      fornecedores: {
        Row: {
          id: string;
          nome: string;
          documento: string | null;
          contato: string | null;
          email: string | null;
          observacoes: string | null;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: { id?: string; nome: string; documento?: string | null; contato?: string | null; email?: string | null; observacoes?: string | null; ativo?: boolean };
        Update: Partial<Database['public']['Tables']['fornecedores']['Insert']>;
        Relationships: [];
      };
      compras: {
        Row: {
          id: string;
          empresa_id: string;
          fornecedor_id: string | null;
          categoria_id: string | null;
          descricao: string;
          valor_total: number;
          data_compra: string;
          num_parcelas: number;
          rateio_modo: RateioModo;
          quem_pagou: QuemPagouTipo;
          pago_por_socio_id: string | null;
          pago_por_funcionario_id: string | null;
          formato_pagamento: string | null;
          foto_nota_url: string | null;
          observacoes: string | null;
          veiculo_id: string | null;
          funcionario_id: string | null;
          fase_funcionario: 'admissional' | 'recorrente' | 'demissional' | null;
          criado_por: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          fornecedor_id?: string | null;
          categoria_id?: string | null;
          descricao: string;
          valor_total: number;
          data_compra: string;
          num_parcelas?: number;
          rateio_modo: RateioModo;
          quem_pagou?: QuemPagouTipo;
          pago_por_socio_id?: string | null;
          pago_por_funcionario_id?: string | null;
          formato_pagamento?: string | null;
          foto_nota_url?: string | null;
          observacoes?: string | null;
          criado_por?: string | null;
        };
        Update: Partial<Database['public']['Tables']['compras']['Insert']>;
        Relationships: [];
      };
      compra_alocacoes: {
        Row: {
          id: string;
          compra_id: string;
          obra_id: string;
          valor_alocado: number;
          qtd_alocada: number | null;
          percentual_alocado: number | null;
        };
        Insert: { id?: string; compra_id: string; obra_id: string; valor_alocado: number; qtd_alocada?: number | null; percentual_alocado?: number | null };
        Update: Partial<Database['public']['Tables']['compra_alocacoes']['Insert']>;
        Relationships: [];
      };
      parcelas: {
        Row: {
          id: string;
          compra_id: string;
          num_parcela: number;
          data_vencimento: string;
          valor: number;
          status: ParcelaStatus;
          data_pagamento: string | null;
          observacoes: string | null;
        };
        Insert: { id?: string; compra_id: string; num_parcela: number; data_vencimento: string; valor: number; status?: ParcelaStatus; data_pagamento?: string | null };
        Update: Partial<Database['public']['Tables']['parcelas']['Insert']>;
        Relationships: [];
      };
      custos_fixos: {
        Row: {
          id: string;
          empresa_id: string;
          descricao: string;
          categoria_id: string | null;
          valor_mensal: number;
          dia_vencimento: number | null;
          vigencia_inicio: string;
          vigencia_fim: string | null;
          ativo: boolean;
          observacoes: string | null;
          modo_rateio: 'manual' | 'igual_obras_ativas' | 'proporcional_faturamento';
          criado_em: string;
        };
        Insert: { id?: string; empresa_id: string; descricao: string; categoria_id?: string | null; valor_mensal: number; dia_vencimento?: number | null; vigencia_inicio?: string; vigencia_fim?: string | null; ativo?: boolean; observacoes?: string | null; modo_rateio?: 'manual' | 'igual_obras_ativas' | 'proporcional_faturamento' };
        Update: Partial<Database['public']['Tables']['custos_fixos']['Insert']>;
        Relationships: [];
      };
      custos_fixos_alocacoes: {
        Row: { id: string; custo_fixo_id: string; obra_id: string; percentual: number };
        Insert: { id?: string; custo_fixo_id: string; obra_id: string; percentual: number };
        Update: Partial<Database['public']['Tables']['custos_fixos_alocacoes']['Insert']>;
        Relationships: [];
      };
      medicoes: {
        Row: {
          id: string;
          obra_id: string;
          etapa_id: string | null;
          num_medicao: number;
          descricao: string | null;
          valor_bruto: number;
          valor_liquido: number;
          percentual_imposto_estimado: number | null;
          data_emissao: string;
          num_nota_fiscal: string | null;
          observacoes: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: { id?: string; obra_id: string; etapa_id?: string | null; num_medicao: number; descricao?: string | null; valor_bruto: number; valor_liquido: number; percentual_imposto_estimado?: number | null; data_emissao: string; num_nota_fiscal?: string | null };
        Update: Partial<Database['public']['Tables']['medicoes']['Insert']>;
        Relationships: [];
      };
      recebimentos: {
        Row: {
          id: string;
          medicao_id: string;
          valor: number;
          data_recebimento: string;
          tipo: RecebimentoTipo;
          descricao_permuta: string | null;
          observacoes: string | null;
          criado_em: string;
        };
        Insert: { id?: string; medicao_id: string; valor: number; data_recebimento: string; tipo?: RecebimentoTipo; descricao_permuta?: string | null };
        Update: Partial<Database['public']['Tables']['recebimentos']['Insert']>;
        Relationships: [];
      };
      antecipacoes: {
        Row: {
          id: string;
          obra_id: string;
          data_recebimento: string;
          valor: number;
          abatido_em_medicao_id: string | null;
          observacoes: string | null;
          criado_em: string;
        };
        Insert: { id?: string; obra_id: string; data_recebimento: string; valor: number; abatido_em_medicao_id?: string | null; observacoes?: string | null };
        Update: Partial<Database['public']['Tables']['antecipacoes']['Insert']>;
        Relationships: [];
      };
      impostos: {
        Row: {
          id: string;
          empresa_id: string;
          mes_referencia: string;
          valor_total: number;
          status: ImpostoStatus;
          data_vencimento: string | null;
          data_pagamento: string | null;
          num_boleto: string | null;
          observacoes: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: { id?: string; empresa_id: string; mes_referencia: string; valor_total: number; status?: ImpostoStatus; data_vencimento?: string | null; num_boleto?: string | null };
        Update: Partial<Database['public']['Tables']['impostos']['Insert']>;
        Relationships: [];
      };
      imposto_alocacoes: {
        Row: { imposto_id: string; obra_id: string; valor: number };
        Insert: { imposto_id: string; obra_id: string; valor: number };
        Update: Partial<Database['public']['Tables']['imposto_alocacoes']['Insert']>;
        Relationships: [];
      };
      funcionarios: {
        Row: {
          id: string;
          nome: string;
          cpf: string | null;
          rg: string | null;
          chave_pix: string | null;
          contato: string | null;
          cargo: string | null;
          tipo_contrato: TipoContrato;
          salario_hora: number | null;
          salario_mes: number | null;
          status: FuncionarioStatus;
          data_admissao: string | null;
          data_desligamento: string | null;
          registrado: boolean;
          tem_os_curso: boolean;
          os_curso_validade: string | null;
          tamanho_sapato: string | null;
          tamanho_camiseta: string | null;
          tamanho_calca: string | null;
          observacoes: string | null;
          cabeca_de_empreitada: boolean;
          experiencia_dias_1: number | null;
          experiencia_dias_2: number | null;
          obra_admissao_id: string | null;
          obra_atual_id: string | null;
          obra_demissao_id: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          cpf?: string | null;
          rg?: string | null;
          chave_pix?: string | null;
          contato?: string | null;
          cargo?: string | null;
          tipo_contrato?: TipoContrato;
          salario_hora?: number | null;
          salario_mes?: number | null;
          status?: FuncionarioStatus;
          data_admissao?: string | null;
          data_desligamento?: string | null;
          registrado?: boolean;
          tem_os_curso?: boolean;
          os_curso_validade?: string | null;
          tamanho_sapato?: string | null;
          tamanho_camiseta?: string | null;
          tamanho_calca?: string | null;
          cabeca_de_empreitada?: boolean;
          observacoes?: string | null;
          experiencia_dias_1?: number | null;
          experiencia_dias_2?: number | null;
          obra_admissao_id?: string | null;
          obra_atual_id?: string | null;
          obra_demissao_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['funcionarios']['Insert']>;
        Relationships: [];
      };
      funcionario_obra_historico: {
        Row: {
          id: string;
          funcionario_id: string;
          obra_id: string;
          data_inicio: string;
          data_fim: string | null;
          motivo: 'admissao' | 'transferencia' | 'demissao';
          observacao: string | null;
          criado_por: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          funcionario_id: string;
          obra_id: string;
          data_inicio: string;
          data_fim?: string | null;
          motivo: 'admissao' | 'transferencia' | 'demissao';
          observacao?: string | null;
        };
        Update: Partial<Database['public']['Tables']['funcionario_obra_historico']['Insert']>;
        Relationships: [];
      };
      funcionario_documentos: {
        Row: {
          id: string;
          funcionario_id: string;
          tipo: string;
          descricao: string | null;
          storage_path: string;
          validade: string | null;
          criado_por: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          funcionario_id: string;
          tipo: string;
          descricao?: string | null;
          storage_path: string;
          validade?: string | null;
        };
        Update: Partial<Database['public']['Tables']['funcionario_documentos']['Insert']>;
        Relationships: [];
      };
      lancamentos_folha: {
        Row: {
          id: string;
          funcionario_id: string;
          obra_id: string;
          empresa_id: string;
          mes_referencia: string;
          dias_9h: number;
          dias_8h: number;
          horas_extras: number;
          horas_faltantes: number;
          valor_extras: number;
          total_horas: number;
          valor_horas: number;
          valor_salario_fixo: number;
          valor_comissao: number;
          valor_vales: number;
          valor_outros_descontos: number;
          valor_liquido: number;
          valor_em_especie: number;
          status: FolhaStatus;
          data_pagamento: string | null;
          observacoes: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          funcionario_id: string;
          obra_id: string;
          empresa_id: string;
          mes_referencia: string;
          dias_9h?: number;
          dias_8h?: number;
          horas_extras?: number;
          horas_faltantes?: number;
          valor_extras?: number;
          valor_horas?: number;
          valor_salario_fixo?: number;
          valor_comissao?: number;
          valor_vales?: number;
          valor_outros_descontos?: number;
          valor_liquido?: number;
          valor_em_especie?: number;
          status?: FolhaStatus;
        };
        Update: Partial<Database['public']['Tables']['lancamentos_folha']['Insert']>;
        Relationships: [];
      };
      vales: {
        Row: {
          id: string;
          funcionario_id: string;
          obra_id: string | null;
          data: string;
          valor: number;
          descontado_em_folha_id: string | null;
          lancado_por: string | null;
          observacoes: string | null;
          criado_em: string;
        };
        Insert: { id?: string; funcionario_id: string; obra_id?: string | null; data: string; valor: number; descontado_em_folha_id?: string | null };
        Update: Partial<Database['public']['Tables']['vales']['Insert']>;
        Relationships: [];
      };
      empreitadas: {
        Row: {
          id: string;
          obra_id: string;
          descricao: string;
          valor_total: number;
          cabeca_funcionario_id: string;
          status: EmpreitadaStatus;
          data_inicio: string;
          data_conclusao: string | null;
          observacoes: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: { id?: string; obra_id: string; descricao: string; valor_total: number; cabeca_funcionario_id: string; status?: EmpreitadaStatus; data_inicio: string; data_conclusao?: string | null; observacoes?: string | null };
        Update: Partial<Database['public']['Tables']['empreitadas']['Insert']>;
        Relationships: [];
      };
      empreitada_pagamentos: {
        Row: { id: string; empreitada_id: string; data: string; valor: number; observacoes: string | null; criado_em: string };
        Insert: { id?: string; empreitada_id: string; data: string; valor: number };
        Update: Partial<Database['public']['Tables']['empreitada_pagamentos']['Insert']>;
        Relationships: [];
      };
      funcionario_comissoes: {
        Row: { id: string; funcionario_id: string; obra_id: string; mes_referencia: string; valor: number; descricao: string | null; criado_em: string };
        Insert: { id?: string; funcionario_id: string; obra_id: string; mes_referencia: string; valor: number; descricao?: string | null };
        Update: Partial<Database['public']['Tables']['funcionario_comissoes']['Insert']>;
        Relationships: [];
      };
      pro_labore: {
        Row: {
          id: string;
          socio_id: string;
          obra_id: string;
          mes_referencia: string;
          valor_definido: number;
          valor_pago: number | null;
          status: ProLaboreStatus;
          data_pagamento: string | null;
          observacoes: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: { id?: string; socio_id: string; obra_id: string; mes_referencia: string; valor_definido: number; valor_pago?: number | null; status?: ProLaboreStatus; data_pagamento?: string | null; observacoes?: string | null };
        Update: Partial<Database['public']['Tables']['pro_labore']['Insert']>;
        Relationships: [];
      };
      veiculos: {
        Row: {
          id: string;
          placa: string;
          modelo: string;
          marca: string | null;
          ano: number | null;
          cor: string | null;
          tipo_propriedade: VeiculoPropriedade;
          proprietario_nome: string | null;
          proprietario_documento: string | null;
          empresa_id: string | null;
          status: VeiculoStatus;
          doc_vencimento: string | null;
          ultima_troca_oleo_data: string | null;
          ultima_troca_oleo_km: number | null;
          km_atual: number | null;
          intervalo_oleo_km: number | null;
          financiamento_ativo: boolean;
          financiamento_parcela: number | null;
          financiamento_parcelas_restantes: number | null;
          observacoes: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: { id?: string; placa: string; modelo: string; tipo_propriedade: VeiculoPropriedade; ano?: number | null; cor?: string | null; marca?: string | null; empresa_id?: string | null; status?: VeiculoStatus; doc_vencimento?: string | null };
        Update: Partial<Database['public']['Tables']['veiculos']['Insert']>;
        Relationships: [];
      };
      veiculo_alocacoes: {
        Row: { id: string; veiculo_id: string; obra_id: string; percentual: number; periodo_inicio: string; periodo_fim: string | null; observacoes: string | null; criado_em: string };
        Insert: { id?: string; veiculo_id: string; obra_id: string; percentual: number; periodo_inicio: string; periodo_fim?: string | null };
        Update: Partial<Database['public']['Tables']['veiculo_alocacoes']['Insert']>;
        Relationships: [];
      };
      veiculo_custos: {
        Row: {
          id: string;
          veiculo_id: string;
          tipo: VeiculoCustoTipo;
          data: string;
          valor: number;
          km: number | null;
          fornecedor_id: string | null;
          descricao: string | null;
          foto_comprovante_url: string | null;
          criado_em: string;
        };
        Insert: { id?: string; veiculo_id: string; tipo: VeiculoCustoTipo; data: string; valor: number; km?: number | null; descricao?: string | null };
        Update: Partial<Database['public']['Tables']['veiculo_custos']['Insert']>;
        Relationships: [];
      };
      alertas: {
        Row: {
          id: string;
          tipo: AlertaTipo;
          severidade: AlertaSeveridade;
          empresa_id: string | null;
          obra_id: string | null;
          entidade_tabela: string;
          entidade_id: string;
          mensagem: string;
          contexto: Json | null;
          criado_em: string;
          resolvido_em: string | null;
        };
        Insert: { id?: string; tipo: AlertaTipo; severidade: AlertaSeveridade; empresa_id?: string | null; obra_id?: string | null; entidade_tabela: string; entidade_id: string; mensagem: string; contexto?: Json | null; resolvido_em?: string | null };
        Update: Partial<Database['public']['Tables']['alertas']['Insert']>;
        Relationships: [];
      };
      whatsapp_envios: {
        Row: {
          id: string;
          alerta_id: string | null;
          destinatario_user_id: string | null;
          telefone_destino: string;
          template_name: string | null;
          template_vars: Json | null;
          status: WhatsAppEnvioStatus;
          message_id_meta: string | null;
          resposta_meta: Json | null;
          enviado_em: string | null;
          erro: string | null;
          criado_em: string;
        };
        Insert: { id?: string; alerta_id?: string | null; destinatario_user_id?: string | null; telefone_destino: string; template_name?: string | null; template_vars?: Json | null; status?: WhatsAppEnvioStatus; message_id_meta?: string | null; resposta_meta?: Json | null; enviado_em?: string | null; erro?: string | null };
        Update: Partial<Database['public']['Tables']['whatsapp_envios']['Insert']>;
        Relationships: [];
      };
      user_empresas: {
        Row: { user_id: string; empresa_id: string; papel: string };
        Insert: { user_id: string; empresa_id: string; papel?: string };
        Update: Partial<Database['public']['Tables']['user_empresas']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      vw_dashboard_kpis: {
        Row: {
          empresa_id: string;
          empresa: string;
          total_a_pagar: number;
          total_a_receber: number;
          alertas_ativos: number;
          alertas_criticos: number;
        };
        Relationships: [];
      };
      vw_margem_obra: {
        Row: {
          obra_id: string;
          empresa_id: string;
          nome: string;
          mes: string;
          receita_total: number;
          receita_caixa: number;
          despesa_total: number;
          margem: number;
          caixa_liquido: number;
        };
        Relationships: [];
      };
      vw_desembolso_13s: {
        Row: { semana_inicio: string; obra_id: string; obra: string; empresa_id: string; valor: number };
        Relationships: [];
      };
      vw_receita_obra: {
        Row: {
          obra_id: string;
          medicao_id: string;
          mes_referencia: string;
          valor_medicao: number;
          recebido_dinheiro: number;
          recebido_permuta: number;
          antecipacao_abatida: number;
        };
        Relationships: [];
      };
      vw_despesa_obra: {
        Row: {
          obra_id: string;
          mes: string;
          compras: number;
          custos_fixos: number;
          folha: number;
          imposto: number;
          veiculo: number;
          despesa_total: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      fn_lucro_distribuivel: {
        Args: { p_obra_id: string };
        Returns: {
          receita_caixa: number;
          despesas_pagas: number;
          despesas_pendentes: number;
          imposto_rateado: number;
          imposto_estimado: number;
          pro_labore_previsto: number;
          lucro_distribuivel: number;
          comprometido: number;
          alerta: boolean;
        }[];
      };
      fn_criar_compra: {
        Args: {
          p_empresa_id: string;
          p_fornecedor_id: string | null;
          p_categoria_id: string | null;
          p_descricao: string;
          p_valor_total: number;
          p_data_compra: string;
          p_rateio_modo: RateioModo;
          p_quem_pagou: QuemPagouTipo;
          p_pago_por_socio_id: string | null;
          p_pago_por_funcionario_id: string | null;
          p_formato_pagamento: string | null;
          p_foto_nota_url: string | null;
          p_alocacoes: Json;
          p_parcelas: Json;
          p_veiculo_id?: string | null;
          p_funcionario_id?: string | null;
          p_fase_funcionario?: 'admissional' | 'recorrente' | 'demissional' | null;
        };
        Returns: string;
      };
      fn_conciliar_antecipacao: {
        Args: { p_antecipacao_id: string; p_medicao_id: string };
        Returns: undefined;
      };
      fn_fechar_folha: {
        Args: { p_funcionario_id: string; p_obra_id: string; p_mes_referencia: string };
        Returns: string;
      };
      fn_gerar_alertas_diarios: {
        Args: Record<string, never>;
        Returns: number;
      };
      fn_transferir_veiculo: {
        Args: { p_veiculo_id: string; p_nova_obra_id: string; p_data_transferencia: string; p_observacao: string | null };
        Returns: string;
      };
      fn_transferir_funcionario: {
        Args: { p_funcionario_id: string; p_nova_obra_id: string; p_data_transferencia: string; p_observacao: string | null };
        Returns: string;
      };
      fn_desligar_funcionario: {
        Args: { p_funcionario_id: string; p_data_desligamento: string; p_observacao: string | null };
        Returns: undefined;
      };
      fn_custo_fixo_alocacoes_efetivas: {
        Args: { p_custo_fixo_id: string; p_mes_referencia?: string };
        Returns: { obra_id: string; percentual: number; valor: number }[];
      };
    };
    Enums: {
      obra_status: ObraStatus;
      obra_tipo: ObraTipo;
      rateio_modo: RateioModo;
      quem_pagou_tipo: QuemPagouTipo;
      parcela_status: ParcelaStatus;
      recebimento_tipo: RecebimentoTipo;
      imposto_status: ImpostoStatus;
      tipo_contrato: TipoContrato;
      funcionario_status: FuncionarioStatus;
      folha_status: FolhaStatus;
      empreitada_status: EmpreitadaStatus;
      pro_labore_status: ProLaboreStatus;
      veiculo_propriedade: VeiculoPropriedade;
      veiculo_status: VeiculoStatus;
      veiculo_custo_tipo: VeiculoCustoTipo;
      categoria_tipo: CategoriaTipo;
      alerta_severidade: AlertaSeveridade;
      alerta_tipo: AlertaTipo;
      whatsapp_envio_status: WhatsAppEnvioStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience exports for app code
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

export type Empresa = Tables<'empresas'>;
export type Obra = Tables<'obras'>;
export type Compra = Tables<'compras'>;
export type Parcela = Tables<'parcelas'>;
export type Funcionario = Tables<'funcionarios'>;
export type Medicao = Tables<'medicoes'>;
export type Recebimento = Tables<'recebimentos'>;
export type Antecipacao = Tables<'antecipacoes'>;
export type Imposto = Tables<'impostos'>;
export type Veiculo = Tables<'veiculos'>;
export type Alerta = Tables<'alertas'>;
export type Socio = Tables<'socios'>;
export type Categoria = Tables<'categorias'>;
export type Fornecedor = Tables<'fornecedores'>;
export type LancamentoFolha = Tables<'lancamentos_folha'>;
export type Vale = Tables<'vales'>;
export type DashboardKPI = Views<'vw_dashboard_kpis'>;
export type MargemObra = Views<'vw_margem_obra'>;
export type Desembolso13s = Views<'vw_desembolso_13s'>;
export type LucroDistribuivel = Database['public']['Functions']['fn_lucro_distribuivel']['Returns'][number];
