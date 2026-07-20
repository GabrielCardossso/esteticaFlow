-- Produto: preço da embalagem vs custo unitário calculado
ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS quantidade_embalagem NUMERIC(12, 3),
    ADD COLUMN IF NOT EXISTS valor_embalagem NUMERIC(12, 2);

UPDATE produto
SET quantidade_embalagem = 1,
    valor_embalagem = preco_custo
WHERE quantidade_embalagem IS NULL OR valor_embalagem IS NULL;

ALTER TABLE produto
    ALTER COLUMN quantidade_embalagem SET NOT NULL,
    ALTER COLUMN quantidade_embalagem SET DEFAULT 1,
    ALTER COLUMN valor_embalagem SET NOT NULL,
    ALTER COLUMN valor_embalagem SET DEFAULT 0,
    ADD CONSTRAINT ck_produto_quantidade_embalagem CHECK (quantidade_embalagem > 0),
    ADD CONSTRAINT ck_produto_valor_embalagem CHECK (valor_embalagem >= 0);

-- Recalcula custo unitário = valor da embalagem / quantidade da embalagem
UPDATE produto
SET preco_custo = ROUND(valor_embalagem / quantidade_embalagem, 4);

-- Movimentações: motivo, valor financeiro e usuário
ALTER TABLE movimentacao_estoque
    ADD COLUMN IF NOT EXISTS motivo VARCHAR(500),
    ADD COLUMN IF NOT EXISTS valor_financeiro NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS usuario_id BIGINT;

ALTER TABLE movimentacao_estoque
    DROP CONSTRAINT IF EXISTS fk_movimentacao_usuario;

ALTER TABLE movimentacao_estoque
    ADD CONSTRAINT fk_movimentacao_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario (id);

ALTER TABLE movimentacao_estoque
    DROP CONSTRAINT IF EXISTS ck_movimentacao_tipo;

ALTER TABLE movimentacao_estoque
    ADD CONSTRAINT ck_movimentacao_tipo
        CHECK (tipo IN ('ENTRADA', 'SAIDA', 'AJUSTE'));

ALTER TABLE movimentacao_estoque
    DROP CONSTRAINT IF EXISTS ck_movimentacao_valor_financeiro;

ALTER TABLE movimentacao_estoque
    ADD CONSTRAINT ck_movimentacao_valor_financeiro
        CHECK (valor_financeiro IS NULL OR valor_financeiro >= 0);

-- Campos reservados para compras futuras
ALTER TABLE movimentacao_estoque
    ADD COLUMN IF NOT EXISTS local_compra VARCHAR(150),
    ADD COLUMN IF NOT EXISTS numero_nota_fiscal VARCHAR(60),
    ADD COLUMN IF NOT EXISTS data_compra DATE;
