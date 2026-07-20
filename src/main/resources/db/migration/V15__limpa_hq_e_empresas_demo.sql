-- ============================================================================
-- V15: Limpa dados operacionais da EsteticaFlow (HQ) e cria empresas demo
-- Senha de todos os logins tenant: teste123
-- Hash BCrypt: $2a$10$01vYQ83tc4yUq69m6uujN.2zXxOFYHEBzoWAPGNHR9Febgc0Y7AAS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1) Limpa TUDO da empresa HQ (EsteticaFlow / menor id), preservando SUPER_ADMIN
-- --------------------------------------------------------------------------
DO $$
DECLARE
    hq_id BIGINT;
BEGIN
    SELECT id INTO hq_id
    FROM empresa
    WHERE nome_fantasia ILIKE 'EsteticaFlow'
       OR razao_social ILIKE 'EsteticaFlow%'
    ORDER BY id
    LIMIT 1;

    IF hq_id IS NULL THEN
        SELECT MIN(id) INTO hq_id FROM empresa;
    END IF;

    IF hq_id IS NULL THEN
        RAISE NOTICE 'Nenhuma empresa HQ encontrada; pulando limpeza.';
        RETURN;
    END IF;

    DELETE FROM receita WHERE empresa_id = hq_id;
    DELETE FROM despesa WHERE empresa_id = hq_id;
    DELETE FROM movimentacao_estoque WHERE empresa_id = hq_id;
    DELETE FROM item_servico WHERE empresa_id = hq_id;
    DELETE FROM agendamento_servico WHERE empresa_id = hq_id;
    DELETE FROM agendamento WHERE empresa_id = hq_id;
    DELETE FROM estoque WHERE empresa_id = hq_id;
    DELETE FROM produto WHERE empresa_id = hq_id;
    DELETE FROM fornecedor WHERE empresa_id = hq_id;
    DELETE FROM veiculo WHERE empresa_id = hq_id;
    DELETE FROM cliente WHERE empresa_id = hq_id;
    DELETE FROM servico WHERE empresa_id = hq_id;
    DELETE FROM categoria_servico WHERE empresa_id = hq_id;
    DELETE FROM categoria_produto WHERE empresa_id = hq_id;
    DELETE FROM forma_pagamento WHERE empresa_id = hq_id;
    DELETE FROM funcao_extra WHERE empresa_id = hq_id;
    DELETE FROM funcionario WHERE empresa_id = hq_id;
    DELETE FROM log WHERE empresa_id = hq_id;
    DELETE FROM backup WHERE empresa_id = hq_id;
    DELETE FROM configuracao WHERE empresa_id = hq_id AND chave NOT IN ('tema.cor', 'tema.modo');
    DELETE FROM usuario WHERE empresa_id = hq_id AND papel <> 'SUPER_ADMIN';

    UPDATE empresa
    SET nome_fantasia = 'EsteticaFlow',
        razao_social = 'EsteticaFlow Ltda',
        email = 'contato@esteticaflow.com',
        telefone = '48991746960',
        plano = 'COMPLETO',
        status_assinatura = 'ATIVA',
        valor_mensalidade = 0,
        proximo_vencimento = CURRENT_DATE + 365,
        bloqueio_manual = FALSE,
        motivo_bloqueio = NULL,
        bloqueado_em = NULL,
        data_atualizacao = NOW()
    WHERE id = hq_id;

    INSERT INTO configuracao (empresa_id, chave, valor, data_criacao, data_atualizacao)
    SELECT hq_id, cfg.chave, cfg.valor, NOW(), NOW()
    FROM (VALUES ('tema.cor', 'teal'), ('tema.modo', 'sistema')) AS cfg(chave, valor)
    WHERE NOT EXISTS (
        SELECT 1 FROM configuracao c WHERE c.empresa_id = hq_id AND c.chave = cfg.chave
    );
END $$;

