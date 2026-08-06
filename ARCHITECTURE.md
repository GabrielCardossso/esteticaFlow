# ARCHITECTURE.md — Fase 1: arquitetura alvo (proposta, aguardando aval)

> Nada foi codado. Este documento é o portão da Fase 1. A Fase 2 só começa com sua aprovação explícita do stack, da estrutura e dos mapeamentos abaixo.

**Decisões já tomadas (Fase 0):** base nova sem dados · claro+escuro alternáveis com acento do tenant · deploy na Vercel · sessão em cookie httpOnly com BCrypt.

---

## 1. Stack proposta e justificativa de cada dependência

Regra aplicada: **reuso → stdlib/plataforma → dependência justificada → implementação mínima.** Nenhuma dependência entra "porque é popular".

### Núcleo (não negociável — é o alvo pedido)

| Dep | Justificativa |
| --- | --- |
| `next` (App Router) | Plataforma alvo definida no escopo. |
| `react`, `react-dom` | Requisito do Next. |
| `typescript` | Requisito do escopo (`strict`). |

### Persistência

| Dep | Justificativa |
| --- | --- |
| `drizzle-orm` | ORM SQL-first: o schema Postgres existente (checks, índices parciais, `FOR UPDATE`) é reproduzido literalmente, sem tradução lossy. Sem engine binário → **cold start baixo na Vercel**, que é serverless. Tipos derivados do schema, não de codegen externo. |
| `drizzle-kit` | Geração e aplicação das migrations a partir do schema TypeScript. Substitui o Flyway. |
| `postgres` (postgres.js) | Driver leve, compatível com o pooler do Supabase em modo transaction (`prepare: false`). Alternativa considerada: `pg` (mais pesado, sem ganho aqui) e `@neondatabase/serverless` (amarra ao Neon). |

> **Por que não Prisma:** o `@prisma/client` carrega um query engine por invocação serverless (cold start maior) e abstrai o SQL a ponto de dificultar reproduzir `SELECT ... FOR UPDATE` (RN-04/RN-07) e índices únicos parciais. Drizzle mantém o SQL visível, que é exatamente o que a paridade exige. Se você preferir Prisma pela maturidade das migrations, é uma troca defensável — me diga e eu ajusto.

### Validação e domínio

| Dep | Justificativa |
| --- | --- |
| `zod` | Validação de toda fronteira (form data, params, env) com tipos derivados via `z.infer`. Substitui Bean Validation. |
| *(nenhuma)* | **`Result` próprio, ~20 linhas.** Não entra `fp-ts` nem `effect`: a complexidade atual não justifica (YAGNI). Erros de negócio viram `{ ok: false, error }`; exceptions ficam só para o inesperado. |
| *(nenhuma)* | Validação de CPF/CNPJ/placa é **implementação própria**, portada de `DocumentoValidator`. São ~40 linhas de aritmética de dígito verificador; adicionar uma lib para isso seria dependência sem justificativa. |
| *(nenhuma)* | Datas com `Intl` + `Temporal`-like helpers próprios sobre `Date`. O sistema usa **um único fuso fixo** (`America/Sao_Paulo`) e um punhado de operações (início/fim do dia, segunda/domingo, primeiro/último dia do mês, +1 mês, diferença em dias). Isso é ~60 linhas com `Intl.DateTimeFormat` e não justifica `date-fns`/`luxon`. **Se você preferir `date-fns` pela legibilidade, aceito — mas a decisão é sua, não minha por default.** |

### Autenticação

| Dep | Justificativa |
| --- | --- |
| `jose` | Assina/verifica o cookie de sessão (JWE/JWS). Padrão de facto, funciona em Node e Edge runtime — necessário porque o middleware da Vercel roda em Edge. |
| `bcryptjs` | Hashing BCrypt puro JS, sem binário nativo — funciona em qualquer runtime da Vercel sem configuração. Custo: ~150 ms por verificação com cost 10, aceitável porque só ocorre no login. Alternativa nativa (`@node-rs/bcrypt`, mais rápida) fica registrada caso o login fique lento. |

