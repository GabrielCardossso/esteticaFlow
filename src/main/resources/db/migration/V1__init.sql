-- ============================================================================
-- EsteticaDesk - Script de criacao inicial do banco de dados
-- Migracao Flyway: V1__init.sql
-- Referencia: Capitulo 7 - Modelagem Completa do Banco de Dados
-- ============================================================================


-- ============================================================================
-- 1. EMPRESA (raiz do modelo multiempresa - Cap. 1 e 7)
-- ============================================================================
CREATE TABLE empresa (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    razao_social        VARCHAR(150)    NOT NULL,
    nome_fantasia       VARCHAR(150)    NOT NULL,
    cnpj                VARCHAR(18)     NOT NULL,
    telefone            VARCHAR(20),
    email               VARCHAR(150),
    ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
    data_criacao        TIMESTAMP       NOT NULL DEFAULT NOW(),
    data_atualizacao    TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_empresa_cnpj UNIQUE (cnpj)
);


-- ============================================================================
-- 2. USUARIO
-- ============================================================================
CREATE TABLE usuario (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    nome                VARCHAR(150)    NOT NULL,
    email               VARCHAR(150)    NOT NULL,
    senha_hash          VARCHAR(255)    NOT NULL,
    papel               VARCHAR(20)     NOT NULL,
    ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
    data_criacao        TIMESTAMP       NOT NULL DEFAULT NOW(),
    data_atualizacao    TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_usuario_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT uq_usuario_email UNIQUE (email),
    CONSTRAINT ck_usuario_papel CHECK (papel IN ('ADMINISTRADOR', 'FUNCIONARIO'))
);


-- ============================================================================
-- 3. FUNCIONARIO
-- ============================================================================
CREATE TABLE funcionario (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id              BIGINT          NOT NULL,
    usuario_id              BIGINT          NOT NULL,
    cpf                     VARCHAR(14)     NOT NULL,
    data_admissao           DATE            NOT NULL,
    comissao_percentual     NUMERIC(5,2),
    ativo                   BOOLEAN         NOT NULL DEFAULT TRUE,
    data_criacao            TIMESTAMP       NOT NULL DEFAULT NOW(),
    data_atualizacao        TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_funcionario_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_funcionario_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id),
    CONSTRAINT uq_funcionario_usuario UNIQUE (usuario_id),
    CONSTRAINT uq_funcionario_cpf_empresa UNIQUE (empresa_id, cpf)
);


-- ============================================================================
-- 4. FUNCAO_EXTRA
-- ============================================================================
CREATE TABLE funcao_extra (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    funcionario_id      BIGINT          NOT NULL,
    descricao           VARCHAR(150)    NOT NULL,
    valor               NUMERIC(10,2)   NOT NULL,
    data_referencia     DATE            NOT NULL,
    data_criacao        TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_funcao_extra_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_funcao_extra_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionario (id),
    CONSTRAINT ck_funcao_extra_valor CHECK (valor > 0)
);


-- ============================================================================
-- 5. CLIENTE
-- ============================================================================
CREATE TABLE cliente (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    nome                VARCHAR(150)    NOT NULL,
    cpf_cnpj            VARCHAR(18),
    telefone            VARCHAR(20)     NOT NULL,
    email               VARCHAR(150),
    ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
    data_criacao        TIMESTAMP       NOT NULL DEFAULT NOW(),
    data_atualizacao    TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cliente_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT uq_cliente_cpf_cnpj_empresa UNIQUE (empresa_id, cpf_cnpj)
);


-- ============================================================================
-- 6. VEICULO
-- ============================================================================
CREATE TABLE veiculo (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    cliente_id          BIGINT          NOT NULL,
    placa               VARCHAR(8)      NOT NULL,
    modelo              VARCHAR(100)    NOT NULL,
    marca               VARCHAR(60)     NOT NULL,
    cor                 VARCHAR(30),
    ano                 SMALLINT,
    ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
    data_criacao        TIMESTAMP       NOT NULL DEFAULT NOW(),
    data_atualizacao    TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_veiculo_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_veiculo_cliente FOREIGN KEY (cliente_id) REFERENCES cliente (id),
    CONSTRAINT uq_veiculo_placa_empresa UNIQUE (empresa_id, placa)
);


-- ============================================================================
-- 7. CATEGORIA_SERVICO
-- ============================================================================
CREATE TABLE categoria_servico (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    nome                VARCHAR(100)    NOT NULL,
    ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_categoria_servico_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT uq_categoria_servico_nome_empresa UNIQUE (empresa_id, nome)
);


-- ============================================================================
-- 8. SERVICO
-- ============================================================================
CREATE TABLE servico (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id                  BIGINT          NOT NULL,
    categoria_servico_id        BIGINT          NOT NULL,
    nome                        VARCHAR(150)    NOT NULL,
    descricao                   VARCHAR(500),
    preco                       NUMERIC(10,2)   NOT NULL,
    tempo_estimado_minutos      INTEGER         NOT NULL,
    ativo                       BOOLEAN         NOT NULL DEFAULT TRUE,
    data_criacao                TIMESTAMP       NOT NULL DEFAULT NOW(),
    data_atualizacao            TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_servico_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_servico_categoria FOREIGN KEY (categoria_servico_id) REFERENCES categoria_servico (id),
    CONSTRAINT ck_servico_preco CHECK (preco > 0),
    CONSTRAINT ck_servico_tempo CHECK (tempo_estimado_minutos > 0)
);


