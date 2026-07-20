-- Notificações (tenant + Super Admin) e solicitações de alteração de empresa

CREATE TABLE notificacao (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT,
    usuario_id          BIGINT,
    tipo                VARCHAR(40)  NOT NULL,
    titulo              VARCHAR(150) NOT NULL,
    mensagem            VARCHAR(1000) NOT NULL,
    lida                BOOLEAN      NOT NULL DEFAULT FALSE,
    data_criacao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    data_atualizacao    TIMESTAMP    NOT NULL DEFAULT NOW(),
    referencia_tipo     VARCHAR(40),
    referencia_id       BIGINT,
    acao_url            VARCHAR(255),
    CONSTRAINT fk_notificacao_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_notificacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id),
    CONSTRAINT ck_notificacao_tipo CHECK (tipo IN (
        'ESTOQUE_BAIXO', 'CLIENTE_INATIVO', 'ASSINATURA', 'SOLICITACAO_EMPRESA',
        'SOLICITACAO_DECISAO', 'SISTEMA'
    ))
);

CREATE INDEX ix_notificacao_empresa_lida ON notificacao (empresa_id, lida, data_criacao DESC);
CREATE INDEX ix_notificacao_sa ON notificacao (tipo, lida, data_criacao DESC)
    WHERE empresa_id IS NULL;
CREATE INDEX ix_notificacao_ref ON notificacao (empresa_id, tipo, referencia_tipo, referencia_id);

CREATE TABLE solicitacao_alteracao_empresa (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT       NOT NULL,
    razao_social        VARCHAR(150) NOT NULL,
    nome_fantasia       VARCHAR(150) NOT NULL,
    cnpj                VARCHAR(18)  NOT NULL,
    telefone            VARCHAR(20),
    email               VARCHAR(150),
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDENTE',
    solicitado_por      BIGINT       NOT NULL,
    decidido_por        BIGINT,
    motivo              VARCHAR(500),
    data_criacao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    data_atualizacao    TIMESTAMP    NOT NULL DEFAULT NOW(),
    data_decisao        TIMESTAMP,
    CONSTRAINT fk_sol_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_sol_solicitante FOREIGN KEY (solicitado_por) REFERENCES usuario (id),
    CONSTRAINT fk_sol_decisor FOREIGN KEY (decidido_por) REFERENCES usuario (id),
    CONSTRAINT ck_sol_status CHECK (status IN ('PENDENTE', 'APROVADA', 'REJEITADA'))
);

CREATE INDEX ix_sol_empresa_status ON solicitacao_alteracao_empresa (empresa_id, status);
CREATE UNIQUE INDEX uq_sol_pendente_empresa ON solicitacao_alteracao_empresa (empresa_id)
    WHERE status = 'PENDENTE';