> **Por que não Auth.js/NextAuth:** você escolheu sessão em cookie httpOnly, e o modelo de autorização daqui (papel + plano + revalidação de assinatura a cada request) não se encaixa nos adapters do Auth.js sem contorná-los. Um login por credenciais com cookie assinado são ~120 linhas e reproduzem o comportamento atual exatamente. Menos superfície, menos mágica.

### UI e design system

| Dep | Justificativa |
| --- | --- |
| `tailwindcss`, `postcss`, `autoprefixer` | Design tokens centralizados (cor, tipografia, spacing, raio, sombra) em um lugar só, sem valores mágicos espalhados. |
| `@radix-ui/react-*` (só os primitivos usados) | Acessibilidade real (foco, teclado, ARIA) em dialog, select, dropdown, tooltip, popover. O escopo declara acessibilidade como não-opcional; reimplementar isso à mão é onde a maioria dos bugs de A11y nasce. Entram **sob demanda**, um por vez, conforme a fatia precisar. |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Dependências transitivas do padrão shadcn/ui (componentes copiados para o repo, editáveis, não caixa-preta). |
| `lucide-react` | Ícones. Substitui os SVGs inline atuais. |
| `chart.js` + `react-chartjs-2` | **Já é a biblioteca usada hoje** (via CDN no dashboard). Manter reduz risco de divergência visual. Passa a ser dependência versionada em vez de CDN — melhora segurança e offline. |

### Exportação de relatórios

| Dep | Justificativa |
| --- | --- |
| `exceljs` | Substitui Apache POI. Gera XLSX com múltiplas abas e formatação de moeda — cobre tudo que `RelatorioExcelExporter` faz. |
| `@react-pdf/renderer` | Substitui OpenPDF. Layout declarativo em JSX com tabelas — o relatório atual é essencialmente tabular. Alternativa `pdf-lib` foi descartada: exigiria posicionar cada célula manualmente. Puppeteer descartado: inviável na Vercel sem chromium empacotado. |

### Qualidade

| Dep | Justificativa |
| --- | --- |
| `vitest` | Testes de unidade do domínio puro. Rápido, sem configuração de transpilação. |
| `@playwright/test` | E2E das jornadas principais. |
| `eslint` + `eslint-config-next`, `prettier` | Lint e formatação, exigidos no Definition of Done. |
| `@testcontainers/postgresql` *(opcional — decisão sua)* | Testes de integração contra Postgres real, substituindo o `ContextoBancoTest`. Só entra se você quiser testes de repositório de verdade; caso contrário fico só com domínio puro + e2e. |

**Total de dependências de runtime: 12.** Nenhuma entra sem a linha de justificativa acima.

---

## 2. Configuração de TypeScript

```jsonc
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true
}
```

Regras duras: **`any` proibido** (usar `unknown` + narrowing). **`@ts-expect-error` só com comentário justificando**, `@ts-ignore` nunca. `tsc --noEmit` no CI.

---

## 3. Estrutura de pastas