-- ============================================================================
-- 9. CATEGORIA_PRODUTO
-- ============================================================================
CREATE TABLE categoria_produto (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    nome                VARCHAR(100)    NOT NULL,
    ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_categoria_produto_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT uq_categoria_produto_nome_empresa UNIQUE (empresa_id, nome)
);


-- ============================================================================
-- 10. FORNECEDOR
-- ============================================================================
CREATE TABLE fornecedor (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    nome                VARCHAR(150)    NOT NULL,
    cnpj                VARCHAR(18),
    telefone            VARCHAR(20),
    ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_fornecedor_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id)
);


-- ============================================================================
-- 11. PRODUTO
-- ============================================================================
CREATE TABLE produto (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id                  BIGINT          NOT NULL,
    categoria_produto_id        BIGINT          NOT NULL,
    fornecedor_id                BIGINT,
    nome                         VARCHAR(150)    NOT NULL,
    unidade_medida               VARCHAR(10)     NOT NULL,
    preco_custo                  NUMERIC(10,2)   NOT NULL,
    ativo                        BOOLEAN         NOT NULL DEFAULT TRUE,
    data_criacao                 TIMESTAMP       NOT NULL DEFAULT NOW(),
    data_atualizacao             TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_produto_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_produto_categoria FOREIGN KEY (categoria_produto_id) REFERENCES categoria_produto (id),
    CONSTRAINT fk_produto_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedor (id),
    CONSTRAINT ck_produto_preco_custo CHECK (preco_custo >= 0),
    CONSTRAINT ck_produto_unidade CHECK (unidade_medida IN ('UN', 'ML', 'L', 'KG', 'G'))
);


-- ============================================================================
-- 12. ESTOQUE
-- ============================================================================
CREATE TABLE estoque (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id              BIGINT          NOT NULL,
    produto_id              BIGINT          NOT NULL,
    quantidade_atual        NUMERIC(10,3)   NOT NULL DEFAULT 0,
    quantidade_minima       NUMERIC(10,3)   NOT NULL DEFAULT 0,
    data_atualizacao        TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_estoque_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_estoque_produto FOREIGN KEY (produto_id) REFERENCES produto (id),
    CONSTRAINT uq_estoque_produto UNIQUE (produto_id),
    CONSTRAINT ck_estoque_quantidade_atual CHECK (quantidade_atual >= 0),
    CONSTRAINT ck_estoque_quantidade_minima CHECK (quantidade_minima >= 0)
);


-- ============================================================================
-- 13. AGENDAMENTO
-- ============================================================================
CREATE TABLE agendamento (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    cliente_id          BIGINT          NOT NULL,
    veiculo_id          BIGINT          NOT NULL,
    servico_id          BIGINT          NOT NULL,
    funcionario_id      BIGINT,
    data_hora           TIMESTAMP       NOT NULL,
    status               VARCHAR(20)     NOT NULL DEFAULT 'AGENDADO',
    observacoes          VARCHAR(500),
    data_criacao         TIMESTAMP       NOT NULL DEFAULT NOW(),
    data_atualizacao     TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_agendamento_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_agendamento_cliente FOREIGN KEY (cliente_id) REFERENCES cliente (id),
    CONSTRAINT fk_agendamento_veiculo FOREIGN KEY (veiculo_id) REFERENCES veiculo (id),
    CONSTRAINT fk_agendamento_servico FOREIGN KEY (servico_id) REFERENCES servico (id),
    CONSTRAINT fk_agendamento_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionario (id),
    CONSTRAINT ck_agendamento_status CHECK (status IN ('AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'))
);


-- ============================================================================
-- 14. ITEM_SERVICO
-- ============================================================================
CREATE TABLE item_servico (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id                  BIGINT          NOT NULL,
    agendamento_id               BIGINT          NOT NULL,
    produto_id                   BIGINT          NOT NULL,
    quantidade_consumida         NUMERIC(10,3)   NOT NULL,
    CONSTRAINT fk_item_servico_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_item_servico_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamento (id),
    CONSTRAINT fk_item_servico_produto FOREIGN KEY (produto_id) REFERENCES produto (id),
    CONSTRAINT ck_item_servico_quantidade CHECK (quantidade_consumida > 0)
);


