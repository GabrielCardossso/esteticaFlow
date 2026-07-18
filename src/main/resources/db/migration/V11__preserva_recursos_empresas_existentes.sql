-- Empresas anteriores ao catálogo de planos já tinham acesso a todos os módulos.
-- Preserva a compatibilidade; novos cadastros recebem o plano escolhido pelo SUPER_ADMIN.
UPDATE empresa
SET plano = 'EXCLUSIVE'
WHERE plano = 'BASICO';