-- --------------------------------------------------------------------------
-- 2) Empresas fictícias (idempotente por CNPJ)
-- --------------------------------------------------------------------------
INSERT INTO empresa (
    razao_social, nome_fantasia, cnpj, telefone, email, ativo,
    plano, status_assinatura, valor_mensalidade, proximo_vencimento,
    bloqueio_manual, data_criacao, data_atualizacao
)
SELECT v.razao, v.fantasia, v.cnpj, v.tel, v.email, TRUE,
       v.plano, v.status, v.mensalidade, CURRENT_DATE + v.dias_venc,
       FALSE, NOW(), NOW()
FROM (VALUES
    ('Brilho Auto Estetica Ltda', 'Brilho Auto', '10000001000190', '48991110001',
     'contato@brilhoauto.demo', 'BASICO', 'ATIVA', 59.90, 30),
    ('Crystal Car Care Ltda', 'Crystal Car Care', '10000002000134', '48991110002',
     'contato@crystalcar.demo', 'COMPLETO', 'ATIVA', 119.90, 30),
    ('SpeedWash Express Ltda', 'SpeedWash Express', '10000003000189', '48991110003',
     'contato@speedwash.demo', 'BASICO', 'EM_ATRASO', 59.90, -10),
    ('Premium Detailing SC Ltda', 'Premium Detailing', '10000004000123', '48991110004',
     'contato@premiumdetail.demo', 'COMPLETO', 'ATIVA', 119.90, 45)
) AS v(razao, fantasia, cnpj, tel, email, plano, status, mensalidade, dias_venc)
WHERE NOT EXISTS (SELECT 1 FROM empresa e WHERE e.cnpj = v.cnpj);

-- --------------------------------------------------------------------------
-- 3) Usuários (senha: teste123)
-- --------------------------------------------------------------------------
INSERT INTO usuario (empresa_id, nome, email, senha_hash, papel, ativo, data_criacao, data_atualizacao)
SELECT e.id, u.nome, u.email,
       '$2a$10$01vYQ83tc4yUq69m6uujN.2zXxOFYHEBzoWAPGNHR9Febgc0Y7AAS',
       u.papel, TRUE, NOW(), NOW()
FROM (VALUES
    ('10000001000190', 'Admin Brilho', 'admin@brilhoauto.demo', 'ADMINISTRADOR'),
    ('10000001000190', 'Funcionario Brilho', 'func@brilhoauto.demo', 'FUNCIONARIO'),
    ('10000002000134', 'Admin Crystal', 'admin@crystalcar.demo', 'ADMINISTRADOR'),
    ('10000002000134', 'Funcionario Crystal', 'func@crystalcar.demo', 'FUNCIONARIO'),
    ('10000003000189', 'Admin SpeedWash', 'admin@speedwash.demo', 'ADMINISTRADOR'),
    ('10000004000123', 'Admin Premium', 'admin@premiumdetail.demo', 'ADMINISTRADOR'),
    ('10000004000123', 'Funcionario Premium', 'func@premiumdetail.demo', 'FUNCIONARIO'),
    ('10000004000123', 'Atendente Premium', 'atendente@premiumdetail.demo', 'FUNCIONARIO')
) AS u(cnpj, nome, email, papel)
JOIN empresa e ON e.cnpj = u.cnpj
ON CONFLICT (email) DO UPDATE
SET senha_hash = EXCLUDED.senha_hash,
    nome = EXCLUDED.nome,
    papel = EXCLUDED.papel,
    ativo = TRUE,
    empresa_id = EXCLUDED.empresa_id,
    data_atualizacao = NOW();

-- Funcionários vinculados (para agenda)
INSERT INTO funcionario (empresa_id, usuario_id, cpf, data_admissao, comissao_percentual, ativo, data_criacao, data_atualizacao)
SELECT u.empresa_id, u.id, f.cpf, CURRENT_DATE - 120, 10.00, TRUE, NOW(), NOW()
FROM (VALUES
    ('func@brilhoauto.demo', '39053344705'),
    ('func@crystalcar.demo', '15350946056'),
    ('func@premiumdetail.demo', '71428793860'),
    ('atendente@premiumdetail.demo', '11144477735')
) AS f(email, cpf)
JOIN usuario u ON u.email = f.email
WHERE NOT EXISTS (SELECT 1 FROM funcionario x WHERE x.usuario_id = u.id);

