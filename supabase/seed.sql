-- Seed Solidez Gestão · 2 CNPJs reais · 9 obras · sócios · categorias

------------------------------------------------------------------
-- Empresas (dados oficiais dos comprovantes de inscrição RFB)

insert into empresas (id, nome, razao_social, cnpj, nome_fantasia,
                      logradouro, numero, complemento, bairro, municipio, uf, cep,
                      email, telefone, porte, atividade_principal)
values
('11111111-1111-1111-1111-111111111111',
 'Solidez Trento',
 'SOLIDEZ TRENTO EMPREITEIRA DE MAO DE OBRA LTDA',
 '55.646.992/0001-10', null,
 'R Marcolino Duarte', '891', 'APT 602', 'Centro', 'São João Batista', 'SC', '88.240-000',
 'eng.michaeldalsasso@gmail.com', '(48) 9973-3054',
 'ME', '41.20-4-00 - Construção de edifícios'),
('22222222-2222-2222-2222-222222222222',
 'Solidez BR',
 'SOLIDEZ BR EMPREITEIRA DE MAO DE OBRA LTDA',
 '55.999.998/0001-71', 'SOLIDEZ BR EMPREITEIRA',
 'R 410', '468', 'Residencial Maria S Apt 802 Bloco A', 'Morretes', 'Itapema', 'SC', '88.220-000',
 'brunoboehme@hotmail.com', '(47) 9769-3221',
 'ME', '41.20-4-00 - Construção de edifícios');

------------------------------------------------------------------
-- Sócios (Reule sem CPF/contato — pendente; Bruno-sócio confirmado)
-- Michael placeholder até CPF chegar.

insert into socios (id, nome, cpf, contato, observacoes) values
('aaaa1111-0000-0000-0000-000000000001', 'Michael Maiki Dalsasso', null, '(48) 99973-3054',
 'Sócio em todas as obras "solo" e nas sociedades. CPF a confirmar.'),
('aaaa1111-0000-0000-0000-000000000002', 'Reule Til', null, null,
 'Sócio em Home in Garden e Enseada. CPF e contato a confirmar.'),
('aaaa1111-0000-0000-0000-000000000003', 'Bruno Rossi Boheme', '065.853.799-77', '(47) 97693221',
 'Sócio em Triad e DG. Cadastro independente da posição CLT como engenheiro.');

------------------------------------------------------------------
-- Obras: 9 no total (5 Trento + 4 BR), permuta marcada em The One e Enseada

insert into obras (id, empresa_id, nome, com_permuta, status) values
('1aaa0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Home in Garden', false, 'ativa'),
('1aaa0001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Liberty', false, 'ativa'),
('1aaa0001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Select', false, 'ativa'),
('1aaa0001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Titanium', false, 'ativa'),
('1aaa0001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'The One', true, 'ativa'),
('2bbb0002-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Enseada', true, 'ativa'),
('2bbb0002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Triad', false, 'ativa'),
('2bbb0002-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'DG', false, 'ativa'),
('2bbb0002-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'Dreams', false, 'ativa');

------------------------------------------------------------------
-- Sociedades 50/50 confirmadas pelo cliente

insert into obra_socios (obra_id, socio_id, percentual) values
-- Solos (Michael 100%)
('1aaa0001-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000001', 100),
('1aaa0001-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000001', 100),
('1aaa0001-0000-0000-0000-000000000004', 'aaaa1111-0000-0000-0000-000000000001', 100),
('1aaa0001-0000-0000-0000-000000000005', 'aaaa1111-0000-0000-0000-000000000001', 100),
('2bbb0002-0000-0000-0000-000000000004', 'aaaa1111-0000-0000-0000-000000000001', 100),
-- Sociedade Michael + Reule (50/50)
('1aaa0001-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 50),
('1aaa0001-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000002', 50),
('2bbb0002-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 50),
('2bbb0002-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000002', 50),
-- Sociedade Michael + Bruno (50/50)
('2bbb0002-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000001', 50),
('2bbb0002-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000003', 50),
('2bbb0002-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000001', 50),
('2bbb0002-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000003', 50);

------------------------------------------------------------------
-- Categorias padrão (incluindo Marmita por pedido explícito do cliente)

insert into categorias (nome, tipo, cor, ordem) values
('EPI', 'despesa', '#15803d', 10),
('Material', 'despesa', '#0369a1', 20),
('Aluguel', 'despesa', '#7c3aed', 30),
('Pagamento', 'despesa', '#1e293b', 40),
('Imposto', 'imposto', '#b91c1c', 50),
('Combustível', 'despesa', '#c2410c', 60),
('Manutenção', 'despesa', '#a16207', 70),
('Vale', 'folha', '#475569', 80),
('Pró-labore', 'folha', '#581c87', 90),
('Marmita', 'despesa', '#d97706', 100),
('Outros', 'despesa', '#64748b', 999),
-- Receitas
('Medição', 'receita', '#15803d', 10),
('Antecipação', 'receita', '#0891b2', 20);

------------------------------------------------------------------
-- Bruno como funcionário CLT (independente do cadastro de sócio)

insert into funcionarios (id, nome, cpf, cargo, tipo_contrato, salario_mes, status, registrado, contato)
values ('bbbb2222-0000-0000-0000-000000000001',
        'Bruno Rossi Boheme', '065.853.799-77', 'Engenheiro', 'clt', null, 'ativo', true, '(47) 97693221');
