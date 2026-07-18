# Como rodar o EsteticaFlow (local)

## Pré-requisitos

- Java 21+
- Maven 3.9+
- Docker Desktop (recomendado) **ou** PostgreSQL 16/18 local

## Opção A — Docker completo (app + banco)

Abra o terminal na pasta do projeto:

```powershell
cd d:\Projetos\esteticaFlow
docker compose up -d --build
```

Acesse: http://localhost:8080

| Item | Valor |
|------|--------|
| Login | `gabrielcardossso@gmail.com` |
| Senha | `Sync@933` |
| App | porta `8080` |
| Postgres Docker | porta `5433` |

Parar:

```powershell
docker compose down
```

## Opção B — Banco no Docker + app no Maven (melhor para desenvolver)

```powershell
cd d:\Projetos\esteticaFlow
powershell -ExecutionPolicy Bypass -File .\scripts\docker-up.ps1
mvn spring-boot:run "-Dspring-boot.run.profiles=local-docker"
```

Acesse: http://localhost:8080  
Login: `gabrielcardossso@gmail.com` / `Sync@933`

## Opção C — PostgreSQL instalado no Windows

1. Suba o serviço PostgreSQL.
2. Crie o banco (se ainda não existir):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-postgres.ps1
```

3. Rode a app (usa `localhost:5432`, usuário `postgres`):

```powershell
mvn spring-boot:run
```

## Conta principal

A conta `gabrielcardossso@gmail.com` é **SUPER_ADMIN** do sistema.  
Em **Configurações** você pode:

- alterar tema (claro / escuro / sistema) e cor de destaque
- criar novas empresas (cada uma com seu administrador)

## Tema

Em **Configurações → Aparência**:

- Modo: Claro, Escuro ou Sistema
- Cores: teal, verde, azul, roxo, laranja, vermelho

## Agenda

Em **Agenda**, use o botão **+ Agendar** para criar um novo agendamento.

## Observações

- Pasta do projeto: `d:\Projetos\esteticaFlow`
- Pacotes Java continuam em `br.esteticadesk` (interno; não quebra o código).
- Containers/DB Docker ainda usam o prefixo `esteticadesk-*` (só nomes técnicos).
- O nome de produto na interface é **EsteticaFlow**.
- Flyway aplica as migrações automaticamente na subida da aplicação.
- Se o Cursor/IDE ainda apontar para `esteticaDesk`, reabra a pasta: **File → Open Folder → `d:\Projetos\esteticaFlow`**.