-- --------------------------------------------------------------------------
-- 4) Catálogo base por empresa (formas, categorias, serviços)
-- --------------------------------------------------------------------------
INSERT INTO forma_pagamento (empresa_id, nome, ativo)
SELECT e.id, f.nome, TRUE
FROM empresa e
CROSS JOIN (VALUES ('Dinheiro'), ('PIX'), ('Cartão de crédito'), ('Cartão de débito')) AS f(nome)
WHERE e.cnpj IN ('10000001000190', '10000002000134', '10000003000189', '10000004000123')
  AND NOT EXISTS (
      SELECT 1 FROM forma_pagamento fp WHERE fp.empresa_id = e.id AND fp.nome = f.nome
  );

INSERT INTO categoria_servico (empresa_id, nome, ativo, data_criacao, data_atualizacao)
SELECT e.id, c.nome, TRUE, NOW(), NOW()
FROM empresa e
CROSS JOIN (VALUES ('Lavagem'), ('Polimento'), ('Proteção')) AS c(nome)
WHERE e.cnpj IN ('10000001000190', '10000002000134', '10000003000189', '10000004000123')
  AND NOT EXISTS (
      SELECT 1 FROM categoria_servico cs WHERE cs.empresa_id = e.id AND cs.nome = c.nome
  );

INSERT INTO servico (
    empresa_id, categoria_servico_id, nome, descricao, preco,
    tempo_estimado_minutos, ativo, data_criacao, data_atualizacao
)
SELECT e.id, cs.id, s.nome, s.descricao, s.preco, s.tempo, TRUE, NOW(), NOW()
FROM empresa e
CROSS JOIN (VALUES
    ('Lavagem', 'Lavagem simples', 'Lavagem externa', 80.00, 60),
    ('Lavagem', 'Lavagem completa', 'Externa + interna', 150.00, 120),
    ('Polimento', 'Polimento técnico', 'Correção de pintura', 450.00, 240),
    ('Proteção', 'Vitrificação', 'Proteção cerâmica', 900.00, 300)
) AS s(categoria, nome, descricao, preco, tempo)
JOIN categoria_servico cs ON cs.empresa_id = e.id AND cs.nome = s.categoria
WHERE e.cnpj IN ('10000001000190', '10000002000134', '10000003000189', '10000004000123')
  AND NOT EXISTS (
      SELECT 1 FROM servico x WHERE x.empresa_id = e.id AND x.nome = s.nome
  );

INSERT INTO configuracao (empresa_id, chave, valor, data_criacao, data_atualizacao)
SELECT e.id, 'tema.cor',
       CASE e.cnpj
           WHEN '10000001000190' THEN 'sky'
           WHEN '10000002000134' THEN 'violet'
           WHEN '10000003000189' THEN 'amber'
           ELSE 'rose'
       END,
       NOW(), NOW()
FROM empresa e
WHERE e.cnpj IN ('10000001000190', '10000002000134', '10000003000189', '10000004000123')
  AND NOT EXISTS (
      SELECT 1 FROM configuracao c WHERE c.empresa_id = e.id AND c.chave = 'tema.cor'
  );

-- --------------------------------------------------------------------------
-- 5) Clientes + veículos (marcador e-mail @*.demo)
-- --------------------------------------------------------------------------
INSERT INTO cliente (
    empresa_id, nome, cpf_cnpj, telefone, email, ativo,
    cep, logradouro, numero, bairro, cidade, uf, data_criacao, data_atualizacao
)
SELECT e.id, c.nome, c.cpf, c.tel, c.email, TRUE,
       c.cep, c.rua, c.numero, c.bairro, c.cidade, c.uf, NOW(), NOW()
