-- ============================================================================
-- Seed amplo para testes manuais (idempotente por e-mail/placa/observações marcadoras)
-- ============================================================================

UPDATE empresa
SET plano = 'COMPLETO',
    status_assinatura = 'ATIVA',
    valor_mensalidade = 119.90,
    proximo_vencimento = CURRENT_DATE + 30,
    data_atualizacao = NOW()
WHERE id = (SELECT MIN(id) FROM empresa);

UPDATE cliente
SET cep = '88010000',
    logradouro = 'Rua Felipe Schmidt',
    numero = '250',
    bairro = 'Centro',
    cidade = 'Florianópolis',
    uf = 'SC',
    telefone = '48991740001',
    data_atualizacao = NOW()
WHERE email = 'cliente.demo@esteticadesk.com';

INSERT INTO cliente (
    empresa_id, nome, cpf_cnpj, telefone, email, ativo,
    cep, logradouro, numero, complemento, bairro, cidade, uf
)
SELECT e.id, c.nome, c.cpf, c.telefone, c.email, TRUE,
       c.cep, c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.uf
FROM empresa e
CROSS JOIN (VALUES
    ('Ana Souza', '39053344705', '48991741101', 'seed.ana@esteticaflow.local',
     '88015070', 'Av. Beira Mar Norte', '1500', NULL, 'Centro', 'Florianópolis', 'SC'),
    ('Bruno Lima', '15350946056', '48991741102', 'seed.bruno@esteticaflow.local',
     '88020000', 'Rua Trajano', '80', 'Apto 12', 'Centro', 'Florianópolis', 'SC'),
    ('Carla Mendes', '71428793860', '48991741103', 'seed.carla@esteticaflow.local',
     '88101000', 'Rua João Pessoa', '450', NULL, 'Centro', 'São José', 'SC'),
    ('Diego Martins', '11144477735', '48991741104', 'seed.diego@esteticaflow.local',
     '88036000', 'Rua Mauro Ramos', '920', NULL, 'Centro', 'Florianópolis', 'SC'),
    ('Elena Costa', '23456789092', '48991741105', 'seed.elena@esteticaflow.local',
     '88025100', 'Rua Bocaiúva', '2100', 'Sala 3', 'Centro', 'Florianópolis', 'SC'),
    ('Fábio Nunes', '34567890175', '48991741106', 'seed.fabio@esteticaflow.local',
     NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    ('Gisele Rocha', '45678901249', '48991741107', 'seed.gisele@esteticaflow.local',
     '88113000', 'Rua Otto Feuerschuette', '55', NULL, 'Kobrasol', 'São José', 'SC'),
    ('Henrique Alves', '56789012303', '48991741108', 'seed.henrique@esteticaflow.local',
     '88060400', 'Rod. José Carlos Daux', '8600', NULL, 'Saco Grande', 'Florianópolis', 'SC')
) AS c(nome, cpf, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf)
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM cliente x WHERE x.empresa_id = e.id AND x.email = c.email
  );

INSERT INTO veiculo (empresa_id, cliente_id, placa, modelo, marca, cor, ano, ativo)
SELECT c.empresa_id, c.id, v.placa, v.modelo, v.marca, v.cor, v.ano, TRUE
FROM (VALUES
    ('seed.ana@esteticaflow.local', 'SEED0A01', 'Onix', 'Chevrolet', 'Prata', 2021),
    ('seed.ana@esteticaflow.local', 'SEED0A02', 'Tracker', 'Chevrolet', 'Branco', 2023),
    ('seed.bruno@esteticaflow.local', 'SEED0B01', 'Corolla', 'Toyota', 'Preto', 2020),
    ('seed.carla@esteticaflow.local', 'SEED0C01', 'HB20', 'Hyundai', 'Vermelho', 2019),
    ('seed.diego@esteticaflow.local', 'SEED0D01', 'Compass', 'Jeep', 'Cinza', 2022),
    ('seed.elena@esteticaflow.local', 'SEED0E01', 'Polo', 'Volkswagen', 'Azul', 2018),
    ('seed.fabio@esteticaflow.local', 'SEED0F01', 'Civic', 'Honda', 'Preto', 2024),
    ('seed.gisele@esteticaflow.local', 'SEED0G01', 'Kicks', 'Nissan', 'Branco', 2021),
    ('seed.henrique@esteticaflow.local', 'SEED0H01', 'Ranger', 'Ford', 'Prata', 2020),
    ('cliente.demo@esteticadesk.com', 'SEED0D02', 'Gol', 'Volkswagen', 'Branco', 2017)
) AS v(email, placa, modelo, marca, cor, ano)
JOIN cliente c ON c.email = v.email
WHERE NOT EXISTS (
    SELECT 1 FROM veiculo x WHERE x.empresa_id = c.empresa_id AND x.placa = v.placa
);

