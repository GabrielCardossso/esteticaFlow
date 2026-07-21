# Sobe apenas o PostgreSQL do Docker e mostra como rodar a app localmente.
# Uso: powershell -ExecutionPolicy Bypass -File .\scripts\docker-up.ps1
# Requer arquivo .env na raiz (copie de .env.example) com POSTGRES_PASSWORD.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path ".env")) {
    Write-Error "Arquivo .env nao encontrado. Copie .env.example para .env e defina POSTGRES_PASSWORD."
}

Write-Host "Subindo PostgreSQL (Docker)..."
docker compose up -d postgres

Write-Host "Aguardando healthcheck..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    $status = docker inspect --format="{{.State.Health.Status}}" esteticaflow-postgres 2>$null
    if ($status -eq "healthy") {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Error "PostgreSQL nao ficou healthy a tempo. Veja: docker compose logs postgres"
}

Write-Host ""
Write-Host "PostgreSQL pronto em localhost:5433"
Write-Host "Para rodar a API/web no host:"
Write-Host "  mvn spring-boot:run `"-Dspring-boot.run.profiles=local-docker`""
Write-Host ""
Write-Host "Para subir app + banco no Docker:"
Write-Host "  docker compose up -d --build"
Write-Host ""
Write-Host "Login: use o SUPER_ADMIN do seu banco. Senhas nao sao exibidas nem versionadas neste script."