-- ============================================================================
-- 15. MOVIMENTACAO_ESTOQUE
-- ============================================================================
CREATE TABLE movimentacao_estoque (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id              BIGINT          NOT NULL,
    produto_id              BIGINT          NOT NULL,
    tipo                    VARCHAR(10)     NOT NULL,
    quantidade              NUMERIC(10,3)   NOT NULL,
    origem                  VARCHAR(30)     NOT NULL,
    agendamento_id          BIGINT,
    data_movimentacao       TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_movimentacao_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_movimentacao_produto FOREIGN KEY (produto_id) REFERENCES produto (id),
    CONSTRAINT fk_movimentacao_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamento (id),
    CONSTRAINT ck_movimentacao_tipo CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    CONSTRAINT ck_movimentacao_origem CHECK (origem IN ('MANUAL', 'AGENDAMENTO', 'AJUSTE')),
    CONSTRAINT ck_movimentacao_quantidade CHECK (quantidade > 0)
);


-- ============================================================================
-- 16. FORMA_PAGAMENTO
-- ============================================================================
CREATE TABLE forma_pagamento (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    nome                VARCHAR(50)     NOT NULL,
    ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_forma_pagamento_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id)
);


-- ============================================================================
-- 17. RECEITA
-- ============================================================================
CREATE TABLE receita (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id              BIGINT          NOT NULL,
    agendamento_id          BIGINT,
    forma_pagamento_id      BIGINT          NOT NULL,
    descricao               VARCHAR(200)    NOT NULL,
    valor                   NUMERIC(10,2)   NOT NULL,
    data_recebimento        DATE            NOT NULL,
    data_criacao            TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_receita_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_receita_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamento (id),
    CONSTRAINT fk_receita_forma_pagamento FOREIGN KEY (forma_pagamento_id) REFERENCES forma_pagamento (id),
    CONSTRAINT ck_receita_valor CHECK (valor > 0)
);


-- ============================================================================
-- 18. DESPESA
-- ============================================================================
CREATE TABLE despesa (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    descricao           VARCHAR(200)    NOT NULL,
    categoria           VARCHAR(50)     NOT NULL,
    valor               NUMERIC(10,2)   NOT NULL,
    data_pagamento       DATE            NOT NULL,
    data_criacao         TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_despesa_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT ck_despesa_valor CHECK (valor > 0),
    CONSTRAINT ck_despesa_categoria CHECK (categoria IN ('FIXA', 'VARIAVEL', 'FORNECEDOR'))
);


-- ============================================================================
-- 19. LOG
-- ============================================================================
CREATE TABLE log (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    usuario_id          BIGINT,
    acao                VARCHAR(100)    NOT NULL,
    detalhes            TEXT,
    data_hora           TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_log_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
);


-- ============================================================================
-- 20. CONFIGURACAO
-- ============================================================================
CREATE TABLE configuracao (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    chave               VARCHAR(100)    NOT NULL,
    valor               VARCHAR(255)    NOT NULL,
    CONSTRAINT fk_configuracao_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT uq_configuracao_chave_empresa UNIQUE (empresa_id, chave)
);


-- ============================================================================
-- 21. BACKUP
-- ============================================================================
CREATE TABLE backup (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    empresa_id          BIGINT          NOT NULL,
    caminho_arquivo     VARCHAR(500)    NOT NULL,
    tipo                VARCHAR(20)     NOT NULL,
    data_execucao       TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_backup_empresa FOREIGN KEY (empresa_id) REFERENCES empresa (id),
    CONSTRAINT ck_backup_tipo CHECK (tipo IN ('MANUAL', 'AUTOMATICO'))
);


-- ============================================================================
-- INDICES (Cap. 7, secao 7.8) - acelerar as consultas mais frequentes
-- ============================================================================

-- empresa_id: presente em praticamente toda consulta do sistema
CREATE INDEX idx_usuario_empresa ON usuario (empresa_id);
CREATE INDEX idx_funcionario_empresa ON funcionario (empresa_id);
CREATE INDEX idx_cliente_empresa ON cliente (empresa_id);
CREATE INDEX idx_veiculo_empresa ON veiculo (empresa_id);
CREATE INDEX idx_servico_empresa ON servico (empresa_id);
CREATE INDEX idx_produto_empresa ON produto (empresa_id);
CREATE INDEX idx_agendamento_empresa ON agendamento (empresa_id);
CREATE INDEX idx_receita_empresa ON receita (empresa_id);
CREATE INDEX idx_despesa_empresa ON despesa (empresa_id);

-- Buscas especificas de alta frequencia
CREATE INDEX idx_cliente_cpf_cnpj ON cliente (empresa_id, cpf_cnpj);
CREATE INDEX idx_veiculo_placa ON veiculo (empresa_id, placa);
CREATE INDEX idx_agendamento_data_hora ON agendamento (empresa_id, data_hora);
CREATE INDEX idx_agendamento_status ON agendamento (empresa_id, status);
CREATE INDEX idx_movimentacao_produto_data ON movimentacao_estoque (empresa_id, produto_id, data_movimentacao);
CREATE INDEX idx_receita_data_recebimento ON receita (empresa_id, data_recebimento);
CREATE INDEX idx_despesa_data_pagamento ON despesa (empresa_id, data_pagamento);

-- ============================================================================
-- FIM DO SCRIPT V1__init.sql
-- ============================================================================
