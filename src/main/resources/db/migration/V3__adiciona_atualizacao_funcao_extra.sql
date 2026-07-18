-- FuncaoExtra também herda a auditoria comum definida no Capítulo 8.
ALTER TABLE funcao_extra ADD COLUMN data_atualizacao TIMESTAMP NOT NULL DEFAULT NOW();