INSERT INTO produto (empresa_id, categoria_produto_id, nome, unidade_medida, preco_custo, ativo)
SELECT e.id, cp.id, p.nome, p.unidade, p.custo, TRUE
FROM empresa e
CROSS JOIN (VALUES
    ('Químicos', 'Cera premium', 'UN', 48.00),
    ('Químicos', 'Desengraxante', 'L', 32.50),
    ('Acessórios', 'Microfibra', 'UN', 12.00),
    ('Equipamentos', 'Politriz orbital', 'UN', 890.00)
) AS p(categoria, nome, unidade, custo)
JOIN categoria_produto cp ON cp.empresa_id = e.id AND cp.nome = p.categoria
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM produto x WHERE x.empresa_id = e.id AND x.nome = p.nome
  );

INSERT INTO estoque (empresa_id, produto_id, quantidade_atual, quantidade_minima)
SELECT p.empresa_id, p.id, s.qtd, s.minimo
FROM (VALUES
    ('Cera premium', 8.000, 10.000),
    ('Desengraxante', 25.000, 5.000),
    ('Microfibra', 40.000, 15.000),
    ('Politriz orbital', 2.000, 1.000)
) AS s(nome, qtd, minimo)
JOIN produto p ON p.nome = s.nome AND p.empresa_id = (SELECT MIN(id) FROM empresa)
WHERE NOT EXISTS (SELECT 1 FROM estoque es WHERE es.produto_id = p.id);

INSERT INTO despesa (empresa_id, descricao, categoria, valor, data_pagamento)
SELECT e.id, d.descricao, d.categoria, d.valor, CURRENT_DATE - d.dias
FROM empresa e
CROSS JOIN (VALUES
    ('Aluguel da unidade', 'FIXA', 2800.00, 5),
    ('Energia elétrica', 'VARIAVEL', 420.00, 3),
    ('Compra de insumos', 'FORNECEDOR', 650.00, 1)
) AS d(descricao, categoria, valor, dias)
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM despesa x
      WHERE x.empresa_id = e.id AND x.descricao = d.descricao
  );

INSERT INTO agendamento (
    empresa_id, cliente_id, veiculo_id, data_hora, status, observacoes,
    subtotal, desconto, total, pago
)
SELECT
    c.empresa_id,
    c.id,
    v.id,
    ((CURRENT_DATE - a.dias) + a.hora::time),
    a.status,
    a.marcador,
    s.preco,
    a.desconto,
    s.preco - a.desconto,
    a.pago
