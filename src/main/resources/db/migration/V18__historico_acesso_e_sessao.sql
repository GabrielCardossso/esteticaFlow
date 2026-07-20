-- Histórico de acessos (login) e suporte a UX de sessão

CREATE TABLE historico_acesso (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT       NOT NULL,
    usuario_id          BIGINT       NOT NULL,
    data_hora           TIMESTAMP    NOT NULL DEFAULT NOW(),
    ip                  VARCHAR(64),
    user_agent          VARCHAR(500),
    navegador           VARCHAR(80),
    sistema_operacional VARCHAR(80),
    data_criacao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    data_atualizacao    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_hist_acesso_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_hist_acesso_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
);

CREATE INDEX ix_hist_acesso_empresa_data ON historico_acesso (empresa_id, data_hora DESC);
CREATE INDEX ix_hist_acesso_usuario_data ON historico_acesso (usuario_id, data_hora DESC);

-- Defaults de sessão por inatividade (desativado) para empresas existentes
INSERT INTO configuracao (empresa_id, chave, valor, data_criacao, data_atualizacao)
SELECT e.id, 'sessao.inatividade.ativa', 'false', NOW(), NOW()
FROM empresa e
WHERE NOT EXISTS (
    SELECT 1 FROM configuracao c WHERE c.empresa_id = e.id AND c.chave = 'sessao.inatividade.ativa'
);

INSERT INTO configuracao (empresa_id, chave, valor, data_criacao, data_atualizacao)
SELECT e.id, 'sessao.inatividade.minutos', '30', NOW(), NOW()
FROM empresa e
WHERE NOT EXISTS (
    SELECT 1 FROM configuracao c WHERE c.empresa_id = e.id AND c.chave = 'sessao.inatividade.minutos'
);
