CREATE TABLE agendamento_servico (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id BIGINT NOT NULL,
    agendamento_id BIGINT NOT NULL,
    servico_id BIGINT NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_agendamento_servico_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_agendamento_servico_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamento (id),
    CONSTRAINT fk_agendamento_servico_servico FOREIGN KEY (servico_id) REFERENCES servico (id),
    CONSTRAINT uq_agendamento_servico UNIQUE (agendamento_id, servico_id),
    CONSTRAINT ck_agendamento_servico_preco CHECK (preco_unitario > 0)
);

ALTER TABLE agendamento
    ADD COLUMN subtotal NUMERIC(10,2),
    ADD COLUMN desconto NUMERIC(10,2),
    ADD COLUMN total NUMERIC(10,2),
    ADD COLUMN pago BOOLEAN;

-- Converte a associação legada de um serviço em uma linha com preço congelado.
INSERT INTO agendamento_servico (empresa_id, agendamento_id, servico_id, preco_unitario)
SELECT a.empresa_id, a.id, a.servico_id, s.preco
FROM agendamento a
JOIN servico s ON s.id = a.servico_id;

UPDATE agendamento a
SET subtotal = s.preco,
    desconto = 0,
    total = s.preco,
    pago = EXISTS (SELECT 1 FROM receita r WHERE r.agendamento_id = a.id)
FROM servico s
WHERE s.id = a.servico_id;

ALTER TABLE agendamento
    ALTER COLUMN subtotal SET NOT NULL,
    ALTER COLUMN desconto SET NOT NULL,
    ALTER COLUMN total SET NOT NULL,
    ALTER COLUMN pago SET NOT NULL,
    ALTER COLUMN subtotal SET DEFAULT 0,
    ALTER COLUMN desconto SET DEFAULT 0,
    ALTER COLUMN total SET DEFAULT 0,
    ALTER COLUMN pago SET DEFAULT FALSE,
    ADD CONSTRAINT ck_agendamento_subtotal CHECK (subtotal > 0),
    ADD CONSTRAINT ck_agendamento_desconto CHECK (desconto >= 0 AND desconto < subtotal),
    ADD CONSTRAINT ck_agendamento_total CHECK (total > 0 AND total = subtotal - desconto);

ALTER TABLE agendamento DROP CONSTRAINT fk_agendamento_servico;
ALTER TABLE agendamento DROP COLUMN servico_id;

CREATE INDEX idx_agendamento_servico_agendamento ON agendamento_servico (agendamento_id);
CREATE INDEX idx_agendamento_servico_servico ON agendamento_servico (servico_id);

-- O domínio permite uma única receita por agendamento. Mantém o primeiro lançamento legado.
DELETE FROM receita
WHERE agendamento_id IS NOT NULL
  AND id NOT IN (
      SELECT MIN(id)
      FROM receita
      WHERE agendamento_id IS NOT NULL
      GROUP BY agendamento_id
  );

CREATE UNIQUE INDEX uq_receita_agendamento
    ON receita (agendamento_id)
    WHERE agendamento_id IS NOT NULL;