FROM (VALUES
    ('seed.ana@esteticaflow.local', 'Lavagem simples', 'CONCLUIDO', TRUE, 0.00, 20, '09:00', 'SEED-AG-ANA-1'),
    ('seed.ana@esteticaflow.local', 'Lavagem completa', 'CONCLUIDO', TRUE, 20.00, 7, '14:30', 'SEED-AG-ANA-2'),
    ('seed.bruno@esteticaflow.local', 'Lavagem simples', 'CONCLUIDO', TRUE, 0.00, 15, '10:00', 'SEED-AG-BRU-1'),
    ('seed.bruno@esteticaflow.local', 'Lavagem simples', 'AGENDADO', FALSE, 0.00, 0, '16:00', 'SEED-AG-BRU-2'),
    ('seed.carla@esteticaflow.local', 'Lavagem completa', 'CONCLUIDO', FALSE, 0.00, 4, '11:00', 'SEED-AG-CAR-1'),
    ('seed.diego@esteticaflow.local', 'Polimento técnico', 'EM_ANDAMENTO', FALSE, 50.00, 0, '13:00', 'SEED-AG-DIE-1'),
    ('seed.elena@esteticaflow.local', 'Lavagem simples', 'CONCLUIDO', TRUE, 0.00, 30, '08:30', 'SEED-AG-ELE-1'),
    ('seed.fabio@esteticaflow.local', 'Lavagem simples', 'CANCELADO', FALSE, 0.00, 2, '15:00', 'SEED-AG-FAB-1'),
    ('seed.gisele@esteticaflow.local', 'Vitrificação', 'CONCLUIDO', TRUE, 100.00, 12, '09:30', 'SEED-AG-GIS-1'),
    ('seed.henrique@esteticaflow.local', 'Lavagem completa', 'AGENDADO', FALSE, 0.00, 1, '10:30', 'SEED-AG-HEN-1'),
    ('cliente.demo@esteticadesk.com', 'Lavagem simples', 'CONCLUIDO', TRUE, 0.00, 45, '17:00', 'SEED-AG-DEM-1')
) AS a(email, servico, status, pago, desconto, dias, hora, marcador)
JOIN cliente c ON c.email = a.email
JOIN servico s ON s.empresa_id = c.empresa_id AND s.nome = a.servico
JOIN LATERAL (
    SELECT v2.id
    FROM veiculo v2
    WHERE v2.cliente_id = c.id AND v2.ativo = TRUE
    ORDER BY v2.id
    LIMIT 1
) v ON TRUE
WHERE s.preco > a.desconto
  AND NOT EXISTS (
      SELECT 1 FROM agendamento x
      WHERE x.empresa_id = c.empresa_id AND x.observacoes = a.marcador
  );

INSERT INTO agendamento_servico (empresa_id, agendamento_id, servico_id, preco_unitario)
SELECT a.empresa_id, a.id, s.id, a.subtotal
FROM agendamento a
JOIN (VALUES
    ('SEED-AG-ANA-1', 'Lavagem simples'),
    ('SEED-AG-ANA-2', 'Lavagem completa'),
    ('SEED-AG-BRU-1', 'Lavagem simples'),
    ('SEED-AG-BRU-2', 'Lavagem simples'),
    ('SEED-AG-CAR-1', 'Lavagem completa'),
    ('SEED-AG-DIE-1', 'Polimento técnico'),
    ('SEED-AG-ELE-1', 'Lavagem simples'),
    ('SEED-AG-FAB-1', 'Lavagem simples'),
    ('SEED-AG-GIS-1', 'Vitrificação'),
    ('SEED-AG-HEN-1', 'Lavagem completa'),
    ('SEED-AG-DEM-1', 'Lavagem simples')
) AS m(marcador, servico) ON m.marcador = a.observacoes
JOIN servico s ON s.empresa_id = a.empresa_id AND s.nome = m.servico
WHERE NOT EXISTS (
    SELECT 1 FROM agendamento_servico x WHERE x.agendamento_id = a.id
);

INSERT INTO receita (empresa_id, agendamento_id, forma_pagamento_id, descricao, valor, data_recebimento)
SELECT a.empresa_id, a.id, fp.id,
       'Recebimento ' || a.observacoes,
       a.total,
       a.data_hora::date
FROM agendamento a
JOIN forma_pagamento fp ON fp.empresa_id = a.empresa_id AND fp.nome = 'PIX' AND fp.ativo = TRUE
WHERE a.observacoes LIKE 'SEED-AG-%'
  AND a.pago = TRUE
  AND a.status = 'CONCLUIDO'
  AND NOT EXISTS (
      SELECT 1 FROM receita r WHERE r.agendamento_id = a.id
  );
