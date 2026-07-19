ALTER TABLE empresa
    DROP CONSTRAINT IF EXISTS ck_empresa_plano;

UPDATE empresa
SET plano = 'COMPLETO'
WHERE plano IN ('PRO', 'EXCLUSIVE');

UPDATE empresa
SET valor_mensalidade = CASE plano
    WHEN 'BASICO' THEN 59.90
    WHEN 'COMPLETO' THEN 119.90
END
WHERE valor_mensalidade = 0;

ALTER TABLE empresa
    ADD CONSTRAINT ck_empresa_plano
        CHECK (plano IN ('BASICO', 'COMPLETO'));