FROM (VALUES
    -- Brilho Auto (BASICO)
    ('10000001000190', 'João Pereira', '23456789092', '48992001001', 'joao@brilhoauto.demo',
     '88010000', 'Rua Felipe Schmidt', '100', 'Centro', 'Florianópolis', 'SC'),
    ('10000001000190', 'Marina Souza', '34567890175', '48992001002', 'marina@brilhoauto.demo',
     '88015070', 'Av. Beira Mar Norte', '500', 'Centro', 'Florianópolis', 'SC'),
    ('10000001000190', 'Pedro Santos', '45678901249', '48992001003', 'pedro@brilhoauto.demo',
     '88101000', 'Rua João Pessoa', '80', 'Centro', 'São José', 'SC'),
    -- Crystal (COMPLETO)
    ('10000002000134', 'Lucia Fernandes', '56789012303', '48992002001', 'lucia@crystalcar.demo',
     '88020000', 'Rua Trajano', '45', 'Centro', 'Florianópolis', 'SC'),
    ('10000002000134', 'Rafael Gomes', '67890123460', '48992002002', 'rafael@crystalcar.demo',
     '88036000', 'Rua Mauro Ramos', '300', 'Centro', 'Florianópolis', 'SC'),
    ('10000002000134', 'Beatriz Lima', '78901234533', '48992002003', 'beatriz@crystalcar.demo',
     '88025100', 'Rua Bocaiúva', '1200', 'Centro', 'Florianópolis', 'SC'),
    ('10000002000134', 'Carlos Nogueira', '89012345607', '48992002004', 'carlos@crystalcar.demo',
     '88113000', 'Rua Otto Feuerschuette', '12', 'Kobrasol', 'São José', 'SC'),
    -- SpeedWash (BASICO / EM_ATRASO)
    ('10000003000189', 'Tiago Ribeiro', '90123456780', '48992003001', 'tiago@speedwash.demo',
     '88060400', 'Rod. José Carlos Daux', '1000', 'Saco Grande', 'Florianópolis', 'SC'),
    ('10000003000189', 'Amanda Vieira', '01234567890', '48992003002', 'amanda@speedwash.demo',
     '88010000', 'Rua Conselheiro Mafra', '50', 'Centro', 'Florianópolis', 'SC'),
    -- Premium (COMPLETO)
    ('10000004000123', 'Fernanda Dias', '10987654321', '48992004001', 'fernanda@premiumdetail.demo',
     '88015070', 'Av. Beira Mar Norte', '2200', 'Centro', 'Florianópolis', 'SC'),
    ('10000004000123', 'Gustavo Melo', '21987654320', '48992004002', 'gustavo@premiumdetail.demo',
     '88020000', 'Rua Deodoro', '77', 'Centro', 'Florianópolis', 'SC'),
    ('10000004000123', 'Helena Castro', '32987654329', '48992004003', 'helena@premiumdetail.demo',
     '88101000', 'Av. Adolphe Konder', '400', 'Centro', 'São José', 'SC'),
    ('10000004000123', 'Igor Barbosa', '43987654328', '48992004004', 'igor@premiumdetail.demo',
     '88036000', 'Rua Esteves Júnior', '90', 'Centro', 'Florianópolis', 'SC'),
    ('10000004000123', 'Julia Prado', '54987654327', '48992004005', 'julia@premiumdetail.demo',
     '88025100', 'Rua Silva Jardim', '15', 'Centro', 'Florianópolis', 'SC')
) AS c(cnpj, nome, cpf, tel, email, cep, rua, numero, bairro, cidade, uf)
JOIN empresa e ON e.cnpj = c.cnpj
WHERE NOT EXISTS (
    SELECT 1 FROM cliente x WHERE x.empresa_id = e.id AND x.email = c.email
);

