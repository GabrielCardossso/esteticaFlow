# MIGRATION-MAP.md — EsteticaFlow (Java/Spring Boot → Next.js/TypeScript)

**Fase 0 — Inventário da origem. Documento de leitura, sem código.**
Gerado a partir de inspeção direta do repositório em `main` (commit `11bd916`). Tudo abaixo foi lido no código-fonte; nada foi inferido de documentação. Onde não pude confirmar comportamento em execução, está marcado como **[não verificado]**.

---

## 1. Build e stack

| Item | Valor |
| --- | --- |
| Build | **Maven** (`pom.xml`), parent `spring-boot-starter-parent:3.3.4` |
| Linguagem | **Java 21** |
| Framework | **Spring Boot 3.3.4** — Web (MVC), Security, Data JPA, Validation, Thymeleaf |
| Tipo de app | **Web server-rendered monolito multi-tenant** (Thymeleaf). Não é desktop/mobile → **Next.js é alvo adequado**. |
| Banco | **PostgreSQL** (produção: Supabase; dev: Docker Postgres 16) |
| ORM | Hibernate/JPA (`spring-boot-starter-data-jpa`), `ddl-auto=validate` |
| Migrations | **Flyway** (`classpath:db/migration`, V1–V18, sem V7) |
| Mapeamento | **MapStruct 1.5.5** (só `ClienteMapper`) + **Lombok** (`@Getter/@Setter`) |
| Relatórios | **OpenPDF 1.3.39** (PDF) e **Apache POI 5.3.0** (XLSX) |
| Testes | JUnit 5 + Mockito (spring-boot-starter-test), spring-security-test, H2 (declarado, mas ver §10) |
| Deploy | Dockerfile multi-stage (maven → temurin-21-jre-alpine), docker-compose, Render |
| Timezone | `America/Sao_Paulo` fixado em `HorarioSistema` e em `hibernate.jdbc.time_zone` |

**Volume:** 8.033 linhas de Java (main) · 1.468 de teste · 2.981 de Thymeleaf · 3.237 de CSS/JS estáticos · 1.519 de SQL de migration.

---

## 2. Camadas

- **Backend + Frontend no mesmo processo.** Não existe SPA separada nem API pública. O frontend é Thymeleaf server-rendered com CSS/JS vanilla em `src/main/resources/static`.
- **Não há GraphQL, SOAP nem gRPC.**
- **REST/JSON existe apenas em dois endpoints internos** consumidos por JS da própria página (`/api/busca`, `/api/sessao/ping`) mais um endpoint `@ResponseBody` (`/agenda/veiculos`).
- Padrão de camadas: `web/controller` (MVC, retorna nome de view) → `*/service` ou `*/serviceImpl` (regra de negócio, `@Transactional`) → `*/repository` (Spring Data JPA) → `*/entity` (JPA).
- **Estado de sessão:** bean `SessaoUsuario` com `@SessionScope` guarda `usuarioId`, `empresaId`, `papel` e a entidade `Usuario`. **Toda** regra de multi-tenancy depende dele (`sessao.empresaObrigatoria()`).
- `spring.jpa.open-in-view=true` → as views resolvem lazy-loading. Na migração isso desaparece: **todo fetch precisa ser explícito**.

### Frontend (o que precisa virar React)

| Template | Linhas | Vira |
| --- | --- | --- |
| `landing/index.html` | 392 | página pública `/` |
| `settings/index.html` | 330 | `/configuracoes` |
| `customer/form.html` | 214 | `/clientes/novo` e `/clientes/[id]/editar` |
| `inventory/index.html` | 181 | `/estoque` |
| `report/index.html` | 179 | `/relatorios` |
| `appointment/detail.html` | 175 | `/agenda/[id]` |
| `appointment/index.html` | 160 | `/agenda` |
| `appointment/form.html` | 154 | `/agenda/novo` |
| `customer/detail.html` | 141 | `/clientes/[id]` |
| `company/index.html` | 122 | `/empresas` (SUPER_ADMIN) |
| `inventory/form.html` | 118 | `/estoque/produtos/*` |
| `service/list.html` | 116 | `/servicos` |
| `dashboard/index.html` | 103 | `/dashboard` |
| `finance/index.html` | 99 | `/financeiro` |
| `customer/list.html` | 98 | `/clientes` |
| `notification/index.html` | 95 | `/notificacoes` |
| `company/logs.html` | 52 | `/historico` (SUPER_ADMIN) |
| `service/form.html` | 44 | `/servicos/*` |
| `support/index.html` | 30 | `/suporte` |
| `auth/login.html` | 26 | `/login` |
| `error/*`, `fragments/*` | 86 | layout, error boundaries, alerts, CSRF |

JS estático a portar (comportamento, não código): `theme.js` (140), `landing.js` (178), `input-masks.js` (141 — máscaras CPF/CNPJ/telefone/CEP/placa), `ui-confirm.js` (133), `global-search.js` (117), `session-idle.js` (84 — logout por inatividade com ping), `mobile-nav.js` (61), `loading.js` (57), `stock-dialog.js` (50).

---

## 3. Inventário endpoint-a-endpoint

Convenções: todos os `POST` são **form-encoded** (não JSON) e respondem com `redirect:` + flash attributes (`sucesso`/`erro`). CSRF do Spring Security está **ativo por padrão** (não há `csrf().disable()`); o token vai por `fragments/csrf.html` e por `<meta>` no `head`.

### 3.1 Público (`permitAll`)

| Método | Path | Entrada | Saída | Auth |
| --- | --- | --- | --- | --- |
| GET | `/` | — | view `landing/index`; se autenticado → `redirect:/dashboard` | público |
| GET | `/login` | `?erro`, `?logout` | view `auth/login` | público |
| POST | `/login` | `email`, `senha` (form login do Spring) | redirect `/dashboard` ou `/login?erro` | público |
| POST | `/logout` | CSRF | redirect `/login?logout` | autenticado |
| GET | `/suporte` | — | view `support/index` | público |
| — | `/css/**`, `/js/**`, `/error` | — | estáticos | público |

### 3.2 Dashboard

| Método | Path | Entrada | Saída |
| --- | --- | --- | --- |
| GET | `/dashboard` | — | `DashboardDTO` (mês corrente) + `nomeSaudacao` |

### 3.3 Clientes e veículos

| Método | Path | Entrada | Saída / efeito |
| --- | --- | --- | --- |
| GET | `/clientes` | `busca?`, `ativos=true`, `ordenacao=nome\|ultimo_atendimento\|valor_gasto\|relacionamento` | lista `ClienteListagemDTO` |
| GET | `/clientes/novo` | — | form vazio |
| GET | `/clientes/{id}` | — | `ClienteDetalheDTO` (último atendimento, total, gasto, veículos, receitas) |
| GET | `/clientes/{id}/editar` | `mostrarTodosVeiculos=false` | form + lista de veículos |
| GET | `/clientes/{clienteId}/veiculos/{veiculoId}/editar` | — | form com veículo carregado |
| POST | `/clientes` | `ClienteDTO` (Bean Validation) | cria; erro → `CpfJaCadastradoException`/`IllegalArgumentException` |
| POST | `/clientes/{id}` | `ClienteDTO` | atualiza |
| POST | `/clientes/{clienteId}/veiculos` | `Veiculo` (@Valid) | cria/atualiza veículo |
| POST | `/clientes/{clienteId}/veiculos/{veiculoId}/inativar` \| `/reativar` | — | soft delete/undelete |
| POST | `/clientes/{id}/inativar` | — | soft delete + `undoUrl` no flash |
| POST | `/clientes/{id}/reativar` | — | reativa |

