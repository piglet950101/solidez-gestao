-- Seed inicial dos itens conforme a padronização que a Débora enviou em 19/05/2026.
-- Idempotente: usa "where not exists" case-insensitive pra rodar sem duplicar.
-- Categorias usadas: 'EPI', 'Material' (já existentes no seed original).
-- 'Material de escritório' criado abaixo se não existir.

-- Garante a categoria de escritório
insert into categorias (nome, tipo, ordem) values ('Material de escritório', 'despesa', 60)
on conflict (nome, tipo) do nothing;

-- Índice único case-insensitive em itens.nome (idempotente)
create unique index if not exists itens_nome_lower_idx on itens (lower(nome));

-- Seed: usa SELECT VALUES com WHERE NOT EXISTS pra ser tolerante a re-runs
with cats as (
  select id, nome from categorias where nome in ('EPI', 'Material', 'Material de escritório')
),
novos (nome, unidade, categoria_nome, eh_epi, controla_validade) as (values
  -- EPIs (com variações de tamanho/cor)
  ('Luva carpinteiro',                 'par', 'EPI', true,  true),
  ('Luva armador',                     'par', 'EPI', true,  true),
  ('Luva látex multiuso',              'par', 'EPI', true,  true),
  ('Óculos proteção preto',            'un',  'EPI', true,  true),
  ('Óculos proteção incolor',          'un',  'EPI', true,  true),
  ('Protetor auricular',               'par', 'EPI', true,  true),
  ('Botina couro preta 38',            'par', 'EPI', true,  true),
  ('Botina couro preta 39',            'par', 'EPI', true,  true),
  ('Botina couro preta 40',            'par', 'EPI', true,  true),
  ('Botina couro preta 41',            'par', 'EPI', true,  true),
  ('Botina couro preta 42',            'par', 'EPI', true,  true),
  ('Botina couro preta 43',            'par', 'EPI', true,  true),
  ('Botina couro preta 44',            'par', 'EPI', true,  true),
  ('Botina couro preta 45',            'par', 'EPI', true,  true),
  ('Botina couro preta 46',            'par', 'EPI', true,  true),
  ('Carneira capacete',                'un',  'EPI', true,  false),
  ('Camiseta uniforme P',              'un',  'EPI', true,  false),
  ('Camiseta uniforme M',              'un',  'EPI', true,  false),
  ('Camiseta uniforme G',              'un',  'EPI', true,  false),
  ('Camiseta uniforme GG',             'un',  'EPI', true,  false),
  ('Calça uniforme P',                 'un',  'EPI', true,  false),
  ('Calça uniforme M',                 'un',  'EPI', true,  false),
  ('Calça uniforme G',                 'un',  'EPI', true,  false),
  ('Calça uniforme GG',                'un',  'EPI', true,  false),
  ('Jugular capacete',                 'un',  'EPI', true,  false),
  ('Cinto talabarte',                  'un',  'EPI', true,  true),
  ('Capacete segurança branco',        'un',  'EPI', true,  true),
  ('Capacete segurança amarelo',       'un',  'EPI', true,  true),
  ('Capa de chuva',                    'un',  'EPI', true,  false),

  -- Materiais / Ferramentas
  ('Broca metal',                                      'un', 'Material', false, false),
  ('Broca concreto SDS Plus',                          'un', 'Material', false, false),
  ('Broca espátula madeira',                           'un', 'Material', false, false),
  ('Broca chata madeira',                              'un', 'Material', false, false),
  ('Disco serra circular madeira 185mm 24D',           'un', 'Material', false, false),
  ('Disco serra circular madeira 235mm 24D',           'un', 'Material', false, false),
  ('Disco lixadeira inox 114,3x1,6mm',                 'un', 'Material', false, false),
  ('Disco policorte 355x3,2mm',                        'un', 'Material', false, false),
  ('Pilha alcalina',                                   'un', 'Material', false, false),
  ('Plug macho',                                       'un', 'Material', false, false),
  ('Plug fêmea',                                       'un', 'Material', false, false),
  ('Chave combinada',                                  'un', 'Material', false, false),

  -- Materiais de escritório
  ('Papel sulfite A4',                  'un', 'Material de escritório', false, false),
  ('Caneta esferográfica',              'un', 'Material de escritório', false, false),
  ('Pasta arquivo',                     'un', 'Material de escritório', false, false),
  ('Cartão ponto',                      'un', 'Material de escritório', false, false),
  ('Envelope',                          'un', 'Material de escritório', false, false),
  ('Marcador de texto',                 'un', 'Material de escritório', false, false),
  ('Marcador de página',                'un', 'Material de escritório', false, false),
  ('Toner impressora',                  'un', 'Material de escritório', false, false)
)
insert into itens (nome, unidade, categoria_id, eh_epi, controla_validade)
select n.nome, n.unidade, c.id, n.eh_epi, n.controla_validade
  from novos n
  left join cats c on c.nome = n.categoria_nome
 where not exists (select 1 from itens i where lower(i.nome) = lower(n.nome));
