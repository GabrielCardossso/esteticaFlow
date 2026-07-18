-- Cria o banco esteticadesk_db se ainda nao existir.
-- Uso: psql -U postgres -f scripts/create-database.sql

SELECT 'CREATE DATABASE esteticadesk_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'esteticadesk_db')\gexec