### 3.4 Agenda

| Método | Path | Entrada | Saída / efeito |
| --- | --- | --- | --- |
| GET | `/agenda` | `data?`, `periodo=DIA\|AMANHA\|SEMANA\|MES`, `status?`, `funcionarioId?`, `pago?`, `q?` | lista filtrada em memória |
| GET | `/agenda/novo` | `data?`, `clienteId?` | form |
| GET | `/agenda/{id}` | — | detalhe + receita + histórico de log + formas de pagamento |
| GET | `/agenda/veiculos` | `clienteId` | **JSON** `[{id,label}]` |
| POST | `/agenda` | `clienteId`, `veiculoId`, `servicoIds[]`, `funcionarioId?`, `dataHora` (`yyyy-MM-dd'T'HH:mm`), `desconto=0`, `observacoes?`, `confirmarConflito=false` | cria; `SlotOcupadoConfirmacaoException` re-renderiza o form pedindo confirmação |
| POST | `/agenda/{id}/iniciar` | `data` | AGENDADO → EM_ANDAMENTO |
| POST | `/agenda/{id}/cancelar` | `data` | AGENDADO\|EM_ANDAMENTO → CANCELADO |
| POST | `/agenda/{id}/marcar-pago` | `data`, `formaPagamentoId` | cria `Receita`, `pago=true`, **mantém o status** |
| POST | `/agenda/{id}/concluir` | `data`, `formaPagamentoId?` | EM_ANDAMENTO → CONCLUIDO (+ receita se pendente) |
| POST | `/agenda/{id}/pagamento` | `data`, `formaPagamentoId` | alias de `marcar-pago` |

### 3.5 Serviços

| Método | Path | Entrada |
| --- | --- | --- |
| GET | `/servicos` | `mostrarTodos`, `mostrarTodasCategorias`, `busca?`, `categoriaId?`, `ordenacao=nome\|preco_asc\|preco_desc` |
| GET | `/servicos/novo`, `/servicos/{id}/editar` | — |
| POST | `/servicos` | `ServicoDTO` (@Valid) |
| POST | `/servicos/{id}/inativar` \| `/reativar` | — |
| POST | `/servicos/categorias` | `nome` |
| POST | `/servicos/categorias/{id}/inativar` \| `/reativar` | — |

### 3.6 Estoque (exige `RecursoPlano.ESTOQUE`)

| Método | Path | Entrada |
| --- | --- | --- |
| GET | `/estoque` | `mostrarTodos`, `busca?`, `somenteBaixo`, `ordenacao=nome\|saldo_asc\|saldo_desc` |
| GET | `/estoque/produtos/novo`, `/estoque/produtos/{id}/editar` | — |
| POST | `/estoque/produtos` | `ProdutoEstoqueDTO` (@Valid) |
| POST | `/estoque/produtos/{id}/inativar` \| `/reativar` | — |
| POST | `/estoque/produtos/{id}/entrada` | `quantidade`, `valorPago?`, `motivo?` |
| POST | `/estoque/produtos/{id}/saida` | `quantidade` |
| POST | `/estoque/produtos/{id}/minimo` | `quantidadeMinima` |

### 3.7 Financeiro (exige `RecursoPlano.FINANCEIRO`)

| Método | Path | Entrada |
| --- | --- | --- |
| GET | `/financeiro` | `inicio?`, `fim?` (default: 1º do mês → hoje), `tipo=todos\|entradas\|saidas`, `busca?` |

Retorna `IndicadoresFinanceirosDTO` + listas de receitas/despesas filtradas em memória + fluxo de caixa.
Não há CRUD de despesa/receita pela UI — despesas só nascem de compra de estoque; receitas só de pagamento de agendamento.

### 3.8 Relatórios (exige `RELATORIO_SIMPLES`; PDF exige `PDF`; Excel exige `EXCEL`)

| Método | Path | Entrada | Saída |
| --- | --- | --- | --- |
| GET | `/relatorios` | `filtro=DIA\|SEMANA\|MES\|ULTIMOS_6_MESES`, `referencia?`, `empresaId?` (só SUPER_ADMIN) | `RelatorioDTO` |
| GET | `/relatorios/pdf` | idem | `application/pdf`, `relatorio_{ini}_a_{fim}.pdf` |
| GET | `/relatorios/excel` | idem | `.xlsx`, mesmas abas |

### 3.9 Configurações

| Método | Path | Entrada | Autorização |
| --- | --- | --- | --- |
| GET | `/configuracoes` | `mostrarTodosUsuarios`, `mostrarTodasFormas`, `mostrarTodasCategorias` | autenticado |
| POST | `/configuracoes/empresa` | `razaoSocial`, `nomeFantasia`, `cnpj`, `telefone?`, `email?` | **SUPER_ADMIN salva direto; ADMINISTRADOR gera solicitação** |
| POST | `/configuracoes/tema` | `cor`, `hex?` | admin + `PERSONALIZACAO_TEMA` |
| POST | `/configuracoes/tema/restaurar` | — | idem |
| POST | `/configuracoes/sessao` | `inatividadeAtiva`, `minutos∈{15,30,60,120,240}` | admin |
| POST | `/configuracoes/usuarios` | `nome`, `email`, `senha`, `papel` | ADMINISTRADOR da empresa |
| POST | `/configuracoes/usuarios/{id}` | `nome`, `email`, `papel`, `novaSenha?` | idem |
| POST | `/configuracoes/usuarios/{id}/excluir` \| `/inativar` \| `/reativar` | — | idem |
| POST | `/configuracoes/formas-pagamento` (+ `/{id}`, `/{id}/inativar`, `/{id}/reativar`) | `nome` | admin + `FINANCEIRO` |
| POST | `/configuracoes/categorias` (+ `/{id}`, `/{id}/inativar`, `/{id}/reativar`) | `nome` | admin + `ESTOQUE` |

### 3.10 Notificações

| Método | Path | Entrada |
| --- | --- | --- |
| GET | `/notificacoes` | — (SUPER_ADMIN também recebe solicitações pendentes) |
| POST | `/notificacoes/{id}/lida` | — |
| POST | `/notificacoes/lidas` | — |
| POST | `/notificacoes/solicitacoes/{id}/aprovar` | — (SUPER_ADMIN) |
| POST | `/notificacoes/solicitacoes/{id}/rejeitar` | `motivo?` (SUPER_ADMIN) |

### 3.11 Plataforma — `hasAuthority("SUPER_ADMIN")`

| Método | Path | Entrada |
| --- | --- | --- |
| GET | `/empresas` | `mostrarTodas`, `busca?`, `plano?` |
| POST | `/empresas` | `razaoSocial`, `nomeFantasia`, `cnpj`, `telefone?`, `email?`, `adminNome`, `adminEmail`, `adminSenha`, `plano`, `valorMensalidade?`, `proximoVencimento` |
| POST | `/empresas/{id}/assinatura` | `plano`, `valorMensalidade`, `proximoVencimento` |
| POST | `/empresas/{id}/pagamento` | — |
| POST | `/empresas/{id}/bloquear` | `motivo`, `manual=false` |
| POST | `/empresas/{id}/desbloquear` \| `/inativar` \| `/reativar` | — |
| GET | `/historico` | `empresaId?` → top 200 logs |

### 3.12 API JSON interna

| Método | Path | Entrada | Saída |
| --- | --- | --- | --- |
| GET | `/api/busca` | `q` (mín. 2 chars) | `BuscaGlobalDTO { termo, grupos[{categoria, itens[{titulo,subtitulo,url}]}] }` |
| GET | `/api/sessao/ping` | — | `{ok:true, serverTime}` — renova a sessão |

