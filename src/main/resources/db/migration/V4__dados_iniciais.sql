-- ============================================================================
-- Dados iniciais para ambiente web (idempotente)
-- Usuario padrao: admin@esteticadesk.com / admin123
-- ============================================================================

-- Empresa demo (somente se ainda nao existir nenhuma)
INSERT INTO empresa (razao_social, nome_fantasia, cnpj, telefone, email, ativo)
SELECT
    'EsteticaDesk Demo Ltda',
    'EsteticaDesk Demo',
    '11.222.333/0001-81',
    '(11) 4000-0000',
    'contato@esteticadesk.com',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM empresa);

-- Usuario administrador padrao
INSERT INTO usuario (empresa_id, nome, email, senha_hash, papel, ativo)
SELECT
    e.id,
    'Administrador',
    'admin@esteticadesk.com',
    -- BCrypt de "admin123" (placeholders do Flyway desabilitados na app)
    '$2a$10$QLyAULb8o0wtdOQvc0GPPe5njch.zUxaS8l8QB3T1AhYJfk..zXry',
    'ADMINISTRADOR',
    TRUE
FROM empresa e
ORDER BY e.id
LIMIT 1
ON CONFLICT (email) DO NOTHING;

-- Formas de pagamento basicas
INSERT INTO forma_pagamento (empresa_id, nome, ativo)
SELECT e.id, f.nome, TRUE
FROM empresa e
CROSS JOIN (VALUES ('Dinheiro'), ('PIX'), ('Cartão de crédito'), ('Cartão de débito')) AS f(nome)
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM forma_pagamento fp
      WHERE fp.empresa_id = e.id AND fp.nome = f.nome
  );

-- Categorias de produto
INSERT INTO categoria_produto (empresa_id, nome, ativo, data_criacao, data_atualizacao)
SELECT e.id, c.nome, TRUE, NOW(), NOW()
FROM empresa e
CROSS JOIN (VALUES ('Químicos'), ('Acessórios'), ('Equipamentos')) AS c(nome)
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM categoria_produto cp
      WHERE cp.empresa_id = e.id AND cp.nome = c.nome
  );

-- Categorias de serviço
INSERT INTO categoria_servico (empresa_id, nome, ativo, data_criacao, data_atualizacao)
SELECT e.id, c.nome, TRUE, NOW(), NOW()
FROM empresa e
CROSS JOIN (VALUES ('Lavagem'), ('Polimento'), ('Proteção')) AS c(nome)
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM categoria_servico cs
      WHERE cs.empresa_id = e.id AND cs.nome = c.nome
  );

-- Serviços iniciais
INSERT INTO servico (
    empresa_id, categoria_servico_id, nome, descricao, preco,
    tempo_estimado_minutos, ativo
)
SELECT
    e.id,
    cs.id,
    s.nome,
    s.descricao,
    s.preco,
    s.tempo_minutos,
    TRUE
FROM empresa e
CROSS JOIN (VALUES
    ('Lavagem', 'Lavagem simples', 'Lavagem externa completa', 80.00, 60),
    ('Lavagem', 'Lavagem completa', 'Lavagem interna e externa', 150.00, 120),
    ('Polimento', 'Polimento técnico', 'Correção de pintura leve', 450.00, 240),
    ('Proteção', 'Vitrificação', 'Proteção cerâmica', 1200.00, 360)
) AS s(categoria, nome, descricao, preco, tempo_minutos)
JOIN categoria_servico cs ON cs.empresa_id = e.id AND cs.nome = s.categoria
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM servico sv
      WHERE sv.empresa_id = e.id AND sv.nome = s.nome
  );

-- Cliente de exemplo
INSERT INTO cliente (empresa_id, nome, cpf_cnpj, telefone, email, ativo)
SELECT
    e.id,
    'Cliente Demonstração',
    '123.456.789-09',
    '(11) 99999-0000',
    'cliente.demo@esteticadesk.com',
    TRUE
FROM empresa e
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM cliente c
      WHERE c.empresa_id = e.id AND c.email = 'cliente.demo@esteticadesk.com'
  );

-- Veículo do cliente demo
INSERT INTO veiculo (empresa_id, cliente_id, placa, modelo, marca, cor, ano, ativo)
SELECT
    c.empresa_id,
    c.id,
    'ABC1D23',
    'Civic',
    'Honda',
    'Preto',
    2022,
    TRUE
FROM cliente c
WHERE c.email = 'cliente.demo@esteticadesk.com'
  AND NOT EXISTS (
      SELECT 1 FROM veiculo v
      WHERE v.empresa_id = c.empresa_id AND v.placa = 'ABC1D23'
  );

-- Produto + estoque de exemplo
INSERT INTO produto (
    empresa_id, categoria_produto_id, nome, unidade_medida, preco_custo, ativo
)
SELECT
    e.id,
    cp.id,
    'Shampoo automotivo',
    'ML',
    35.00,
    TRUE
FROM empresa e
JOIN categoria_produto cp ON cp.empresa_id = e.id AND cp.nome = 'Químicos'
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM produto p
      WHERE p.empresa_id = e.id AND p.nome = 'Shampoo automotivo'
  );

INSERT INTO estoque (empresa_id, produto_id, quantidade_atual, quantidade_minima)
SELECT
    p.empresa_id,
    p.id,
    50.000,
    10.000
FROM produto p
WHERE p.nome = 'Shampoo automotivo'
  AND NOT EXISTS (
      SELECT 1 FROM estoque es WHERE es.produto_id = p.id
  );

-- Configurações padrão
INSERT INTO configuracao (empresa_id, chave, valor, data_criacao, data_atualizacao)
SELECT e.id, cfg.chave, cfg.valor, NOW(), NOW()
FROM empresa e
CROSS JOIN (VALUES
    ('backup.automatico', 'true'),
    ('estoque.alerta_ativo', 'true')
) AS cfg(chave, valor)
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM configuracao c
      WHERE c.empresa_id = e.id AND c.chave = cfg.chave
  );
