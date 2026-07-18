-- EsteticaFlow: papel SUPER_ADMIN, conta principal e rebranding

ALTER TABLE usuario DROP CONSTRAINT IF EXISTS ck_usuario_papel;
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_papel
    CHECK (papel IN ('SUPER_ADMIN', 'ADMINISTRADOR', 'FUNCIONARIO'));

-- Atualiza marca da empresa principal (se existir)
UPDATE empresa
SET nome_fantasia = 'EsteticaFlow',
    razao_social = CASE
        WHEN razao_social ILIKE '%esteticadesk%' OR razao_social ILIKE '%demo%'
            THEN 'EsteticaFlow Ltda'
        ELSE razao_social
    END,
    email = COALESCE(NULLIF(email, ''), 'contato@esteticaflow.com'),
    data_atualizacao = NOW()
WHERE id = (SELECT MIN(id) FROM empresa);

-- Garante conta principal do sistema
INSERT INTO usuario (empresa_id, nome, email, senha_hash, papel, ativo)
SELECT
    e.id,
    'Gabriel Cardoso',
    'gabrielcardossso@gmail.com',
    '$2a$10$pPjSnw9f1AwO4iNorMkYquWvn7EjVPBLmKgW3Fb5BfYFskGWSkFsK',
    'SUPER_ADMIN',
    TRUE
FROM empresa e
ORDER BY e.id
LIMIT 1
ON CONFLICT (email) DO UPDATE
SET
    nome = EXCLUDED.nome,
    senha_hash = EXCLUDED.senha_hash,
    papel = 'SUPER_ADMIN',
    ativo = TRUE,
    data_atualizacao = NOW();

-- Tema padrão da empresa
INSERT INTO configuracao (empresa_id, chave, valor, data_criacao, data_atualizacao)
SELECT e.id, cfg.chave, cfg.valor, NOW(), NOW()
FROM empresa e
CROSS JOIN (VALUES
    ('tema.modo', 'sistema'),
    ('tema.cor', 'teal')
) AS cfg(chave, valor)
WHERE e.id = (SELECT MIN(id) FROM empresa)
  AND NOT EXISTS (
      SELECT 1 FROM configuracao c
      WHERE c.empresa_id = e.id AND c.chave = cfg.chave
  );