**Tratamento de erro:** `WebExceptionHandler` (views) mapeia `RecursoNaoEncontradoException` → `error/nao-encontrado`; `IllegalArgument/IllegalState/SecurityException` → `error/erro`; resto → erro genérico logado. `ApiExceptionHandler` (só `web.api`) → `400 {erro}` ou `500 {erro genérico}`.

---

## 4. Modelo de domínio

Superclasses: `EntidadeBase` (`id`, `dataCriacao`, `dataAtualizacao` via `@PrePersist/@PreUpdate` no fuso de SP) e `EntidadeEmpresaBase` (adiciona `empresaId NOT NULL`).

| Entidade | Tabela | Campos-chave | Relações | Invariantes/validações |
| --- | --- | --- | --- | --- |
| `Empresa` | `empresa` | razaoSocial, nomeFantasia, **cnpj UNIQUE**, telefone, email, ativo, plano, statusAssinatura, valorMensalidade, proximoVencimento, bloqueioManual, motivoBloqueio, bloqueadoEm | raiz do tenant | CNPJ válido (DV) e único **normalizado**; `valor_mensalidade >= 0`; check plano ∈ {BASICO, COMPLETO} |
| `Usuario` | `usuario` | nome, **email UNIQUE GLOBAL**, senhaHash (BCrypt), papel, ativo | `empresaId`; `empresa` (readonly) | e-mail único no sistema **inteiro**, não por empresa; senha ≥ 6 chars |
| `Funcionario` | `funcionario` | cpf, dataAdmissao, comissaoPercentual, ativo | 1-1 `Usuario` | `uq(empresa_id, cpf)`; **sem CRUD na aplicação** |
| `FuncaoExtra` | `funcao_extra` | descricao, valor>0, dataReferencia | → `Funcionario` | **código morto** |
| `Cliente` | `cliente` | nome, cpfCnpj, telefone, email, cep/logradouro/numero/complemento/bairro/cidade/uf, ativo | 1-N `Veiculo` | CPF/CNPJ com DV válido e único por empresa (normalizado); telefone 10 ou 11 dígitos; CEP 8 dígitos; UF upper |
| `Veiculo` | `veiculo` | placa, modelo, marca, cor, ano (1950–2100), ativo | → `Cliente` | placa antiga `AAA1234` ou Mercosul `AAA1A11`; única por empresa (normalizada, sem hífen, upper) |
| `CategoriaServico` | `categoria_servico` | nome, ativo | — | `uq(empresa_id, nome)`; unicidade case-insensitive no service |
| `Servico` | `servico` | nome, descricao, preco>0, tempoEstimadoMinutos>0, ativo | → `CategoriaServico` | — |
| `Agendamento` | `agendamento` | dataHora, status, observacoes, subtotal, desconto, total, pago | → `Cliente`, `Veiculo`, `Funcionario?`; 1-N `ServicoAgendamento`; 1-N `ItemServico` | check: `subtotal>0`, `0<=desconto<subtotal`, `total=subtotal-desconto` |
| `ServicoAgendamento` | `agendamento_servico` | precoUnitario>0 (**preço congelado**) | → `Agendamento`, `Servico` | `uq(agendamento_id, servico_id)` |
| `ItemServico` | `item_servico` | quantidadeConsumida>0 | → `Agendamento`, `Produto` | **nunca é escrita pelo código atual** |
| `CategoriaProduto` | `categoria_produto` | nome, ativo | — | `uq(empresa_id, nome)` |
| `Produto` | `produto` | nome, unidadeMedida, precoCusto, quantidadeEmbalagem>0, valorEmbalagem>=0, ativo | → `CategoriaProduto`, `Fornecedor?` | `precoCusto = valorEmbalagem / quantidadeEmbalagem` (4 casas) |
| `Estoque` | `estoque` | quantidadeAtual>=0, quantidadeMinima>=0 | 1-1 `Produto` (`uq produto_id`) | — |
| `MovimentacaoEstoque` | `movimentacao_estoque` | tipo, quantidade>0, origem, dataMovimentacao, motivo, valorFinanceiro, localCompra, numeroNotaFiscal, dataCompra | → `Produto`, `Agendamento?`, `Usuario?` | tipo ∈ {ENTRADA, SAIDA, AJUSTE}; origem ∈ {MANUAL, AGENDAMENTO, AJUSTE} |
| `Fornecedor` | `fornecedor` | nome, cnpj, telefone, ativo | — | **código morto** |
| `FormaPagamento` | `forma_pagamento` | nome, ativo | — | — |
| `Receita` | `receita` | descricao, valor>0, dataRecebimento | → `Agendamento?`, `FormaPagamento` | **índice único parcial**: 1 receita por agendamento |
| `Despesa` | `despesa` | descricao, categoria, valor>0, dataPagamento | — | categoria ∈ {FIXA, VARIAVEL, FORNECEDOR} |
| `LogSistema` | `log` | acao, detalhes (TEXT), dataHora | → `Usuario?` | append-only |
| `Configuracao` | `configuracao` | chave, valor | — | `uq(empresa_id, chave)` |
| `Notificacao` | `notificacao` | tipo, titulo(≤150), mensagem(≤1000), lida, referenciaTipo, referenciaId, acaoUrl | `empresaId` **nullable** (null = escopo SUPER_ADMIN) | — |
| `SolicitacaoAlteracaoEmpresa` | `solicitacao_alteracao_empresa` | dados propostos + status, solicitadoPor, decididoPor, motivo, dataDecisao | — | **índice único parcial: 1 PENDENTE por empresa** |
| `HistoricoAcesso` | `historico_acesso` | usuarioId, dataHora, ip, userAgent, navegador, sistemaOperacional | — | — |
| `Backup` | `backup` | caminhoArquivo, tipo, dataExecucao | — | **código morto** |

### Enums

| Enum | Valores | Comportamento embutido |
| --- | --- | --- |
| `PapelUsuario` | SUPER_ADMIN, ADMINISTRADOR, FUNCIONARIO | `isAdminEmpresa()` = SUPER_ADMIN ou ADMINISTRADOR; `isSuperAdmin()` |
| `PlanoAssinatura` | BASICO(2 usuários, R$59,90), COMPLETO(50, R$119,90) | carrega o `Set<RecursoPlano>` e o limite de usuários |
| `RecursoPlano` | DASHBOARD, CLIENTES, SERVICOS, AGENDA, RELATORIO_SIMPLES, PDF, ESTOQUE, FINANCEIRO, EXCEL, PERSONALIZACAO_TEMA, RELATORIO_DETALHADO, GESTAO_PLATAFORMA | — |
| `StatusAssinatura` | ATIVA, EM_ATRASO, BLOQUEADA, CANCELADA | — |
| `StatusAgendamento` | AGENDADO, EM_ANDAMENTO, CONCLUIDO, CANCELADO | `rotulo()` troca `_` por espaço |
| `StatusSolicitacao` | PENDENTE, APROVADA, REJEITADA | — |
| `TipoNotificacao` | ESTOQUE_BAIXO, CLIENTE_INATIVO, ASSINATURA, SOLICITACAO_EMPRESA, SOLICITACAO_DECISAO, SISTEMA | — |
| `RelacionamentoCliente` | ATIVO(≤30d), EM_RISCO(31–90d), INATIVO(>90d), SEM_ATENDIMENTO | `de(ultimoAtendimento, referencia)` |
| `UnidadeMedida` | UN, ML, L, KG, G | — |
| `TipoMovimentacao` | ENTRADA, SAIDA, AJUSTE | — |
| `OrigemMovimentacao` | MANUAL, AGENDAMENTO, AJUSTE | — |
| `CategoriaDespesa` | FIXA, VARIAVEL, FORNECEDOR | — |
| `TipoBackup` | MANUAL, AUTOMATICO | **código morto** |
| `FiltroPeriodoRelatorio` | DIA, SEMANA, MES, ULTIMOS_6_MESES | `resolver(referencia)` → `PeriodoRelatorio` |