INSERT INTO veiculo (empresa_id, cliente_id, placa, modelo, marca, cor, ano, ativo, data_criacao, data_atualizacao)
SELECT c.empresa_id, c.id, v.placa, v.modelo, v.marca, v.cor, v.ano, TRUE, NOW(), NOW()
FROM (VALUES
    ('joao@brilhoauto.demo', 'BRI0A01', 'Onix', 'Chevrolet', 'Prata', 2021),
    ('marina@brilhoauto.demo', 'BRI0B01', 'HB20', 'Hyundai', 'Branco', 2020),
    ('pedro@brilhoauto.demo', 'BRI0C01', 'Gol', 'Volkswagen', 'Vermelho', 2018),
    ('lucia@crystalcar.demo', 'CRY0A01', 'Corolla', 'Toyota', 'Preto', 2022),
    ('lucia@crystalcar.demo', 'CRY0A02', 'SW4', 'Toyota', 'Branco', 2023),
    ('rafael@crystalcar.demo', 'CRY0B01', 'Compass', 'Jeep', 'Cinza', 2021),
    ('beatriz@crystalcar.demo', 'CRY0C01', 'Polo', 'Volkswagen', 'Azul', 2019),
    ('carlos@crystalcar.demo', 'CRY0D01', 'Civic', 'Honda', 'Preto', 2024),
    ('tiago@speedwash.demo', 'SPD0A01', 'Ka', 'Ford', 'Prata', 2017),
    ('amanda@speedwash.demo', 'SPD0B01', 'Kwid', 'Renault', 'Branco', 2020),
    ('fernanda@premiumdetail.demo', 'PRM0A01', 'Tracker', 'Chevrolet', 'Cinza', 2023),
    ('gustavo@premiumdetail.demo', 'PRM0B01', 'Ranger', 'Ford', 'Preto', 2022),
    ('helena@premiumdetail.demo', 'PRM0C01', 'Kicks', 'Nissan', 'Branco', 2021),
    ('igor@premiumdetail.demo', 'PRM0D01', 'T-Cross', 'Volkswagen', 'Azul', 2020),
    ('julia@premiumdetail.demo', 'PRM0E01', 'Creta', 'Hyundai', 'Prata', 2024)
) AS v(email, placa, modelo, marca, cor, ano)
JOIN cliente c ON c.email = v.email
WHERE NOT EXISTS (
    SELECT 1 FROM veiculo x WHERE x.empresa_id = c.empresa_id AND x.placa = v.placa
);

-- --------------------------------------------------------------------------
-- 6) Estoque completo (somente planos COMPLETO)
-- --------------------------------------------------------------------------
INSERT INTO categoria_produto (empresa_id, nome, ativo, data_criacao, data_atualizacao)
SELECT e.id, c.nome, TRUE, NOW(), NOW()
FROM empresa e
CROSS JOIN (VALUES ('Químicos'), ('Acessórios'), ('Equipamentos')) AS c(nome)
WHERE e.cnpj IN ('10000002000134', '10000004000123')
  AND NOT EXISTS (
      SELECT 1 FROM categoria_produto cp WHERE cp.empresa_id = e.id AND cp.nome = c.nome
  );

INSERT INTO produto (
    empresa_id, categoria_produto_id, nome, unidade_medida, preco_custo,
    quantidade_embalagem, valor_embalagem, ativo, data_criacao, data_atualizacao
)
SELECT e.id, cp.id, p.nome, p.unidade,
       ROUND(p.valor_emb / p.qtd_emb, 4),
       p.qtd_emb, p.valor_emb, TRUE, NOW(), NOW()
FROM empresa e
CROSS JOIN (VALUES
    ('Químicos', 'Shampoo automotivo', 'ML', 2000.000, 50.00),
    ('Químicos', 'Cera premium', 'UN', 1.000, 48.00),
    ('Químicos', 'Desengraxante', 'L', 5.000, 65.00),
    ('Acessórios', 'Microfibra', 'UN', 1.000, 12.00),
    ('Equipamentos', 'Politriz orbital', 'UN', 1.000, 890.00)
) AS p(categoria, nome, unidade, qtd_emb, valor_emb)
JOIN categoria_produto cp ON cp.empresa_id = e.id AND cp.nome = p.categoria
WHERE e.cnpj IN ('10000002000134', '10000004000123')
  AND NOT EXISTS (
      SELECT 1 FROM produto x WHERE x.empresa_id = e.id AND x.nome = p.nome
  );