```
esteticaflow/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                     ← landing  (era landing/index.html)
│   │   ├── login/page.tsx
│   │   └── suporte/page.tsx
│   ├── (app)/                           ← layout autenticado: sidebar, busca, notificações
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── clientes/
│   │   │   ├── page.tsx
│   │   │   ├── novo/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── editar/page.tsx
│   │   │       └── veiculos/[veiculoId]/editar/page.tsx
│   │   ├── agenda/
│   │   │   ├── page.tsx
│   │   │   ├── novo/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── servicos/…
│   │   ├── estoque/…
│   │   ├── financeiro/page.tsx
│   │   ├── relatorios/page.tsx
│   │   ├── configuracoes/page.tsx
│   │   ├── notificacoes/page.tsx
│   │   ├── empresas/page.tsx            ← SUPER_ADMIN
│   │   └── historico/page.tsx           ← SUPER_ADMIN
│   ├── api/
│   │   ├── busca/route.ts
│   │   ├── sessao/ping/route.ts
│   │   ├── agenda/veiculos/route.ts
│   │   └── relatorios/{pdf,excel}/route.ts   ← runtime = 'nodejs'
│   └── error.tsx / not-found.tsx
│
├── src/
│   ├── domain/                          ← FUNÇÕES PURAS. Zero IO, zero framework, zero Next.
│   │   ├── result.ts                    ← Result<T, E> mínimo
│   │   ├── shared/{documento,telefone,texto,tempo}.ts
│   │   ├── plano/{plano,recurso,gate}.ts        ← RN-08, RN-09, matriz plano×recurso
│   │   ├── agendamento/{calculo,conflito,estados}.ts  ← RN-01, RN-02, RN-03
│   │   ├── estoque/{custo,movimentacao}.ts      ← RN-06, RN-07
│   │   ├── cliente/{normalizacao,relacionamento}.ts   ← RN-13, RN-17
│   │   ├── relatorio/{periodo,agregacao}.ts     ← RN-14
│   │   ├── notificacao/{dedupe,truncamento}.ts  ← RN-11
│   │   └── tema/{paleta,validacao}.ts           ← RN-15
│   │
│   ├── db/
│   │   ├── schema/*.ts                  ← Drizzle: uma tabela por arquivo
│   │   ├── client.ts                    ← conexão com pooler
│   │   └── queries/*.ts                 ← leituras e escritas, tipadas
│   │
│   ├── app-services/                    ← orquestração: tx + domínio + persistência + log
│   │   ├── agendamento.ts
│   │   ├── estoque.ts
│   │   ├── cliente.ts
│   │   └── …
│   │
│   ├── auth/
│   │   ├── sessao.ts                    ← cookie assinado (jose), leitura/escrita
│   │   ├── senha.ts                     ← bcrypt
│   │   ├── contexto.ts                  ← substitui SessaoUsuario (empresaId, papel)
│   │   └── guards.ts                    ← exigirAdmin / exigirSuperAdmin / exigirRecurso
│   │
│   ├── actions/                         ← Server Actions (substituem os POST dos controllers)
│   ├── ui/                              ← componentes (shadcn editáveis + próprios)
│   └── env.ts                           ← schema Zod validado no boot
│
├── drizzle/                             ← migrations geradas
├── tests/{unit,e2e}/
└── MIGRATION-MAP.md · ARCHITECTURE.md · README.md
```

**Regra estrutural inegociável:** `src/domain/` não importa nada de `next`, `drizzle`, `react` ou `src/db`. É testável com `vitest` sem nenhum mock. Tudo que hoje está em `*ServiceImpl` e é cálculo/decisão mora aqui; tudo que é IO fica em `app-services` e `db/queries`.

---

## 4. Mapeamento: controller Java → rota Next

Leitura (`GET`) vira **React Server Component**. Escrita (`POST`) vira **Server Action** — exceto os três endpoints JSON, que continuam Route Handlers porque são consumidos por `fetch` do cliente.