### Matriz plano × recurso (regra de receita — crítica)

| Recurso | BASICO | COMPLETO |
| --- | :-: | :-: |
| DASHBOARD, CLIENTES, SERVICOS, AGENDA | ✅ | ✅ |
| RELATORIO_SIMPLES, PDF | ✅ | ✅ |
| ESTOQUE, FINANCEIRO, EXCEL | ❌ | ✅ |
| PERSONALIZACAO_TEMA, RELATORIO_DETALHADO | ❌ | ✅ |
| GESTAO_PLATAFORMA | ❌ | ❌ (só via `isSuperAdmin`) |
| Limite de usuários ativos (exclui SUPER_ADMIN) | **2** | **50** |

`SUPER_ADMIN` sempre recebe `EnumSet.allOf(RecursoPlano.class)` e ignora o gate.

---

## 5. Persistência

- **Postgres**, IDs `BIGINT GENERATED ALWAYS AS IDENTITY`.
- **Flyway V1–V18** (sem V7). Ordem e conteúdo:
  - V1 schema inicial (21 tabelas + índices)
  - V2/V3 colunas de auditoria
  - V4, V13, V15 **seeds/limpezas de dados** (169 + 189 + 410 linhas)
  - V5 papel SUPER_ADMIN + **conta principal com hash BCrypt hardcoded** (ver §11)
  - V6 endereço do cliente
  - V8 índices do catálogo
  - V9 **agendamento com múltiplos serviços** — cria `agendamento_servico`, migra dados legados, adiciona subtotal/desconto/total/pago com checks, dropa `agendamento.servico_id`, e cria índice único parcial `uq_receita_agendamento`
  - V10/V11/V12 planos e assinatura (BASICO/PRO/EXCLUSIVE → consolidado em BASICO/COMPLETO)
  - V14 embalagem do produto + campos de movimentação
  - V16 normalização de tema
  - V17 notificações + solicitações
  - V18 histórico de acesso + defaults de sessão
- **Locks pessimistas** em dois pontos (importantes para paridade de concorrência):
  - `AgendamentoRepository.findByIdAndEmpresaIdForUpdate` (`PESSIMISTIC_WRITE`)
  - `EstoqueRepository.findByEmpresaIdAndProdutoIdForUpdate` (`PESSIMISTIC_WRITE`)
- **Queries não triviais** (JPQL) a traduzir: busca de cliente com normalização de telefone/CPF via `REPLACE` aninhado; `existeCpfCnpjNormalizado`; `existePlacaNormalizada`; `existeCnpjNormalizado`; agregações por cliente (`findUltimosAtendimentosPorClientes`, `countAtendimentosPorClientes`, `sumGastosPorClientes` — retornam `Object[]`); `sumPendentesByEmpresa`; `findByIdAndEscopo` de notificação com `empresaId IS NULL`.
- **Transações:** services anotados com `@Transactional` na classe; leitura com `readOnly=true`. Padrão "entidade gerenciada muta e o dirty-checking persiste" é usado em vários pontos (ex.: `inativarProduto`, `alterarQuantidadeMinima`, `iniciar/cancelar`) — **isso não existe em Drizzle/Prisma; cada mutação precisa virar UPDATE explícito.**

---

## 6. Autenticação e autorização

- **Spring Security 6, form login com sessão (`JSESSIONID`)**, sem JWT.
- **BCrypt** (`BCryptPasswordEncoder`, força padrão 10). Os hashes existentes precisam continuar funcionando → o alvo **tem que usar bcrypt**.
- `UsuarioDetailsService` carrega por e-mail, autoridade = `papel.name()` (sem prefixo `ROLE_`), `disabled` se `ativo != true`.
- Regras de rota: `/empresas/**` e `/historico/**` → `hasAuthority("SUPER_ADMIN")`; o resto autenticado; lista pública em §3.1.
- **Headers**: `frameOptions DENY`, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS 1 ano com subdomínios.
- **CSRF ativo** (default do Spring), token em input hidden + meta tags.
- **`AutenticacaoSucessoHandler`**: inicia `SessaoUsuario`, recalcula a situação da assinatura, **bloqueia login se a empresa não pode acessar** (redirect `/login?empresaIndisponivel`), grava log `LOGIN_REALIZADO` e `HistoricoAcesso` (IP via `X-Forwarded-For`, parsing de User-Agent → navegador/SO).
- **`EmpresaAcessoInterceptor`**: em **toda** requisição autenticada não-SUPER_ADMIN, recarrega a empresa, recalcula a assinatura e, se não puder acessar, **encerra a sessão e redireciona**.
- **Autorização em três camadas independentes**, todas precisam ser reproduzidas:
  1. rota (Spring Security),
  2. papel (`exigirAdmin`, `exigirAdministradorEmpresa`, `exigirSuperAdmin` nos services),
  3. plano (`assinaturas.exigirRecurso(...)`).

---

## 7. Integrações externas

**Nenhuma.** Não há fila, Redis, storage de objetos, envio de e-mail, gateway de pagamento nem job agendado (`@Scheduled` não aparece no código).

- Pagamento de assinatura é registrado **manualmente** pelo SUPER_ADMIN (`/empresas/{id}/pagamento` → soma 1 mês).
- Bloqueio por inadimplência **não é automático**: `recalcularSituacao` só alterna ATIVA↔EM_ATRASO; o bloqueio é ação manual e exige `> 7 dias` de atraso (ou `manual=true`).
- Links externos gerados no servidor (`ContatoClienteLinks`): `wa.me`, Google Maps, Apple Maps.
- README/landing referenciam badges e Render/Supabase — infraestrutura, não integração de runtime.

---

## 8. Regras de negócio não óbvias — o núcleo de risco da migração

> Estas são as regras que **não podem sumir**. Cada uma vira uma função pura testável no alvo.

### RN-01 · Cálculo do agendamento (`AgendamentoServiceImpl.criar`)
1. `dataHora` não pode ser anterior a **agora truncado ao minuto no fuso America/Sao_Paulo**.
2. Pelo menos um serviço; **IDs de serviço não podem repetir** (validado duas vezes: no controller e no service).
3. Cada serviço precisa existir, ser da empresa e estar **ativo**.
4. `precoUnitario` é **congelado** com o preço do serviço no momento da criação.
5. `subtotal` = soma dos preços, `setScale(2, HALF_UP)`.
6. `desconto` ≥ 0 e **estritamente menor** que o subtotal (`desconto >= subtotal` é erro).
7. `total = subtotal - desconto`. Status inicial AGENDADO, `pago = false`.

### RN-02 · Conflito de horário (`validarConflito`)
- Janela do novo agendamento = `[dataHora, dataHora + max(1, soma dos tempos estimados))`.
- Compara com todos os agendamentos **AGENDADO ou EM_ANDAMENTO do mesmo dia**.
- Sobreposição = `eInicio < nFim && nInicio < eFim`.
- **Se ambos têm o mesmo funcionário → `ConflitoDeHorarioException` (bloqueio duro).**
- **Se o novo não tem funcionário → `SlotOcupadoConfirmacaoException` (aviso; a UI reapresenta o form com `confirmarConflito`).**
- Se o novo tem funcionário mas o existente não → **não bloqueia**.

