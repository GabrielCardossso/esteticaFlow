-- Corrige temas inválidos do seed (sky/violet/amber/rose) e garante teal padrão.
-- Plano Básico sempre usa teal na aplicação; Completo pode personalizar depois.

UPDATE configuracao
SET valor = 'teal',
    data_atualizacao = NOW()
WHERE chave = 'tema.cor'
  AND LOWER(TRIM(valor)) NOT IN (
      'teal', 'verde', 'azul', 'roxo', 'laranja', 'vermelho', 'rosa', 'dourado', 'grafite'
  );

-- Garante que toda empresa tenha tema.cor = teal se ainda não tiver a chave
INSERT INTO configuracao (empresa_id, chave, valor, data_criacao, data_atualizacao)
SELECT e.id, 'tema.cor', 'teal', NOW(), NOW()
FROM empresa e
WHERE NOT EXISTS (
    SELECT 1 FROM configuracao c WHERE c.empresa_id = e.id AND c.chave = 'tema.cor'
);