| Java | Rota Next | Tipo |
| --- | --- | --- |
| `LoginWebController.inicio` | `app/(public)/page.tsx` | RSC |
| `LoginWebController.login` | `app/(public)/login/page.tsx` | RSC + Server Action `entrar` |
| Spring `formLogin` | Server Action `entrar` | Action |
| Spring `logout` | Server Action `sair` | Action |
| `LoginWebController.suporte` | `app/(public)/suporte/page.tsx` | RSC |
| `DashboardWebController.index` | `app/(app)/dashboard/page.tsx` | RSC |
| `ClienteWebController.listar` | `app/(app)/clientes/page.tsx` | RSC (`searchParams`) |
| `ClienteWebController.novo` | `app/(app)/clientes/novo/page.tsx` | RSC |
| `ClienteWebController.detalhe` | `app/(app)/clientes/[id]/page.tsx` | RSC |
| `ClienteWebController.editar` | `app/(app)/clientes/[id]/editar/page.tsx` | RSC |
| `ClienteWebController.editarVeiculo` | `…/veiculos/[veiculoId]/editar/page.tsx` | RSC |
| `ClienteWebController.salvar` / `.atualizar` | Action `salvarCliente` | Action |
| `ClienteWebController.salvarVeiculo` | Action `salvarVeiculo` | Action |
| `ClienteWebController.{inativar,reativar}` (+ veículo) | Actions `alternarAtivoCliente` / `…Veiculo` | Action |
| `AgendaWebController.index` | `app/(app)/agenda/page.tsx` | RSC |
| `AgendaWebController.novo` | `app/(app)/agenda/novo/page.tsx` | RSC |
| `AgendaWebController.detalhe` | `app/(app)/agenda/[id]/page.tsx` | RSC |
| `AgendaWebController.veiculosDoCliente` | `app/api/agenda/veiculos/route.ts` | Route Handler (JSON) |
| `AgendaWebController.criar` | Action `criarAgendamento` | Action |
| `.iniciar` / `.cancelar` / `.concluir` | Actions `iniciar` / `cancelar` / `concluir` | Action |
| `.marcarPago` / `.registrarPagamento` | Action `registrarPagamento` (uma só — hoje são alias) | Action |
| `ServicoWebController.*` | `app/(app)/servicos/**` + Actions | RSC + Action |
| `EstoqueWebController.*` | `app/(app)/estoque/**` + Actions | RSC + Action |
| `FinanceiroWebController.index` | `app/(app)/financeiro/page.tsx` | RSC |
| `RelatorioWebController.index` | `app/(app)/relatorios/page.tsx` | RSC |
| `RelatorioWebController.pdf` | `app/api/relatorios/pdf/route.ts` | Route Handler (`runtime='nodejs'`) |
| `RelatorioWebController.excel` | `app/api/relatorios/excel/route.ts` | Route Handler (`runtime='nodejs'`) |
| `ConfiguracaoWebController.index` | `app/(app)/configuracoes/page.tsx` | RSC |
| `ConfiguracaoWebController.*` (13 POSTs) | Actions em `src/actions/configuracoes.ts` | Action |
| `NotificacaoWebController.*` | `app/(app)/notificacoes/page.tsx` + Actions | RSC + Action |
| `EmpresaWebController.*` | `app/(app)/empresas/page.tsx` + Actions | RSC + Action |
| `LogWebController.index` | `app/(app)/historico/page.tsx` | RSC |
| `BuscaGlobalController.buscar` | `app/api/busca/route.ts` | Route Handler (JSON) |
| `SessaoApiController.ping` | `app/api/sessao/ping/route.ts` | Route Handler (JSON) |
| `WebExceptionHandler` | `app/error.tsx` + `not-found.tsx` + `Result` nas Actions | — |
| `ApiExceptionHandler` | wrapper de erro nos Route Handlers | — |
| `TemaModelAdvice` | `app/(app)/layout.tsx` (tema, notificações não lidas, recursos do plano) | RSC |
| `EmpresaAcessoInterceptor` | `middleware.ts` + revalidação no layout | Middleware |
| `AutenticacaoSucessoHandler` | dentro da Action `entrar` | Action |

**CSRF:** Server Actions do Next já validam origem por padrão; os Route Handlers `POST` (não há nenhum hoje) e o cookie recebem `SameSite=Lax`. O `_csrf` explícito do Spring deixa de existir — **divergência intencional a registrar**.

---

## 5. Mapeamento: entidade JPA → schema Drizzle

Nomes de tabela e coluna **idênticos** aos atuais (snake_case, português). Isso preserva a leitura do banco e facilita comparar com o sistema antigo.