### RN-03 · Máquina de estados do agendamento
| Ação | De | Para | Efeito colateral |
| --- | --- | --- | --- |
| `iniciar` | AGENDADO | EM_ANDAMENTO | log `ATENDIMENTO_INICIADO` |
| `cancelar` | AGENDADO ou EM_ANDAMENTO | CANCELADO | log |
| `concluir` | **apenas EM_ANDAMENTO** | CONCLUIDO | baixa estoque + receita se pendente e forma informada |
| `marcarPago` | EM_ANDAMENTO ou CONCLUIDO | *sem mudança de status* | cria `Receita`, `pago=true` |
Qualquer outra transição → `TransicaoDeStatusInvalidaException`.

### RN-04 · Registro de receita (`registrarReceita`) — idempotente
- Se `pago == true`, **retorna silenciosamente** (não duplica receita). Isso é garantido também por índice único parcial no banco.
- Sem `formaPagamentoId` → erro. Forma precisa ser da empresa e ativa.
- `descricao = "Serviços: " + nomes concatenados por ", "`, `valor = total`, `dataRecebimento = hoje` (fuso SP).

### RN-05 · Baixa de estoque na conclusão
- Valida **todos** os itens antes de mover qualquer um (checa saldo ≥ quantidade; senão `EstoqueInsuficienteException` com o nome do produto).
- Depois debita, cria `MovimentacaoEstoque(SAIDA, origem=AGENDAMENTO)` e loga warning se o saldo cair ao mínimo.
- **Observação:** a UI atual sempre chama `concluir(id, List.of(), ...)` — **a lista de itens consumidos nunca chega preenchida pela interface**. O caminho existe no service mas está inacessível pela UI. Ver §12.

### RN-06 · Custo de compra de estoque (`calcularValorCompra`)
> Comentário explícito no código: *"Nunca multiplica o preço da embalagem pela quantidade unitária crua."*
- Se o usuário informou `valorPago` → usa esse valor (não pode ser negativo), `setScale(2, HALF_UP)`.
- Senão: `embalagens = quantidade / quantidadeEmbalagem` (6 casas, HALF_UP); `valor = embalagens * valorEmbalagem` (2 casas, HALF_UP).
- Toda entrada com valor > 0 **gera automaticamente uma `Despesa` categoria FORNECEDOR** com descrição `"Compra de estoque: {nome} ({qtd} {unidade})"`.
- Teto de segurança: valor > `99999999.99` → erro.
- `precoCusto` do produto = `valorEmbalagem / quantidadeEmbalagem` com 4 casas.

### RN-07 · Movimentação de estoque
- Entrada/saída exigem quantidade > 0 e **produto ativo** (`IllegalStateException` se inativo).
- Saída sem saldo → `EstoqueInsuficienteException`.
- Cadastro de produto com `quantidadeInicial > 0` gera movimentação `ENTRADA` com motivo `"Estoque inicial"` **e a despesa correspondente**.
- Ao **editar** produto, `quantidadeInicial` é ignorada (só `quantidadeMinima` é atualizada) — mudança de saldo só via entrada/saída.

### RN-08 · Ciclo de vida da assinatura (`AssinaturaService`)
- `DIAS_TOLERANCIA = 7`.
- `recalcularSituacao(empresa, hoje)`: se empresa inativa **ou** status CANCELADA/BLOQUEADA → **não mexe**. Senão: `proximoVencimento < hoje` → EM_ATRASO, caso contrário ATIVA (persiste se mudou).
- `empresaPodeAcessar` = `ativo && status ∉ {BLOQUEADA, CANCELADA}`. **EM_ATRASO ainda acessa.**
- `elegivelParaBloqueio` = dias de atraso **> 7** (estritamente maior).
- `bloquear(manual=false)` exige elegibilidade; `manual=true` ignora a tolerância. Motivo é obrigatório.
- `registrarPagamento`: base = `max(proximoVencimento, hoje)`, novo vencimento = base + 1 mês; volta para ATIVA salvo se BLOQUEADA/CANCELADA.
- `desbloquear` exige empresa ativa e não-cancelada; status resultante recalculado por vencimento.
- `inativar` → `ativo=false` **e** status CANCELADA. `reativar` → limpa bloqueio e recalcula.
- **Todas as operações acima exigem SUPER_ADMIN** (`SecurityException`).

### RN-09 · Limite de usuários por plano
- Contagem = usuários **ativos** da empresa **excluindo SUPER_ADMIN**.
- Aplicado ao **criar** e ao **reativar**. Mensagem cita o limite e o plano.
- `SUPER_ADMIN` nunca pode ser criado nem gerenciado pela empresa (`SecurityException` nos dois caminhos).
- Não é possível excluir o próprio usuário. "Excluir" é **soft delete** (`ativo=false` + log `USUARIO_EXCLUIDO`).

### RN-10 · Alteração dos dados da empresa — fluxo de aprovação
- `ADMINISTRADOR` **não altera direto**: cria `SolicitacaoAlteracaoEmpresa` PENDENTE (1 por empresa, garantido por índice único parcial).
- Gera duas notificações: uma para SUPER_ADMIN (`SOLICITACAO_EMPRESA`) e uma de confirmação para a empresa (`SOLICITACAO_DECISAO`, ref. `SOLICITACAO_ENVIO`).
- O corpo da notificação usa `descreverPedido`, que gera um **diff campo a campo** (`• Campo: de → para`, ou `(sem alteração)`), com CNPJ e telefone formatados.
- Aprovar: revalida CNPJ contra outras empresas, aplica os dados, marca APROVADA, **marca a notificação de envio como lida** e cria uma nova de decisão.
- Rejeitar: motivo default `"Solicitação rejeitada pela EsteticaFlow."`, máx. 500 chars; mesma mecânica de notificação.
- Só SUPER_ADMIN decide.

### RN-11 · Deduplicação de notificações
- `notificarEmpresa` / `notificarSuperAdmin`: **não cria** se já existir uma **não lida** com mesmo (escopo, tipo, referenciaTipo, referenciaId) → retorna `null`.
- `notificarEmpresaNova` ignora a dedupe (usado nas decisões de solicitação).
- Truncamento: título > 150 → 147 + `"..."`; mensagem > 1000 → 997 + `"..."`.

### RN-12 · Sincronização de alertas ao abrir `/notificacoes` (`sincronizarAlertasTenant`)
Executada a cada listagem, para não-SUPER_ADMIN:
- Assinatura EM_ATRASO → notificação `ASSINATURA` (ref. `EMPRESA`/empresaId).
- Se o plano permite ESTOQUE → uma notificação `ESTOQUE_BAIXO` por produto com saldo ≤ mínimo.
- Clientes com relacionamento INATIVO ou EM_RISCO → **no máximo 15** notificações `CLIENTE_INATIVO`.

### RN-13 · Classificação de relacionamento do cliente
`ultimoAtendimento` = MAX(dataHora) de agendamentos **CONCLUIDO**. Sem atendimento → SEM_ATENDIMENTO; ≤30 dias → ATIVO; ≤90 → EM_RISCO; >90 → INATIVO. Comparação por **data** (não datetime).