INSERT INTO estoque (empresa_id, produto_id, quantidade_atual, quantidade_minima)
SELECT p.empresa_id, p.id, s.qtd, s.minimo
FROM (VALUES
    ('Shampoo automotivo', 4000.000, 1000.000),
    ('Cera premium', 6.000, 10.000),
    ('Desengraxante', 12.000, 5.000),
    ('Microfibra', 35.000, 15.000),
    ('Politriz orbital', 2.000, 1.000)
) AS s(nome, qtd, minimo)
JOIN produto p ON p.nome = s.nome
JOIN empresa e ON e.id = p.empresa_id AND e.cnpj IN ('10000002000134', '10000004000123')
WHERE NOT EXISTS (SELECT 1 FROM estoque es WHERE es.produto_id = p.id);

INSERT INTO despesa (empresa_id, descricao, categoria, valor, data_pagamento)
SELECT e.id, d.descricao, d.categoria, d.valor, CURRENT_DATE - d.dias
FROM empresa e
CROSS JOIN (VALUES
    ('Aluguel da unidade', 'FIXA', 3200.00, 5),
    ('Energia elétrica', 'VARIAVEL', 510.00, 3),
    ('Compra de insumos', 'FORNECEDOR', 780.00, 1),
    ('Marketing digital', 'VARIAVEL', 250.00, 8)
) AS d(descricao, categoria, valor, dias)
WHERE e.cnpj IN ('10000002000134', '10000004000123')
  AND NOT EXISTS (
      SELECT 1 FROM despesa x WHERE x.empresa_id = e.id AND x.descricao = d.descricao
  );

-- --------------------------------------------------------------------------
-- 7) Agendamentos + serviços + receitas
-- --------------------------------------------------------------------------
INSERT INTO agendamento (
    empresa_id, cliente_id, veiculo_id, funcionario_id, data_hora, status, observacoes,
    subtotal, desconto, total, pago, data_criacao, data_atualizacao
)
SELECT
    c.empresa_id,
    c.id,
    v.id,
    f.id,
    ((CURRENT_DATE - a.dias) + a.hora::time),
    a.status,
    a.marcador,
    s.preco,
    a.desconto,
    s.preco - a.desconto,
    a.pago,
    NOW(),
    NOW()
