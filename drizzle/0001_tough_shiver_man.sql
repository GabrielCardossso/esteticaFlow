ALTER TABLE "notificacao" ADD COLUMN "ativa" boolean DEFAULT true NOT NULL;

-- Mantem um unico alerta operacional aberto por referencia. Versoes antigas
-- da aplicacao recriavam o alerta quando ele era apenas marcado como lido.
WITH ordenadas AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY empresa_id, tipo, referencia_tipo, referencia_id
      ORDER BY criado_em DESC, id DESC
    ) AS posicao
  FROM notificacao
  WHERE tipo IN ('ESTOQUE_BAIXO', 'CLIENTE_INATIVO')
    AND referencia_tipo IS NOT NULL
    AND referencia_id IS NOT NULL
)
UPDATE notificacao AS destino
SET ativa = false, lida = true
FROM ordenadas
WHERE destino.id = ordenadas.id
  AND ordenadas.posicao > 1;

-- O alerta operacional de assinatura passa a ter uma referencia propria,
-- sem conflitar com os avisos historicos de pagamento de assinatura.
UPDATE notificacao
SET ativa = false, lida = true
WHERE tipo = 'ASSINATURA'
  AND referencia_tipo = 'EMPRESA';