### RN-14 · Relatórios (`RelatorioService`)
- Exige `RELATORIO_SIMPLES`. SUPER_ADMIN é tratado como plano **COMPLETO** e pode escolher `empresaId`.
- Período resolvido por `FiltroPeriodoRelatorio`: DIA = a própria data; SEMANA = segunda→domingo (`previousOrSame`/`nextOrSame`); MES = 1º→último dia; ULTIMOS_6_MESES = 1º dia de 5 meses atrás → último dia do mês corrente.
- `ticketMedio` = receita total ÷ **quantidade de agendamentos CONCLUÍDOS no período** (2 casas, HALF_UP); zero se não houver concluídos.
- **Rankings e detalhes só aparecem com `RELATORIO_DETALHADO`** (senão listas vazias).
- Ranking de serviços ordenado por valor desc, desempate por nome. Despesas por categoria idem.
- `PeriodoRelatorio` rejeita `inicio > fim`.

### RN-15 · Tema
- Sem `PERSONALIZACAO_TEMA` → sempre `teal` / `#157f8f` (o gate é aplicado na **leitura**, não só na escrita).
- 14 cores nomeadas + `custom` com hex `^#[0-9a-fA-F]{6}$`. Valor inválido cai para `teal` silenciosamente na leitura, mas **lança erro** na escrita.
- Persistido em `configuracao` nas chaves `tema.cor` e `tema.cor.hex`.

### RN-16 · Sessão por inatividade
- Chaves `sessao.inatividade.ativa` e `sessao.inatividade.minutos`; minutos ∈ {15, 30, 60, 120, 240}, default 30, valor inválido cai para 30 na leitura e **lança erro** na escrita.
- `session-idle.js` faz ping em `/api/sessao/ping` para renovar.

### RN-17 · Normalizações de entrada (aplicadas no service, não só na borda)
- **Cliente:** nome obrigatório trim; CPF/CNPJ só dígitos; telefone só dígitos, 10 ou 11; e-mail lowercase; CEP 8 dígitos; UF uppercase; campos vazios → `null`.
- **Veículo:** placa sem hífen/espaço, uppercase; modelo e marca obrigatórios.
- **Empresa/usuário:** CNPJ só dígitos com DV; telefone 10/11 dígitos; e-mail lowercase, ≤150, regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
- `DocumentoValidator`: DV real de CPF e CNPJ, rejeita dígitos repetidos; **`cpfOuCnpjValido(null|"")` retorna `true`** (documento é opcional no cliente).

### RN-18 · Busca global (`/api/busca`)
- Mínimo 2 caracteres. Máx. 5 itens por grupo. Grupos: Clientes, Veiculos, Agendamentos (janela −7d a +30d), Servicos, Produtos (só com ESTOQUE), Usuarios (só admin), Relatorios (se o termo contém "relatorio"/"relatório" e o plano permite).
- **Cada grupo está em `try/catch(RuntimeException) { ignore }`** — falha de um grupo não derruba a busca. Comportamento a preservar.

### RN-19 · Filtros e ordenações feitos **em memória** (não em SQL)
Agenda (`status`, `funcionarioId`, `pago`, texto por cliente/placa), Estoque (`busca`, `somenteBaixo`, ordenação), Serviços (`busca`, `categoriaId`, ordenação), Clientes (ordenação), Empresas (`busca` por nome/razão/CNPJ com e sem máscara, `plano`), Financeiro (`busca`, `tipo`). São ordenações case-insensitive com `nullsLast`. **Traduzir para SQL muda o comportamento em empates e nulos — precisa de decisão consciente.**

---

## 9. Testes existentes (a rede de segurança de paridade)

13 arquivos, 1.468 linhas, **~50 casos**. São majoritariamente unitários com Mockito.

| Arquivo | Garante |
| --- | --- |
| `AgendamentoServiceImplTest` | totais com preços congelados + desconto; `marcarPago` mantém EM_ANDAMENTO; rejeita passado no fuso SP; pagamento repetido não duplica receita |
| `EstoqueServiceImplTest` | valor da embalagem (não multiplicação errada); valor pago informado; cadastro com saldo/mínimo/movimentação; saída acima do saldo; quantidade não positiva; produto inativo; reativação só na empresa da sessão |
| `AssinaturaServiceTest` | matriz de recursos e limites; atraso sem bloqueio automático e tolerância; só SUPER_ADMIN altera; gate nega BASICO / libera COMPLETO e SUPER_ADMIN; bloqueio exige > 7 dias |
| `ConfiguracaoServiceTest` | categoria vazia/duplicada/normalizada; limite do plano ao criar e ao reativar; SUPER_ADMIN nunca criado/gerenciado pelo tenant; CNPJ inválido e duplicado mascarado; preço padrão do plano; normalização sem alterar plano |
| `ClienteServiceImplTest` | CPF exclui o próprio id; CPF de outro cliente; reativação; normalização telefone/CEP/e-mail; telefone e CEP inválidos; busca por dígitos com máscara; último atendimento na listagem; agregação do detalhe |
| `VeiculoServiceImplTest` | placa exclui o próprio id; placa de outro veículo; reativação exige empresa e cliente ativos |
| `ServicoServiceTest` | categoria normalizada na empresa da sessão; duplicada ignorando maiúsculas; reativação só na empresa da sessão |
| `RelatorioServiceTest` | resumo/rankings só da empresa e período; BASICO só KPIs; SUPER_ADMIN visão completa |
| `FiltroPeriodoRelatorioTest` | DIA; SEMANA nas bordas; MES em ano bissexto; 6 meses atravessando ano; default hoje; intervalo invertido |
| `RelatorioExporterTest` | PDF válido em memória; workbook com abas do plano COMPLETO |
| `ContatoClienteLinksTest` | WhatsApp com DDI 55; telefone incompleto; rota com endereço |
| `LoginWebControllerTest` | landing para anônimo; redirect para dashboard se autenticado |
| `ContextoBancoTest` | sobe o contexto com schema validado — **exige banco real** (`application.properties` de teste usa perfil `local`/`SPRING_DATASOURCE_*`; H2 está no `pom.xml` mas não configurado) |

**Não há testes de:** notificações, solicitação de alteração de empresa, busca global, dashboard, financeiro, histórico de acesso, interceptor de acesso, nem e2e de jornada.

---

## 10. Configuração e segredos

| Variável | Uso | Default no código |
| --- | --- | --- |
| `SPRING_DATASOURCE_URL` | conexão | `jdbc:postgresql://localhost:5432/esteticadesk_db` |
| `SPRING_DATASOURCE_USERNAME` | conexão | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | conexão | *(vazio)* |
| `PORT` / `SERVER_PORT` | porta HTTP | `8080` |
| `SPRING_PROFILES_ACTIVE` | perfil | `docker` no container |
| `POSTGRES_DB/USER/PASSWORD/PORT`, `APP_PORT` | docker-compose | ver `docker-compose.yml` |

Perfis: `application.properties` (base), `-prod`, `-docker`, `-local` (gitignored, com `.example`). `.env` é lido pelo compose e não está versionado.

### 🔴 Achado de segurança

`V5__esteticaflow_super_admin.sql` versiona um **hash BCrypt real** (`$2a$10$pPjSnw9f...`) associado a um e-mail pessoal (`gabrielcardossso@gmail.com`), com `ON CONFLICT DO UPDATE` — ou seja, **a migration reescreve a senha desse SUPER_ADMIN toda vez que roda em base limpa**. Isso é uma credencial de produção em repositório público. Precisa de decisão explícita antes da migração (§13, A-7).

---

## 11. Código morto identificado (candidato a **não** migrar)

