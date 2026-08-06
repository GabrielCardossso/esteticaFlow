# EsteticaFlow

**ERP/SaaS de gestão para empresas de estética automotiva.** Agenda, clientes, veículos, catálogo de serviços, estoque, financeiro e relatórios em um único painel, com isolamento multiempresa e planos de assinatura.

Construído em Next.js 15 (App Router), TypeScript estrito, PostgreSQL e Drizzle ORM.

---

## Sumário

- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Arquitetura](#arquitetura)
- [Decisões e trade-offs](#decisões-e-trade-offs)
- [Modelo de dados](#modelo-de-dados)
- [Segurança](#segurança)
- [Deploy](#deploy)
- [Verificação](#verificação)

---

## Como rodar

Pré-requisitos: **Node 20+** e um **PostgreSQL 14+** acessível.

```bash
# 1. Dependências
yarn

# 2. Ambiente
cp .env.example .env.local
# edite .env.local: DATABASE_URL e SESSION_SECRET
# (os scripts db:* leem `.env` — mantenha uma cópia ou symlink: cp .env.local .env)

# gere um segredo forte:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Banco
yarn db:migrate     # aplica o schema
yarn db:seed        # cria o admin da plataforma e uma empresa de demonstração

# 4. Desenvolvimento
yarn dev            # http://localhost:3000
```

O seed cria duas contas, ambas com a senha definida em `SEED_SUPER_ADMIN_SENHA`:

| Conta | Perfil | Para quê |
| --- | --- | --- |
| valor de `SEED_SUPER_ADMIN_EMAIL` | Administrador da plataforma | Console de empresas, assinaturas e auditoria |
| `ana@garagemprime.com.br` | Administradora da empresa demo | Operação completa com dados de exemplo |

> O seed é idempotente: se o administrador da plataforma já existir, ele não faz nada.

---

## Variáveis de ambiente

Validadas por Zod no boot (`src/env.ts`). Ausência ou formato inválido derruba a aplicação imediatamente, em vez de falhar no meio de uma requisição.

| Variável | Obrigatória | Descrição |
| --- | :-: | --- |
| `DATABASE_URL` | ✅ | Conexão PostgreSQL. Em produção, use o endpoint do **pooler** |
| `SESSION_SECRET` | ✅ | Segredo de assinatura do cookie de sessão. Mínimo de 32 caracteres |
| `NEXT_PUBLIC_APP_URL` | — | URL pública. Padrão: `http://localhost:3000` |
| `NODE_ENV` | — | Definida pelo runtime |
| `SEED_SUPER_ADMIN_EMAIL` | seed | E-mail do administrador da plataforma |
| `SEED_SUPER_ADMIN_SENHA` | seed | Senha inicial — troque após o primeiro acesso |
| `SEED_SUPER_ADMIN_NOME` | seed | Nome de exibição |

Nenhum segredo é versionado. `.env*` está no `.gitignore`.

---

## Scripts

| Comando | O que faz |
| --- | --- |
| `yarn dev` | Servidor de desenvolvimento |
| `yarn build` | Build de produção |
| `yarn start` | Servidor de produção |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn lint` | ESLint |
| `yarn test` | Testes do domínio (Vitest) |
| `yarn verify` | Typecheck + lint + testes |
| `yarn db:generate` | Gera migration a partir do schema |
| `yarn db:migrate` | Aplica migrations pendentes |
| `yarn db:seed` | Popula o ambiente |
| `yarn db:studio` | Interface visual do banco |
| `yarn format` | Prettier |

---

## Arquitetura

```
src/
├── app/                    Rotas (App Router)
│   ├── page.tsx            Landing pública
│   ├── login/  suporte/    Páginas públicas
│   ├── painel/             Área autenticada
│   └── api/                API REST (route handlers, runtime Node)
│
├── domain/                 REGRAS DE NEGÓCIO — funções puras, zero IO
│   ├── result.ts           Result<T,E>: erro de negócio é valor, não exceção
│   ├── agendamento.ts      Totais, conflito de horário, máquina de estados
│   ├── estoque.ts          Custo por embalagem, validação de baixa, níveis
│   ├── plano.ts            Matriz plano × recurso, ciclo da assinatura
│   ├── cliente.ts          Classificação de relacionamento, links de contato
│   ├── relatorio.ts        Períodos e indicadores
│   ├── tema.ts             Acentos, contraste AA, tokens derivados
│   ├── auditoria.ts        Catálogo de ações auditáveis
│   └── shared/             Decimal exato, tempo (moment-timezone), documentos, texto
│
├── db/                     Schema Drizzle, cliente, migrate, seed
├── schemas/                Contratos Zod — fronteira de entrada
├── server/                 Orquestração: transação + domínio + persistência + log
├── auth/                   Sessão, senha, contexto e guards
├── components/             Interface (design system + telas)
├── hooks/                  React Query por área
└── lib/                    Cliente HTTP (axios), chaves de cache, utilitários
```

**Regra estrutural inegociável:** `src/domain/` não importa `next`, `drizzle`, `react` nem `src/db`. É testável com Vitest sem mock, sem banco e sem servidor. Toda decisão de negócio mora ali; `src/server/` só orquestra IO em volta dela.

### Fluxo de uma requisição

```
Componente cliente
      │ React Query + axios
      ▼
Route handler ──► lerCorpo/lerQuery (Zod)  ──► 422 se inválido
      │
      ▼
carregarContexto() ──► sessão + empresa + recálculo da assinatura
      │                    └─► 401/403 se sessão caiu ou empresa bloqueada
      ▼
Guard de perfil e gate de plano ──► 403/402
      │
      ▼
src/server/*  ──► função pura do domínio ──► Result
      │                                        └─► falha vira HTTP + mensagem
      ▼
Drizzle (transação quando há mais de uma escrita)
      │
      ▼
Trilha de auditoria (nunca derruba a operação principal)
```

---

## Decisões e trade-offs

### Por que Drizzle e não Prisma
O schema depende de recursos que o Prisma abstrai mal: *check constraints* compostas, índices únicos **parciais** (uma solicitação pendente por empresa; uma receita por atendimento) e `SELECT ... FOR UPDATE`. Drizzle mantém o SQL visível e não carrega engine binário — cold start menor em ambiente serverless.
**Trade-off:** menos maturidade em migrations complexas; menos ferramental pronto.

### Por que sessão própria e não Auth.js
O modelo de autorização é perfil + plano + revalidação da assinatura **a cada requisição**. Encaixar isso nos adapters do Auth.js exigiria contorná-los. Um login por credenciais com cookie assinado (`jose`) são ~120 linhas e reproduzem o comportamento exigido.
**Trade-off:** provedores OAuth exigiriam trabalho adicional. Não estão no escopo.

### Por que API REST e não Server Actions
A interface é orientada a dados que mudam com frequência (agenda, saldo, financeiro). React Query dá cache, invalidação por chave, revalidação em foco e estado de carregamento sem esforço. Uma API REST explícita torna isso natural e mantém a superfície testável independentemente da UI.
**Trade-off:** mais arquivos que Server Actions e um salto de rede a mais no primeiro carregamento.

### Por que `BigInt` para dinheiro
`0.1 + 0.2 !== 0.3`. Em sistema financeiro isso vira centavo perdido em relatório. Valores circulam como string decimal e toda conta acontece em inteiros escalados, com arredondamento HALF_UP.
**Trade-off:** conversão na fronteira e código de aritmética mais verboso.
*Um teste desta suíte pegou um bug real de conversão de escala no custo unitário.*

### Por que `moment-timezone`
A operação inteira vive em `America/São_Paulo`. Um único módulo (`domain/shared/tempo.ts`) concentra "agora", "hoje" e formatação, e nenhum outro arquivo chama `new Date()` para decidir regra.
**Trade-off:** `moment` está em manutenção e é mais pesado que alternativas modernas. Foi requisito explícito do projeto e está isolado atrás de um módulo — trocar por `date-fns-tz` ou `Temporal` mexe em um arquivo só.

### Por que fontes em runtime e não `next/font`
`next/font` baixa os arquivos **durante o build**. Em ambiente de CI sem acesso ao Google Fonts, o build quebra. As fontes são carregadas pelo navegador com `display=swap` e pilha de fallback do sistema.
**Trade-off:** um salto de rede no primeiro carregamento e possível FOUT.

### Por que responsável = usuário
Existia uma tabela de funcionários sem nenhuma tela de cadastro: o seletor de responsável na agenda ficaria permanentemente vazio. O responsável passou a ser um **usuário ativo da empresa**, e o recurso funciona de ponta a ponta sem um CRUD a mais.
**Trade-off:** não há campos de RH (CPF, admissão, comissão). Nenhum deles era usado.

---

## Modelo de dados

20 tabelas, todas com `empresa_id` (exceto `empresa`) e auditoria de criação/atualização.

| Área | Tabelas |
| --- | --- |
| Organização | `empresa`, `usuario`, `configuracao`, `solicitacao_alteracao_empresa` |
| Operação | `cliente`, `veiculo`, `categoria_servico`, `servico`, `agendamento`, `agendamento_servico` |
| Estoque | `categoria_produto`, `produto`, `estoque`, `movimentacao_estoque` |
| Financeiro | `forma_pagamento`, `receita`, `despesa` |
| Plataforma | `log`, `historico_acesso`, `notificacao` |

Invariantes replicadas no banco, não só no código:

- `agendamento`: `subtotal > 0`, `0 ≤ desconto < subtotal`, `total = subtotal − desconto`
- `receita`: índice único parcial em `agendamento_id` — um atendimento não é pago duas vezes
- `solicitacao_alteracao_empresa`: índice único parcial em `empresa_id WHERE status = 'PENDENTE'`
- `cliente`: índice único parcial em `(empresa_id, cpf_cnpj) WHERE cpf_cnpj IS NOT NULL`
- Formato de CNPJ, telefone, CEP e placa validado por *check constraint*

---

## Segurança

- **Sessão** em cookie `httpOnly`, `SameSite=Lax`, assinado com HS256; `Secure` em produção.
- **Senha** com bcrypt custo 10.
- **Autorização em três camadas**: rota (middleware) → perfil (guard) → recurso do plano (gate).
- **Isolamento multiempresa**: `empresaId` sempre da sessão assinada, nunca de parâmetro do cliente.
- **Revalidação por requisição**: empresa bloqueada perde acesso na próxima ação, sem esperar o cookie expirar.
- **Cabeçalhos**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS de 1 ano.
- **Mensagem de login única** para e-mail inexistente e senha errada — não revela quais contas existem.
- **Trilha de auditoria** por empresa e histórico de acesso por usuário.
- **Segredos** apenas em variável de ambiente.

---

## Deploy

Preparado para **Vercel**. Todas as rotas de API declaram `runtime = 'nodejs'`.

1. Configure `DATABASE_URL` (endpoint do **pooler**, não o direto), `SESSION_SECRET` e `NEXT_PUBLIC_APP_URL`.
2. Rode `yarn db:migrate` no passo de deploy ou manualmente antes de publicar.
3. Rode `yarn db:seed` uma única vez, no primeiro deploy.

Se estiver atrás de PgBouncer em modo *transaction*, o driver já vai com `prepare: false` e pool de 1 conexão em produção — não altere sem medir.

---

## Verificação

```bash
yarn verify   # typecheck + lint + testes
yarn build    # build de produção
```

Estado atual desta entrega:

| Verificação | Resultado |
| --- | --- |
| `tsc --noEmit` (strict) | ✅ sem erros |
| ESLint | ✅ sem erros e sem avisos |
| Vitest — domínio | ✅ 49 testes |
| `next build` | ✅ 17 páginas + 47 rotas de API |
| Java remanescente | ✅ nenhum arquivo |

**Não verificado neste ambiente:** as migrations e o seed não foram executados contra um PostgreSQL real, porque não havia banco disponível na máquina de desenvolvimento usada. O SQL é gerado pelo `drizzle-kit` a partir do schema tipado, mas **rode `yarn db:migrate` em uma base limpa antes de considerar o schema validado**.

---

## Documentação relacionada

| Arquivo | Conteúdo |
| --- | --- |
| [`REQUISITOS.md`](./REQUISITOS.md) | Atores, 78 casos de uso, 20 regras de negócio, requisitos não funcionais |
| [`MIGRATION-MAP.md`](./MIGRATION-MAP.md) | Inventário do sistema Java de origem e o mapa da migração |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Arquitetura alvo e justificativa de cada dependência |
