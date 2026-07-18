-- Índices do catálogo usados pelas telas de listagem e seleção.
CREATE INDEX IF NOT EXISTS idx_categoria_servico_empresa_ativo_nome
    ON categoria_servico (empresa_id, ativo, nome);

CREATE INDEX IF NOT EXISTS idx_servico_empresa_ativo_nome
    ON servico (empresa_id, ativo, nome);
