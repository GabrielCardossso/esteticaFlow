# Setup local do PostgreSQL para o EsteticaDesk (Windows)
# Uso: powershell -ExecutionPolicy Bypass -File .\scripts\setup-postgres.ps1

param(
    [string]$PgHost = "localhost",
    [string]$PgPort = "5432",
    [string]$PgUser = "postgres",
    [string]$PgPassword = "Sync@933",
    [string]$Database = "esteticadesk_db"
)

$ErrorActionPreference = "Stop"

$psqlCandidates = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe"
)

$psql = $psqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $psql) {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) { $psql = $cmd.Source }
}

if (-not $psql) {
    Write-Error "psql nao encontrado. Instale o PostgreSQL ou adicione o bin ao PATH."
}

$env:PGPASSWORD = $PgPassword

$exists = & $psql -U $PgUser -h $PgHost -p $PgPort -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$Database'"
if ($exists.Trim() -ne "1") {
    Write-Host "Criando banco '$Database'..."
    & $psql -U $PgUser -h $PgHost -p $PgPort -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $Database"
} else {
    Write-Host "Banco '$Database' ja existe."
}

Write-Host ""
Write-Host "Banco pronto. Tabelas e dados iniciais serao aplicados pelo Flyway ao subir a app."
Write-Host "Proximos passos:"
Write-Host "  mvn spring-boot:run"
Write-Host "  http://localhost:8080"
Write-Host "  Login: gabrielcardossso@gmail.com / Sync@933"