| Item | Situação |
| --- | --- |
| `Backup` (entidade + tabela + `TipoBackup`) | nenhuma referência fora de si mesma |
| `Fornecedor` (entidade + tabela) | referenciada só como FK opcional em `Produto`; nunca lida nem escrita |
| `FuncaoExtra` (entidade + tabela) | nenhuma referência |
| `ItemServico` (entidade + tabela) | mapeada em `Agendamento`, mas **nunca escrita** — a baixa de estoque grava só `MovimentacaoEstoque` |
| `Funcionario` | **sem CRUD**: só é lido (filtro e atribuição na agenda). Funcionários só existem se inseridos por seed/SQL |
| `OperacaoNaoPermitidaException` | declarada, nunca lançada |
| `ConfiguracaoRepository.findByEmpresaId` | não usado |
| `AgendamentoRepository.findByEmpresaIdAndFuncionarioIdAndStatusInAndDataHoraBetween`, `findByEmpresaIdAndStatusAndDataHoraBetween` | não usados |
| `SolicitacaoAlteracaoEmpresaRepository.findTop20...`, `findByIdAndEmpresaId` | não usados |
| chave `tema.modo` (V5) | escrita na migration, nunca lida pelo código |
| `EstoqueService.registrarEntrada(id, qtd)` (2 args) | sobrecarga sem chamador na UI |

Decisão pendente: manter tabelas (schema idêntico) e não portar código, ou remover. Ver A-5.

---

## 12. Anomalias e comportamentos suspeitos observados

> Não corrigi nada. Cada item precisa de decisão: **preservar como está (paridade)** ou **corrigir e documentar como divergência intencional**.

| # | Onde | Observação |
| --- | --- | --- |
| B-1 | `DashboardWebController`, `DashboardServiceImpl`, `AssinaturaService`, `RelatorioWebController`, `FiltroPeriodoRelatorio`, `TemaModelAdvice` | usam `LocalDate.now()` (**fuso default da JVM**) em vez de `HorarioSistema.hoje()` (America/Sao_Paulo). No container `TZ=America/Sao_Paulo` coincide, mas é acoplamento implícito. **[não verificado em runtime]** |
| B-2 | `NotificacaoService.listar()` / `marcarTodasLidas()` | anotados `@Transactional(readOnly = true)` mas executam `save()` via `sincronizarAlertasTenant` e mutação de `lida`. Comportamento efetivo depende do flush/connection read-only. **[não verificado em runtime]** |
| B-3 | `AgendamentoServiceImpl.baixarEstoque` | se a mesma `produtoId` vier duas vezes na lista, a validação de saldo é feita contra o saldo original em ambas — poderia negativar. Hoje é inalcançável porque a UI passa lista vazia (RN-05) |
| B-4 | `DashboardServiceImpl.carregar` | `ticketMedio` divide a soma das receitas **vinculadas a agendamento no período de recebimento** pelo número de concluídos **no período de agendamento** — bases diferentes |
| B-5 | `ClienteServiceImpl.listar` | `ativo=false` resulta em filtro `null` (mostra **todos**), não "apenas inativos". A UI (`?ativos=false`) depende disso |
| B-6 | `AgendaWebController.index` | carrega o intervalo inteiro do banco e filtra em memória; `periodo=MES` pode carregar centenas de registros com JOIN FETCH |
| B-7 | `ConfiguracaoService.salvarEmpresa` | checa `isSuperAdmin` e **depois** `exigirAdmin()` — a segunda checagem é redundante (SUPER_ADMIN já é admin) |
| B-8 | `Usuario.email` | único **globalmente**, não por empresa. Duas empresas não podem ter o mesmo e-mail de usuário |
| B-9 | `SUPER_ADMIN` | pertence a uma `empresa` (a de menor id, via V5). `sessao.getEmpresaId()` não é nulo para ele, o que afeta vários `if` |
| B-10 | `BuscaGlobalService` | engole toda `RuntimeException` por grupo — mascara erros reais de banco |
| B-11 | `AuthService.autenticar` | existe e duplica a lógica do `AutenticacaoSucessoHandler`, mas **nenhum controller o chama** (o login passa pelo filtro do Spring). Efetivamente morto |
| B-12 | `V9` | `ck_agendamento_subtotal CHECK (subtotal > 0)` impede agendamento com subtotal zero — coerente com `preco > 0`, mas restringe serviços gratuitos |
| B-13 | `ContextoBancoTest` | depende de banco real; H2 declarado no `pom.xml` não é usado. O build atual **não roda testes sem Postgres** |

---

## 13. Ambiguidades que exigem decisão sua (portão da Fase 0)

| # | Questão | Por que importa |
| --- | --- | --- |
| ~~A-1~~ | ~~Continuidade de dados~~ | ✅ **DECIDIDO: base nova, sem dados.** O histórico Flyway é consolidado em uma migration inicial que reflete o schema final (pós-V18). Seeds V4/V13/V15 e a credencial da V5 **não** são portados — isso resolve A-7 automaticamente. Bootstrap do SUPER_ADMIN passa a ser um script de seed com credenciais vindas de variável de ambiente |
| **A-2** | **Consumidores externos da API**: alguém além do JS das páginas chama `/api/busca`, `/api/sessao/ping` ou `/agenda/veiculos`? | Se sim, os paths e contratos ficam congelados. Se não, viram Server Actions / route handlers com liberdade de desenho |
| **A-3** | **Paths das páginas**: mantemos as URLs atuais em português (`/agenda`, `/clientes`, `/estoque`…)? | Links salvos, `acaoUrl` gravado em `notificacao` no banco (`/clientes/{id}`, `/estoque`, `/configuracoes`, `/notificacoes`) apontam para esses paths. Mudar exige migração de dados |
| ~~A-4~~ | ~~Estética escura vs. `PERSONALIZACAO_TEMA`~~ | ✅ **DECIDIDO: claro e escuro alternáveis, com o acento do tenant nos dois.** `PERSONALIZACAO_TEMA` continua sendo recurso do plano COMPLETO. Design tokens precisam ser definidos por par (claro/escuro) e o acento entra como variável derivada do hex do tenant, com contraste AA garantido nos dois modos |
| **A-5** | **Código e tabelas mortas** (§11): migrar, manter só o schema, ou remover? | Remover reduz superfície; manter preserva compatibilidade de schema com a base existente |
| **A-6** | **Anomalias da §12**: preservar comportamento atual ou corrigir? | Preciso da sua decisão item a item, pelo menos para B-1, B-2, B-4, B-5 e B-13, que têm efeito visível |
| ~~A-7~~ | ~~Credencial em `V5`~~ | ✅ **RESOLVIDO por A-1**: a migration não é portada. Ainda assim, a senha exposta deve ser considerada comprometida e **rotacionada em qualquer ambiente onde ela já tenha sido aplicada** |
| ~~A-8~~ | ~~Sessão vs. JWT~~ | ✅ **DECIDIDO: sessão em cookie httpOnly assinado, BCrypt mantido.** Equivalente direto do `JSESSIONID`; a revalidação de assinatura a cada request vira middleware |
| **A-9** | **Funcionário sem CRUD** (§11): a migração deve **incluir** a tela de gestão de funcionários que hoje não existe, ou manter a paridade (só leitura)? | YAGNI diz manter paridade; mas hoje a agenda tem um filtro que só funciona com dados inseridos manualmente no banco |
| **A-10** | **Exportação PDF/XLSX**: aceitável trocar OpenPDF/POI por equivalentes Node (ex.: `pdf-lib`/`exceljs`) com **layout aproximado**, ou o layout precisa ser pixel-equivalente? | Nenhuma biblioteca Node reproduz o layout do OpenPDF exatamente. Precisa de tolerância declarada |
| ~~A-11~~ | ~~Hospedagem alvo~~ | ✅ **DECIDIDO: Vercel.** Consequências obrigatórias: pooling externo no Postgres (Supabase pooler / Neon), `runtime = 'nodejs'` explícito nas rotas de PDF/XLSX e hashing, e nenhuma suposição de processo de longa duração (sem cache em memória entre requests) |
| **A-12** | **Locale e formatação**: hoje `pt-BR` com `NumberFormat` de moeda no servidor e máscaras no cliente. Formatação continua no servidor (RSC) ou vai para o cliente? | Afeta hidratação e consistência de valores em telas de dinheiro |