| Entidade JPA | Tabela | Arquivo Drizzle | Observação |
| --- | --- | --- | --- |
| `Empresa` | `empresa` | `db/schema/empresa.ts` | checks de plano/status/valor preservados |
| `Usuario` | `usuario` | `usuario.ts` | `email` único global (B-8 preservado) |
| `Funcionario` | `funcionario` | `funcionario.ts` | ver A-9 |
| `Cliente` | `cliente` | `cliente.ts` | endereço incluído (V6) |
| `Veiculo` | `veiculo` | `veiculo.ts` | `uq(empresa_id, placa)` |
| `CategoriaServico` | `categoria_servico` | `servico.ts` | |
| `Servico` | `servico` | `servico.ts` | |
| `Agendamento` | `agendamento` | `agendamento.ts` | os 3 checks de V9 preservados |
| `ServicoAgendamento` | `agendamento_servico` | `agendamento.ts` | `uq(agendamento_id, servico_id)` |
| `CategoriaProduto` | `categoria_produto` | `produto.ts` | |
| `Produto` | `produto` | `produto.ts` | embalagem de V14 |
| `Estoque` | `estoque` | `estoque.ts` | `uq(produto_id)` |
| `MovimentacaoEstoque` | `movimentacao_estoque` | `estoque.ts` | tipo/origem/valor com checks |
| `FormaPagamento` | `forma_pagamento` | `financeiro.ts` | |
| `Receita` | `receita` | `financeiro.ts` | **índice único parcial `agendamento_id IS NOT NULL`** |
| `Despesa` | `despesa` | `financeiro.ts` | |
| `LogSistema` | `log` | `log.ts` | |
| `Configuracao` | `configuracao` | `configuracao.ts` | `uq(empresa_id, chave)` |
| `Notificacao` | `notificacao` | `notificacao.ts` | `empresa_id` nullable = escopo SUPER_ADMIN |
| `SolicitacaoAlteracaoEmpresa` | `solicitacao_alteracao_empresa` | `solicitacao.ts` | **único parcial `status='PENDENTE'`** |
| `HistoricoAcesso` | `historico_acesso` | `acesso.ts` | |
| `Backup`, `Fornecedor`, `FuncaoExtra`, `ItemServico` | — | — | **não criados** (código morto, base nova) — ver A-5 |

**Enums:** viram *union types* literais (`'BASICO' \| 'COMPLETO'`) com `pgEnum` ou `varchar + check` no banco, espelhando os checks atuais. Nenhum `enum` do TypeScript.

**Auditoria:** `EntidadeBase` (`dataCriacao`/`dataAtualizacao`) vira colunas com `defaultNow()` e `$onUpdate`, não herança de classe.

**Locks:** `SELECT ... FOR UPDATE` explícito nos dois pontos que hoje usam `PESSIMISTIC_WRITE` (agendamento e estoque), dentro de `db.transaction()`.

**Timestamps:** as colunas são `TIMESTAMP` sem timezone e o Hibernate hoje grava no fuso `America/Sao_Paulo`. Na base nova mantenho `timestamp` sem tz e centralizo **toda** conversão em `domain/shared/tempo.ts`, com o fuso fixo. **Alternativa que recomendo avaliar:** migrar para `timestamptz`, já que a base é nova e isso elimina uma classe inteira de bug (B-1). Precisa da sua decisão.

---

## 6. Plano de fatias verticais (ordem proposta para a Fase 2)

Cada fatia: teste → domínio puro → queries → rota/action → UI → `tsc` + lint + testes verdes → registro no `MIGRATION-MAP.md`. Ordem escolhida por dependência, não por facilidade.

| # | Fatia | Por que nesta ordem |
| --- | --- | --- |
| 0 | Fundação: projeto, tsconfig, tokens de tema, `env.ts`, `Result`, `domain/shared`, schema Drizzle completo + migration inicial + seed | Tudo depende disso. Aqui portamos `DocumentoValidator` e `HorarioSistema` com os testes deles |
| 1 | Auth + sessão + middleware de assinatura + layout autenticado | Nenhuma outra tela funciona sem `empresaId` e `papel` na sessão |
| 2 | Planos e assinatura (`AssinaturaService` → `domain/plano`) | É o gate de tudo. Os 5 testes de `AssinaturaServiceTest` viram testes de paridade |
| 3 | Clientes e veículos | Maior volume de normalização; 13 testes existentes de rede |
| 4 | Serviços e categorias | Pré-requisito da agenda |
| 5 | Agenda (criação, conflito, estados, pagamento) | **A fatia de maior risco** — RN-01 a RN-05 |
| 6 | Estoque | RN-06/RN-07, com o cálculo de embalagem |
| 7 | Financeiro | Depende de receita (agenda) e despesa (estoque) |
| 8 | Relatórios + exportação PDF/XLSX | Depende de tudo acima |
| 9 | Dashboard | Agrega tudo |
| 10 | Notificações e solicitações de alteração | RN-10 a RN-12 |
| 11 | Configurações (tema, sessão, usuários, formas, categorias) | |
| 12 | Plataforma SUPER_ADMIN: empresas + histórico | |
| 13 | Busca global, landing, suporte | |
| 14 | E2E das jornadas + verificação do Definition of Done | |