FROM (VALUES
    ('joao@brilhoauto.demo', 'Lavagem simples', 'CONCLUIDO', TRUE, 0.00, 12, '09:00', 'DEMO-BRI-JOA-1', 'func@brilhoauto.demo'),
    ('marina@brilhoauto.demo', 'Lavagem completa', 'AGENDADO', FALSE, 0.00, 0, '14:00', 'DEMO-BRI-MAR-1', 'func@brilhoauto.demo'),
    ('pedro@brilhoauto.demo', 'Lavagem simples', 'CONCLUIDO', TRUE, 10.00, 3, '11:00', 'DEMO-BRI-PED-1', 'func@brilhoauto.demo'),
    ('lucia@crystalcar.demo', 'Vitrificação', 'CONCLUIDO', TRUE, 50.00, 10, '09:30', 'DEMO-CRY-LUC-1', 'func@crystalcar.demo'),
    ('rafael@crystalcar.demo', 'Polimento técnico', 'EM_ANDAMENTO', FALSE, 0.00, 0, '13:00', 'DEMO-CRY-RAF-1', 'func@crystalcar.demo'),
    ('beatriz@crystalcar.demo', 'Lavagem completa', 'CONCLUIDO', TRUE, 0.00, 5, '10:00', 'DEMO-CRY-BEA-1', 'func@crystalcar.demo'),
    ('carlos@crystalcar.demo', 'Lavagem simples', 'AGENDADO', FALSE, 0.00, -1, '16:00', 'DEMO-CRY-CAR-1', 'func@crystalcar.demo'),
    ('tiago@speedwash.demo', 'Lavagem simples', 'CONCLUIDO', TRUE, 0.00, 7, '08:30', 'DEMO-SPD-TIA-1', NULL),
    ('amanda@speedwash.demo', 'Lavagem completa', 'AGENDADO', FALSE, 0.00, 0, '15:00', 'DEMO-SPD-AMA-1', NULL),
    ('fernanda@premiumdetail.demo', 'Vitrificação', 'CONCLUIDO', TRUE, 100.00, 15, '09:00', 'DEMO-PRM-FER-1', 'func@premiumdetail.demo'),
    ('gustavo@premiumdetail.demo', 'Polimento técnico', 'CONCLUIDO', TRUE, 0.00, 8, '10:30', 'DEMO-PRM-GUS-1', 'func@premiumdetail.demo'),
    ('helena@premiumdetail.demo', 'Lavagem completa', 'EM_ANDAMENTO', FALSE, 20.00, 0, '14:00', 'DEMO-PRM-HEL-1', 'atendente@premiumdetail.demo'),
    ('igor@premiumdetail.demo', 'Lavagem simples', 'AGENDADO', FALSE, 0.00, -1, '11:00', 'DEMO-PRM-IGO-1', 'func@premiumdetail.demo'),
    ('julia@premiumdetail.demo', 'Lavagem simples', 'CANCELADO', FALSE, 0.00, 2, '17:00', 'DEMO-PRM-JUL-1', 'atendente@premiumdetail.demo')
) AS a(email, servico, status, pago, desconto, dias, hora, marcador, func_email)
JOIN cliente c ON c.email = a.email
JOIN servico s ON s.empresa_id = c.empresa_id AND s.nome = a.servico
JOIN LATERAL (
    SELECT v2.id FROM veiculo v2
    WHERE v2.cliente_id = c.id AND v2.ativo = TRUE
    ORDER BY v2.id LIMIT 1
) v ON TRUE
LEFT JOIN usuario uf ON uf.email = a.func_email
LEFT JOIN funcionario f ON f.usuario_id = uf.id
WHERE s.preco > a.desconto
  AND NOT EXISTS (
      SELECT 1 FROM agendamento x
      WHERE x.empresa_id = c.empresa_id AND x.observacoes = a.marcador
  );

INSERT INTO agendamento_servico (empresa_id, agendamento_id, servico_id, preco_unitario)
SELECT a.empresa_id, a.id, s.id, a.subtotal
FROM agendamento a
JOIN servico s ON s.empresa_id = a.empresa_id
JOIN (VALUES
    ('DEMO-BRI-JOA-1', 'Lavagem simples'),
    ('DEMO-BRI-MAR-1', 'Lavagem completa'),
    ('DEMO-BRI-PED-1', 'Lavagem simples'),
    ('DEMO-CRY-LUC-1', 'Vitrificação'),
    ('DEMO-CRY-RAF-1', 'Polimento técnico'),
    ('DEMO-CRY-BEA-1', 'Lavagem completa'),
    ('DEMO-CRY-CAR-1', 'Lavagem simples'),
    ('DEMO-SPD-TIA-1', 'Lavagem simples'),
    ('DEMO-SPD-AMA-1', 'Lavagem completa'),
    ('DEMO-PRM-FER-1', 'Vitrificação'),
    ('DEMO-PRM-GUS-1', 'Polimento técnico'),
    ('DEMO-PRM-HEL-1', 'Lavagem completa'),
    ('DEMO-PRM-IGO-1', 'Lavagem simples'),
    ('DEMO-PRM-JUL-1', 'Lavagem simples')
) AS m(marcador, servico) ON m.marcador = a.observacoes AND s.nome = m.servico
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
WHERE a.observacoes LIKE 'DEMO-%'
  AND a.pago = TRUE
  AND a.status = 'CONCLUIDO'
  AND NOT EXISTS (
      SELECT 1 FROM receita r WHERE r.agendamento_id = a.id
  );
