# EsteticaFlow

Sistema web de gestão para empresas de estética automotiva: clientes, veículos, agenda, serviços, estoque, financeiro, relatórios e planos de assinatura (Básico e Completo), com suporte a múltiplas empresas.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | Java 21 · Spring Boot 3.3 (Web, Security, Data JPA, Validation) |
| Frontend | Thymeleaf (renderizado no servidor) + CSS/JS estáticos |
| Banco de dados | PostgreSQL 16 · migrations com Flyway |
| Relatórios | OpenPDF (PDF) · Apache POI (Excel) |
| Build / Deploy | Maven · Docker + Docker Compose |

Importante: **backend e frontend são a mesma aplicação**. O Thymeleaf gera as páginas no servidor e os arquivos estáticos (`css/`, `js/`) são servidos pelo próprio Spring Boot. Não existe deploy separado de frontend — hospedar o sistema significa hospedar **um serviço Java + um banco PostgreSQL**.

## Rodando localmente

Pré-requisitos: Docker Desktop (ou Java 21 + Maven + PostgreSQL local).

### Opção 1 — Tudo no Docker (recomendado)

```bash
docker compose up -d --build
```

- Aplicação: http://localhost:8080
- PostgreSQL: exposto em `localhost:5433` (evita conflito com Postgres instalado no Windows)
- As migrations do Flyway rodam automaticamente na subida.

### Opção 2 — App na IDE + banco no Docker

```bash
docker compose up -d postgres
```

Depois rode a aplicação com o perfil `local-docker` (aponta para `localhost:5433`):

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local-docker
```

### Testes

```bash
mvn test
```

## Configuração por variáveis de ambiente

| Variável | Descrição | Padrão local |
| --- | --- | --- |
| `SPRING_DATASOURCE_URL` | URL JDBC do PostgreSQL | `jdbc:postgresql://localhost:5432/esteticadesk_db` |
| `SPRING_DATASOURCE_USERNAME` | Usuário do banco | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | Senha do banco | *(obrigatória — sem default versionado)* |
| `SPRING_PROFILES_ACTIVE` | Perfil (`local`, `docker`, `local-docker`, `prod`) | — |
| `SERVER_PORT` | Porta HTTP da aplicação | `8080` |

Em produção, **nunca** use senhas padrão. Defina tudo via `.env` (gitignored), `application-local.properties` (gitignored) ou secrets do provedor.

Arquivos sensíveis já cobertos pelo `.gitignore` / `.dockerignore`: `.env`, `application-local.properties`, certificados, dumps e overrides do Compose.

## Hospedagem em produção

### Arquitetura de deploy

```
                Internet (HTTPS)
                      │
            ┌─────────▼─────────┐
            │  Proxy reverso     │  Caddy ou Nginx (TLS/certificado)
            └─────────┬─────────┘
                      │ :8080
            ┌─────────▼─────────┐
            │  EsteticaFlow      │  1 container (backend + frontend juntos)
            │  Spring Boot       │  perfil: prod/docker
            └─────────┬─────────┘
                      │ :5432 (rede privada)
            ┌─────────▼─────────┐
            │  PostgreSQL 16     │  container com volume OU banco gerenciado
            └───────────────────┘
```

### Opção A — VPS única com Docker Compose (recomendada para começar)

Menor custo e usa exatamente o `Dockerfile` e o `docker-compose.yml` já existentes no repositório.