---

## 7. Design system — direção automotiva, claro e escuro

Tokens definidos **uma vez** em `app/globals.css` como custom properties, consumidos pelo Tailwind. Nenhum valor de cor ou spacing hardcoded em componente.

- **Superfícies:** escala grafite em ambos os modos — no escuro, do quase-preto ao grafite; no claro, do branco ao cinza-frio. Mesma escala semântica (`surface-0` … `surface-3`), valores diferentes por modo.
- **Acento:** derivado do hex do tenant (`tema.cor.hex`), injetado como `--accent` no `<html>` pelo layout do servidor — igual ao que o `head.html` faz hoje. Uso parcimonioso: estado ativo, indicadores, foco. **Contraste AA verificado programaticamente nos dois modos**; se o hex do tenant não atingir AA sobre a superfície, o token derivado é ajustado em luminosidade, não o hex salvo.
- **Tipografia:** fonte técnica/condensada com *tabular numerals* para números e labels (dinheiro, saldos, horários alinham em coluna). Texto corrido em fonte de leitura.
- **Dados como telemetria:** KPIs com valor grande + delta, medidores para saldo vs. mínimo de estoque, barra de tempo estimado na agenda. Sempre com rótulo textual — o dado nunca depende só da cor.
- **Movimento:** transições de 120–180 ms com easing firme (`cubic-bezier(.2,0,0,1)`), sem overshoot. `@media (prefers-reduced-motion: reduce)` desliga tudo que não for opacidade.
- **Acessibilidade (regra dura):** contraste AA, foco visível em todo elemento interativo, navegação completa por teclado, HTML semântico, `aria-live` para os flash messages que hoje são `RedirectAttributes`.

---

## 8. Riscos conhecidos desta arquitetura

| Risco | Mitigação proposta |
| --- | --- |
| Vercel serverless + pooler: `FOR UPDATE` exige transação na mesma conexão | `db.transaction()` do Drizzle com postgres.js em modo transaction pooling; validar com teste de concorrência na fatia 5 |
| Perda do `open-in-view`: qualquer campo não buscado explicitamente vira `undefined` | `noUncheckedIndexedAccess` + queries tipadas por caso de uso, não genéricas |
| Dirty-checking do Hibernate não existe | Toda mutação vira `UPDATE` explícito. Auditado fatia a fatia |
| Layout do PDF não será idêntico ao OpenPDF | Depende da decisão A-10 |
| Filtros hoje em memória (RN-19) podem mudar ordem de empates se virarem SQL | Manter em memória nas primeiras fatias para garantir paridade; otimizar depois só com medição |
| `bcryptjs` puro JS pode deixar o login lento em cold start | Medir na fatia 1; trocar por `@node-rs/bcrypt` se passar de ~300 ms |

---

## 9. Portão da Fase 1 — o que preciso de você

1. **Aprovar ou ajustar o stack** da §1 (especialmente Drizzle vs Prisma, e se `date-fns` entra).
2. **Aprovar a estrutura de pastas** da §3 e os mapeamentos das §4 e §5.
3. **Decidir as ambiguidades restantes** do `MIGRATION-MAP.md` §13: **A-2** (consumidores externos da API), **A-3** (manter paths em português), **A-5** (tabelas mortas), **A-6** (preservar ou corrigir as anomalias B-1 a B-13), **A-9** (CRUD de funcionário), **A-10** (tolerância no layout do PDF), **A-12** (formatação no servidor ou cliente).
4. **Decidir `timestamp` vs `timestamptz`** (§5).

Com isso, começo a Fase 2 pela fatia 0.