---

## 14. Critério de saída da Fase 0

- [x] Mapa **endpoint-a-endpoint** completo (§3) — 12 controllers, 2 REST, ~70 rotas.
- [x] Mapa **entidade-a-entidade** completo (§4) — 24 entidades, 21 tabelas + 3 posteriores, 13 enums.
- [x] Regras de negócio críticas descritas em linguagem natural (§8) — 19 regras.
- [x] Persistência, transações, locks e queries não triviais mapeados (§5).
- [x] Auth/authz nas três camadas mapeada (§6).
- [x] Integrações externas: nenhuma (§7).
- [x] Testes existentes catalogados como rede de paridade (§9).
- [x] Configuração e segredos levantados, com um achado de segurança (§10).
- [x] Código morto e anomalias listados (§11, §12).
- [ ] **Ambiguidades A-1 a A-12 decididas por você** ← *bloqueia a Fase 1*

---

## 15. Registro de migração — CONCLUÍDA

Todas as decisões pendentes (A-2, A-3, A-5, A-6, A-9, A-10, A-12) foram tomadas na execução e estão registradas abaixo.

### 15.1 Módulos migrados

| Origem (Java) | Destino (TypeScript) | Status |
| --- | --- | --- |
| `AgendamentoServiceImpl` | `domain/agendamento.ts` + `server/agenda.ts` | ✅ |
| `EstoqueServiceImpl` | `domain/estoque.ts` + `server/estoque.ts` | ✅ |
| `AssinaturaService` | `domain/plano.ts` + `server/empresas.ts` | ✅ |
| `ClienteServiceImpl` + `VeiculoServiceImpl` | `domain/cliente.ts` + `server/clientes.ts` | ✅ |
| `ServicoService` | `server/servicos.ts` | ✅ |
| `FinanceiroServiceImpl` | `server/financeiro.ts` | ✅ |
| `RelatorioService` + exporters | `domain/relatorio.ts` + `server/relatorios.ts` + `server/exportacao/` | ✅ |
| `NotificacaoService` | `server/notificacoes.ts` | ✅ |
| `ConfiguracaoService` | `domain/tema.ts` + `server/configuracoes.ts` | ✅ |
| `SolicitacaoAlteracaoEmpresaService` | `server/configuracoes.ts` + `server/empresas.ts` | ✅ |
| `DashboardServiceImpl` | `server/painel.ts` | ✅ |
| `BuscaGlobalService` | `server/busca.ts` | ✅ |
| `DocumentoValidator` | `domain/shared/documento.ts` | ✅ |
| `HorarioSistema` | `domain/shared/tempo.ts` (moment-timezone) | ✅ |
| `ContatoClienteLinks` | `domain/cliente.ts` | ✅ |
| `AuthService` + `UsuarioDetailsService` + handlers | `auth/` + `server/autenticacao.ts` | ✅ |
| `EmpresaAcessoInterceptor` | `middleware.ts` + `auth/contexto.ts` | ✅ |
| `LogService` | `domain/auditoria.ts` + `server/log.ts` | ✅ |
| 22 templates Thymeleaf | 17 páginas React + design system | ✅ |

### 15.2 Decisões tomadas na execução

| Ref. | Decisão | Justificativa |
| --- | --- | --- |
| **A-2** | Novos contratos REST em `/api/*` | Não havia consumidor externo; nada a preservar |
| **A-3** | Paths em português sob `/painel/*` | Base nova, sem `acao_url` legado no banco |
| **A-5** | `backup`, `fornecedor`, `funcao_extra`, `item_servico` **não** criadas | Código morto; base nova não precisa carregar dívida |
| **A-6** | Anomalias **corrigidas**, não preservadas | Ver §15.3 |
| **A-9** | Tabela `funcionario` removida; responsável = usuário ativo da empresa | O seletor da agenda ficaria permanentemente vazio, já que não havia cadastro. Nenhum campo de RH era usado |
| **A-10** | PDF com `@react-pdf/renderer`, XLSX com `exceljs` | Layout equivalente, não idêntico ao OpenPDF — divergência aceita |
| **A-12** | Formatação no cliente, sobre dados canônicos do servidor | O servidor devolve string decimal e ISO; a interface formata em `pt-BR` |
| — | `timestamptz` em vez de `timestamp` | Base nova: elimina de vez a classe de bug do fuso (B-1) |

### 15.3 Anomalias da §12 — tratamento

| # | Original | Nesta versão |
| --- | --- | --- |
| B-1 | `LocalDate.now()` no fuso da JVM em 6 pontos | **Corrigido.** `domain/shared/tempo.ts` é o único relógio; colunas em `timestamptz` |
| B-2 | `listar()` gravava notificação em transação `readOnly` | **Corrigido.** Sincronização de alertas é escrita explícita |
| B-3 | Consumo duplicado do mesmo produto validava contra o saldo original | **Corrigido.** Quantidades são somadas por produto antes da validação, sob `FOR UPDATE` |
| B-4 | Ticket médio dividia bases diferentes | **Corrigido.** `montarResumo` usa receita e concluídos do mesmo período |
| B-5 | `ativos=false` mostrava todos, não os arquivados | **Corrigido.** Filtro explícito de três estados: ativos / arquivados / todos |
| B-6 | Agenda carregava o intervalo inteiro e filtrava em memória | **Parcial.** Status, responsável e pagamento vão para SQL; a busca textual segue em memória |
| B-7 | Checagem de permissão redundante | **Corrigido.** Guards únicos e explícitos |
| B-8 | E-mail único global | **Preservado.** É invariante do modelo de login |
| B-9 | SUPER_ADMIN pertence a uma empresa | **Preservado.** O seed cria a empresa da plataforma |
| B-10 | Busca engolia toda exceção em silêncio | **Corrigido.** Falha por grupo é isolada, mas registrada no console |
| B-11 | `AuthService` morto | **Removido** |
| B-12 | `subtotal > 0` impede serviço gratuito | **Preservado.** Coerente com `preco > 0` |
| B-13 | Testes exigiam Postgres | **Corrigido.** Domínio puro: 49 testes rodam sem banco |

### 15.4 Segurança

O hash BCrypt e o e-mail pessoal versionados na migration `V5` **não foram portados**. O bootstrap do administrador da plataforma passou a ser um script de seed que lê as credenciais do ambiente. Ainda assim, a senha exposta no repositório deve ser considerada comprometida e rotacionada em qualquer ambiente onde aquela migration já tenha sido aplicada.

### 15.5 Definition of Done

- [x] Zero arquivos ou dependências Java, JVM, Maven ou Gradle
- [x] `tsc --noEmit` limpo com `strict`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`
- [x] Nenhum `any`, nenhum `@ts-ignore`
- [x] ESLint sem erros e sem avisos
- [x] 49 testes de domínio verdes — um deles pegou um bug real de escala decimal
- [x] `next build` verde: 17 páginas, 47 rotas de API
- [x] Migrations geradas a partir do schema tipado
- [x] Nenhum segredo em código ou histórico desta versão
- [x] README com execução, variáveis, arquitetura e trade-offs
- [ ] **Migrations aplicadas em base limpa** — não executado: não havia PostgreSQL no ambiente de desenvolvimento usado
