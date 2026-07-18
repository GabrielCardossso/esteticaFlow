ALTER TABLE empresa
    ADD COLUMN plano VARCHAR(20) NOT NULL DEFAULT 'BASICO',
    ADD COLUMN status_assinatura VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    ADD COLUMN valor_mensalidade NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN proximo_vencimento DATE,
    ADD COLUMN bloqueio_manual BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN motivo_bloqueio VARCHAR(500),
    ADD COLUMN bloqueado_em TIMESTAMP;

UPDATE empresa
SET status_assinatura = 'ATIVA',
    proximo_vencimento = CURRENT_DATE + 30
WHERE proximo_vencimento IS NULL;

ALTER TABLE empresa
    ALTER COLUMN proximo_vencimento SET NOT NULL,
    ADD CONSTRAINT ck_empresa_plano
        CHECK (plano IN ('BASICO', 'PRO', 'EXCLUSIVE')),
    ADD CONSTRAINT ck_empresa_status_assinatura
        CHECK (status_assinatura IN ('ATIVA', 'EM_ATRASO', 'BLOQUEADA', 'CANCELADA')),
    ADD CONSTRAINT ck_empresa_valor_mensalidade
        CHECK (valor_mensalidade >= 0);

CREATE INDEX idx_empresa_status_assinatura ON empresa (status_assinatura);
CREATE INDEX idx_empresa_proximo_vencimento ON empresa (proximo_vencimento);