- **Onde:** uma VPS de 2 vCPU / 4 GB RAM (Hostinger VPS, Contabo, DigitalOcean, Hetzner). Custo típico: R$ 30–80/mês.
- **App (back + front):** container `app` do compose, atrás de um proxy reverso (Caddy é o mais simples — HTTPS automático via Let's Encrypt).
- **Banco:** container `postgres` do compose, com volume Docker para persistência, acessível **apenas pela rede interna** (não exponha a porta 5432 na internet).
- **Domínio:** aponte um registro A (ex.: `app.seudominio.com.br`) para o IP da VPS.
- **Backup:** agende `pg_dump` diário via cron e envie o arquivo para fora da VPS (ex.: bucket S3/Backblaze ou outro storage). O volume Docker sozinho não é backup.

Passos resumidos na VPS:

```bash
git clone <repo> && cd esteticaFlow
# criar .env com POSTGRES_PASSWORD forte e demais variáveis
docker compose up -d --build
# instalar Caddy e apontar app.seudominio.com.br -> localhost:8080
```

### Opção B — PaaS + banco gerenciado (menos operação manual)

Indicada se você não quer administrar servidor, aceitando custo um pouco maior.

- **App:** Railway, Render ou Fly.io — todos fazem build direto do `Dockerfile` do repositório a cada push.
- **Banco:** PostgreSQL gerenciado do próprio provedor (Railway/Render) ou Neon/Supabase. Backup e atualização ficam por conta do provedor.
- **Configuração:** defina `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` e `SPRING_PROFILES_ACTIVE=prod` no painel do provedor.
- **Atenção:** planos gratuitos hibernam a aplicação (primeiro acesso lento) — para clientes pagantes, use plano pago.

### Comparativo rápido

| Critério | A: VPS + Compose | B: PaaS + banco gerenciado |
| --- | --- | --- |
| Custo mensal | Menor (R$ 30–80) | Médio (US$ 10–25+) |
| Esforço de operação | Você administra tudo | Provedor administra |
| Backup do banco | Manual (cron + pg_dump) | Automático |
| HTTPS | Caddy/Nginx (fácil) | Automático |
| Escala futura | Migrar p/ banco gerenciado depois | Escala no painel |

**Recomendação:** comece com a **Opção A** (o projeto já está pronto para ela) e migre o banco para um serviço gerenciado quando a base de clientes justificar.

### Checklist de produção

- [ ] Senha forte do PostgreSQL via variável de ambiente (nunca a padrão)
- [ ] Trocar a senha do usuário SUPER_ADMIN criado pelas migrations
- [ ] HTTPS ativo (Caddy/Nginx ou PaaS)
- [ ] Porta do banco fechada para a internet
- [ ] Backup diário do banco testado (restaurar ao menos uma vez)
- [ ] `SPRING_PROFILES_ACTIVE=prod` (cache do Thymeleaf ligado, logs em nível INFO)
- [ ] Monitorar espaço em disco da VPS (logs + volume do banco)
- [ ] Em produção limpa: a migration `V13__seed_dados_teste.sql` popula dados de demonstração — remova/ignore antes do primeiro deploy ou limpe após (não altere o arquivo se já foi aplicado; use `flyway repair` só se necessário)

## Migrar de Render + Supabase para VPS

Passos resumidos para sair de um deploy PaaS (Render) com banco Supabase e hospedar na VPS com Docker Compose:

1. **Dump do banco:** no Supabase (ou via `pg_dump` com a connection string), exporte o schema e os dados:
   ```bash
   pg_dump "postgresql://USER:PASS@HOST:5432/DB?sslmode=require" -Fc -f esteticaflow.dump
   ```
2. **Secrets na VPS:** crie `.env` com `POSTGRES_PASSWORD`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` e `SPRING_PROFILES_ACTIVE=prod`. Use JDBC com `sslmode=require` se o Postgres exigir TLS.
3. **Subir stack:** `docker compose up -d --build` na VPS (app + Postgres local ou apontando para banco gerenciado).
4. **Restaurar dados:** se usar Postgres no compose, restaure com `pg_restore` no container/volume antes de abrir tráfego.
5. **DNS:** aponte o domínio (registro A) para o IP da VPS e configure HTTPS no proxy reverso (Caddy/Nginx).
6. **Validar:** login, agenda, financeiro e backup; desligue o serviço antigo no Render após confirmação.
