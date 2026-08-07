-- Estoque: todas as quantidades passam a ser persistidas na unidade base
-- (mL, g ou un), sem perder a unidade escolhida pelo usuario na interface.
ALTER TABLE produto ADD COLUMN IF NOT EXISTS unidade_exibicao unidade_medida;
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS unidade_minima unidade_medida;
ALTER TABLE movimentacao_estoque ADD COLUMN IF NOT EXISTS unidade_movimentacao unidade_medida;

UPDATE produto
SET unidade_exibicao = unidade_medida
WHERE unidade_exibicao IS NULL;

UPDATE estoque e
SET unidade_minima = p.unidade_medida
FROM produto p
WHERE p.id = e.produto_id
  AND e.unidade_minima IS NULL;

UPDATE movimentacao_estoque m
SET unidade_movimentacao = p.unidade_medida
FROM produto p
WHERE p.id = m.produto_id
  AND m.unidade_movimentacao IS NULL;

-- Valores historicos em L/KG sao convertidos antes de trocar a unidade base.
UPDATE estoque e
SET quantidade_atual = e.quantidade_atual * 1000,
    quantidade_minima = e.quantidade_minima * 1000
FROM produto p
WHERE p.id = e.produto_id
  AND p.unidade_medida IN ('L', 'KG');

UPDATE movimentacao_estoque m
SET quantidade = m.quantidade * 1000
FROM produto p
WHERE p.id = m.produto_id
  AND p.unidade_medida IN ('L', 'KG');

UPDATE produto
SET quantidade_embalagem = quantidade_embalagem * 1000,
    custo_unitario = custo_unitario / 1000,
    unidade_medida = CASE unidade_medida WHEN 'L' THEN 'ML' WHEN 'KG' THEN 'G' ELSE unidade_medida END
WHERE unidade_medida IN ('L', 'KG');

ALTER TABLE produto ALTER COLUMN unidade_exibicao SET NOT NULL;
ALTER TABLE estoque ALTER COLUMN unidade_minima SET NOT NULL;
ALTER TABLE movimentacao_estoque ALTER COLUMN unidade_movimentacao SET NOT NULL;
ALTER TABLE produto ALTER COLUMN unidade_exibicao SET DEFAULT 'UN';
ALTER TABLE estoque ALTER COLUMN unidade_minima SET DEFAULT 'UN';
ALTER TABLE movimentacao_estoque ALTER COLUMN unidade_movimentacao SET DEFAULT 'UN';
DO $$
BEGIN
  ALTER TABLE produto ADD CONSTRAINT ck_produto_unidade_base CHECK (unidade_medida IN ('UN', 'ML', 'G'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A aplicacao usa conexao de servidor. A Data API publica nao deve ter acesso
-- direto aos dados de empresas; RLS tambem fornece defesa em profundidade.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

ALTER TABLE configuracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacao_alteracao_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE log ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacao_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamento_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE forma_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE receita ENABLE ROW LEVEL SECURITY;
