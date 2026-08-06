# REQUISITOS.md — EsteticaFlow

Especificação funcional do sistema: atores, casos de uso, regras de negócio e requisitos não funcionais. É o documento de referência para validar se o software faz o que precisa fazer.

**Domínio:** gestão operacional e financeira de empresas de estética automotiva (detailing, lava-rápido, polimento, vitrificação, higienização).

---

## 1. Atores

| Ator | Descrição | Escopo de acesso |
| --- | --- | --- |
| **Visitante** | Ainda não autenticado | Landing page, planos, suporte, login |
| **Funcionário** | Opera o dia a dia da estética | Dados da própria empresa. Sem gestão de equipe, sem configurações administrativas |
| **Administrador** | Dono ou gerente da estética | Tudo do funcionário + equipe, tema, sessão, formas de pagamento, solicitação de alteração cadastral |
| **Administrador da plataforma** (`SUPER_ADMIN`) | Operação da EsteticaFlow | Gestão de empresas assinantes, assinaturas, bloqueios, solicitações e auditoria global. Atravessa o gate de plano |

**Isolamento multiempresa:** toda consulta e toda escrita são filtradas por `empresaId`, derivado da sessão — nunca de parâmetro enviado pelo cliente. Um usuário não consegue, por manipulação de requisição, alcançar dados de outra empresa.

---

## 2. Casos de uso

### 2.1 Acesso e sessão

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-01 | Autenticar | Todos | Login por e-mail e senha. Mensagem de erro idêntica para e-mail inexistente e senha incorreta, para não revelar quais contas existem |
| UC-02 | Manter conectado | Todos | Opção de sessão de 30 dias em vez de 12 horas |
| UC-03 | Encerrar sessão | Todos | Logout explícito, com registro na auditoria |
| UC-04 | Encerramento por inatividade | Todos | Se a empresa habilitar, a sessão cai após 15/30/60/120/240 minutos sem interação |
| UC-05 | Bloqueio de acesso por assinatura | Sistema | A cada requisição, o sistema reavalia a situação da empresa e derruba o acesso se ela estiver bloqueada, cancelada ou inativa |
| UC-06 | Registrar histórico de acesso | Sistema | Guarda data, IP, navegador e sistema operacional de cada login |

### 2.2 Clientes e veículos

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-07 | Cadastrar cliente | Funcionário+ | Nome e telefone obrigatórios; documento, e-mail e endereço opcionais |
| UC-08 | Editar cliente | Funcionário+ | Mesmas validações do cadastro |
| UC-09 | Arquivar / reativar cliente | Funcionário+ | Exclusão lógica: o histórico é preservado |
| UC-10 | Listar e filtrar clientes | Funcionário+ | Busca por nome, telefone, documento ou cidade; filtro por situação e relacionamento; ordenação por nome, último atendimento, valor gasto ou número de atendimentos |
| UC-11 | Consultar ficha do cliente | Funcionário+ | Métricas consolidadas, veículos, histórico de atendimentos e de recebimentos |
| UC-12 | Cadastrar veículo | Funcionário+ | Placa única por empresa; aceita padrão antigo e Mercosul |
| UC-13 | Editar veículo | Funcionário+ | |
| UC-14 | Arquivar / reativar veículo | Funcionário+ | Reativação exige que o cliente esteja ativo |
| UC-15 | Contato rápido | Funcionário+ | Link de WhatsApp com DDI e link de rota no mapa a partir do endereço |

### 2.3 Catálogo de serviços

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-16 | Cadastrar serviço | Funcionário+ | Nome, preço, duração estimada e categoria |
| UC-17 | Editar serviço | Funcionário+ | Alterar o preço **não** altera atendimentos já criados |
| UC-18 | Arquivar / reativar serviço | Funcionário+ | Serviço arquivado não aparece em novos atendimentos |
| UC-19 | Gerenciar categorias de serviço | Funcionário+ | Nome único por empresa, comparação sem distinção de maiúsculas |
| UC-20 | Listar e filtrar serviços | Funcionário+ | Busca textual, filtro por categoria e situação, ordenação por nome, preço ou duração |

### 2.4 Agenda e atendimento

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-21 | Agendar atendimento | Funcionário+ | Cliente, veículo, um ou mais serviços, data/hora, responsável opcional, desconto opcional |
| UC-22 | Detectar conflito de horário | Sistema | Ver RN-05 |
| UC-23 | Confirmar sobreposição | Funcionário+ | Quando não há responsável definido, o usuário pode confirmar o agendamento mesmo com sobreposição |
| UC-24 | Iniciar atendimento | Funcionário+ | `AGENDADO` → `EM_ANDAMENTO` |
| UC-25 | Concluir atendimento | Funcionário+ | `EM_ANDAMENTO` → `CONCLUIDO`, com baixa opcional de material e recebimento opcional |
| UC-26 | Cancelar atendimento | Funcionário+ | A partir de `AGENDADO` ou `EM_ANDAMENTO` |
| UC-27 | Registrar pagamento | Funcionário+ | Gera receita; **não** altera o status do atendimento |
| UC-28 | Consultar agenda | Funcionário+ | Visão por dia, semana ou mês, com filtros de status, responsável, pagamento e busca textual |
| UC-29 | Consultar detalhe do atendimento | Funcionário+ | Serviços, valores, responsável e recebimento |

### 2.5 Estoque *(plano Completo)*

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-30 | Cadastrar produto | Funcionário+ | Conteúdo e preço da embalagem; o custo unitário é derivado |
| UC-31 | Editar produto | Funcionário+ | Não altera saldo: quantidade só muda por movimentação |
| UC-32 | Arquivar / reativar produto | Funcionário+ | Produto arquivado não pode ser movimentado |
| UC-33 | Registrar entrada | Funcionário+ | Aumenta o saldo e lança despesa proporcional (RN-09) |
| UC-34 | Registrar saída manual | Funcionário+ | Perda, ajuste ou uso interno |
| UC-35 | Baixar consumo de atendimento | Sistema | Ao concluir, o material informado sai do estoque |
| UC-36 | Definir estoque mínimo | Funcionário+ | Base para o alerta de reposição |
| UC-37 | Gerenciar categorias de produto | Funcionário+ | Nome único por empresa |
| UC-38 | Consultar movimentações | Funcionário+ | Histórico com tipo, origem, quantidade, valor e autor |

### 2.6 Financeiro *(plano Completo)*

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-39 | Consultar indicadores | Funcionário+ | Receita do dia, semana, mês e ano; despesa e resultado do mês; valor a receber; margem |
| UC-40 | Consultar lançamentos | Funcionário+ | Entradas e saídas do período, com busca e filtro por tipo |
| UC-41 | Registrar despesa avulsa | Funcionário+ | Fixa, variável ou de fornecedor |
| UC-42 | Registrar receita avulsa | Funcionário+ | Entrada não vinculada a atendimento |
| UC-43 | Gerar receita automática | Sistema | Ao receber o pagamento de um atendimento |
| UC-44 | Gerar despesa automática | Sistema | Ao registrar entrada de estoque com valor |

### 2.7 Relatórios

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-45 | Consultar relatório gerencial | Funcionário+ | Período: dia, semana, mês, últimos 6 meses ou ano |
| UC-46 | Ver detalhamento | Funcionário+ *(Completo)* | Ranking de serviços, despesa por categoria, recebimento por forma e lançamento a lançamento |
| UC-47 | Exportar em PDF | Funcionário+ | Documento paginado com indicadores e tabelas |
| UC-48 | Exportar em Excel | Funcionário+ *(Completo)* | Pasta com abas de resumo, serviços, receitas, despesas e atendimentos |

### 2.8 Painel

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-49 | Visão consolidada | Funcionário+ | Faturamento, resultado, ticket médio, agenda do dia, variação mês a mês |
| UC-50 | Gráfico de faturamento | Funcionário+ *(Completo)* | Receita e despesa dos últimos 6 meses |
| UC-51 | Ranking de serviços | Funcionário+ | Mais executados no mês corrente |
| UC-52 | Alertas de estoque | Funcionário+ *(Completo)* | Itens abaixo do mínimo, com medidor de nível |
| UC-53 | Carteira de clientes | Funcionário+ | Distribuição por relacionamento |

### 2.9 Notificações

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-54 | Consultar notificações | Funcionário+ | Alertas recalculados a partir do estado atual da operação |
| UC-55 | Marcar como lida | Funcionário+ | Individual ou em lote |
| UC-56 | Alertar estoque baixo | Sistema | Um alerta por produto abaixo do mínimo |
| UC-57 | Alertar cliente sem retorno | Sistema | Clientes em risco ou inativos, limitados a 10 por sincronização |
| UC-58 | Alertar assinatura em atraso | Sistema | Com o número de dias de atraso |

### 2.10 Configurações

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-59 | Consultar dados da empresa | Funcionário+ | Somente leitura |
| UC-60 | Solicitar alteração cadastral | Administrador | Passa por aprovação da plataforma (RN-14) |
| UC-61 | Criar usuário | Administrador | Respeita o limite do plano |
| UC-62 | Editar usuário | Administrador | Nome, e-mail, perfil e senha |
| UC-63 | Arquivar / reativar usuário | Administrador | Não pode arquivar a si mesmo; reativação reavalia o limite |
| UC-64 | Alternar modo claro/escuro | Todos | Preferência de leitura, disponível em qualquer plano |
| UC-65 | Escolher acento da marca | Administrador *(Completo)* | 8 acentos do catálogo ou cor livre em `#RRGGBB` |
| UC-66 | Configurar inatividade | Administrador | Ativar e escolher o tempo |
| UC-67 | Gerenciar formas de pagamento | Administrador *(Completo)* | Criar, renomear, arquivar e reativar |
| UC-68 | Consultar acessos recentes | Funcionário+ | Últimos logins da empresa |

### 2.11 Plataforma *(SUPER_ADMIN)*

| # | Caso de uso | Ator | Descrição |
| --- | --- | --- | --- |
| UC-69 | Cadastrar empresa | Plataforma | Cria empresa, administrador inicial e catálogos básicos |
| UC-70 | Listar e filtrar empresas | Plataforma | Por busca, plano e situação; mostra dias de atraso |
| UC-71 | Alterar assinatura | Plataforma | Plano, mensalidade e vencimento |
| UC-72 | Registrar pagamento de assinatura | Plataforma | Avança o vencimento em um mês e notifica a empresa |
| UC-73 | Bloquear empresa | Plataforma | Exige motivo; bloqueio automático só após a tolerância |
| UC-74 | Desbloquear empresa | Plataforma | Recalcula o status pelo vencimento |
| UC-75 | Arquivar / reativar empresa | Plataforma | Arquivar cancela a assinatura |
| UC-76 | Decidir solicitação cadastral | Plataforma | Aprovar aplica os dados; rejeitar exige motivo |
| UC-77 | Consultar auditoria | Plataforma | Últimos 200 eventos de todas as empresas |
| UC-78 | Busca global | Funcionário+ | Clientes, veículos, agendamentos, serviços e produtos, com atalho `⌘K` |

---

## 3. Regras de negócio

> Todas implementadas como funções puras em `src/domain/`, cobertas por teste automatizado.

### RN-01 · Preço congelado na venda
O preço de cada serviço é copiado para o atendimento no momento da criação. Reajustar o catálogo depois **não** reescreve o histórico financeiro.

### RN-02 · Composição do valor
`subtotal` = soma dos preços dos serviços. `total` = `subtotal − desconto`. Garantido também por *check constraint* no banco.

### RN-03 · Limite do desconto
O desconto precisa ser **maior ou igual a zero e estritamente menor que o subtotal**. Um atendimento nunca vale zero.

### RN-04 · Serviço não se repete
O mesmo serviço não pode ser adicionado duas vezes ao mesmo atendimento. Reforçado por índice único.

### RN-05 · Conflito de horário
A janela ocupada vai de `dataHora` até `dataHora + soma das durações`. Considera apenas atendimentos `AGENDADO` ou `EM_ANDAMENTO`.

- Mesmo responsável em horários sobrepostos → **bloqueia**.
- Novo atendimento sem responsável definido → **avisa** e pede confirmação (a operação pode ter mais de um box).
- Responsáveis diferentes → **libera**.

### RN-06 · Não se agenda no passado
Comparação feita com "agora" truncado ao minuto, no fuso `America/São_Paulo`.

### RN-07 · Máquina de estados do atendimento
| De | Ação | Para |
| --- | --- | --- |
| `AGENDADO` | Iniciar | `EM_ANDAMENTO` |
| `EM_ANDAMENTO` | Concluir | `CONCLUIDO` |
| `AGENDADO` ou `EM_ANDAMENTO` | Cancelar | `CANCELADO` |

Qualquer outra transição é recusada com mensagem explicando o estado atual.

### RN-08 · Pagamento é ortogonal ao status
Pode ser registrado em atendimento `EM_ANDAMENTO` ou `CONCLUIDO`, **uma única vez**. Não altera o status. Unicidade garantida por índice único parcial sobre `receita.agendamento_id`.

### RN-09 · Custo por embalagem
O usuário cadastra o conteúdo e o preço da **embalagem fechada**. O sistema deriva:

```
custoUnitario = valorEmbalagem ÷ quantidadeEmbalagem        (4 casas)
valorDaCompra = (quantidade ÷ quantidadeEmbalagem) × valorEmbalagem
```

Multiplicar o preço do galão pela quantidade em mililitros inflaria a despesa em ordens de grandeza. O usuário pode sobrescrever informando o valor efetivamente pago.

### RN-10 · Estoque não fica negativo
Toda baixa valida o saldo antes de gravar, sob `SELECT ... FOR UPDATE`. Quantidades repetidas do mesmo produto na conclusão são somadas antes da validação.

### RN-11 · Lançamento financeiro automático
Entrada de estoque com valor > 0 gera despesa de categoria `FORNECEDOR`. Recebimento de atendimento gera receita. Nada é digitado duas vezes.

### RN-12 · Relacionamento do cliente
Pela data do último atendimento **concluído**: até 30 dias → ativo; 31 a 90 → em risco; acima de 90 → inativo; sem atendimento → sem atendimento.

### RN-13 · Ciclo da assinatura
- Tolerância de **7 dias** após o vencimento.
- Vencido → `EM_ATRASO`; empresa em atraso **ainda acessa** o sistema.
- Bloqueio automático só é permitido com **mais de 7 dias** de atraso; antes disso, exige bloqueio manual com motivo.
- `BLOQUEADA`, `CANCELADA` e empresa inativa impedem o acesso.
- Recálculo automático nunca reativa uma empresa bloqueada ou cancelada: só um ato explícito muda esses estados.
- Registrar pagamento avança o vencimento em um mês a partir do vencimento atual ou de hoje, o que for maior.

### RN-14 · Alteração cadastral com aprovação
O administrador da empresa **não** altera razão social, nome fantasia, CNPJ, telefone e e-mail diretamente: envia uma solicitação. Apenas uma pendente por empresa (índice único parcial). A plataforma aprova ou rejeita com motivo, e a empresa é notificada nos dois casos.

### RN-15 · Matriz de plano

| Recurso | Básico | Completo |
| --- | :-: | :-: |
| Painel, clientes, serviços, agenda | ✅ | ✅ |
| Relatórios e exportação em PDF | ✅ | ✅ |
| Relatório detalhado, exportação em Excel | ❌ | ✅ |
| Estoque, financeiro | ❌ | ✅ |
| Personalização de acento | ❌ | ✅ |
| Limite de usuários ativos | **2** | **50** |

O `SUPER_ADMIN` atravessa o gate. O limite de usuários é reavaliado tanto ao criar quanto ao reativar.

### RN-16 · Deduplicação de notificações
Enquanto existir uma notificação **não lida** com a mesma referência (tipo + entidade), nenhuma nova é criada. Decisões de solicitação são exceção: sempre notificam.

### RN-17 · Normalização de entrada
Documentos, telefones e CEP são armazenados apenas com dígitos; e-mails em minúsculas; UF em maiúsculas; placas sem separador e em maiúsculas; campos de texto vazios viram `NULL`. CPF e CNPJ são validados pelo dígito verificador. O documento do cliente é opcional — vazio é válido.

### RN-18 · Unicidade
- CNPJ único entre todas as empresas.
- E-mail de usuário único em toda a plataforma.
- CPF/CNPJ do cliente único por empresa.
- Placa única por empresa.
- Nome de categoria único por empresa, sem distinção de maiúsculas.

### RN-19 · Aritmética monetária exata
Valores monetários circulam como string decimal e toda conta acontece em inteiros escalados (`BigInt`). Arredondamento sempre HALF_UP. Nenhum valor passa por ponto flutuante.

### RN-20 · Fuso único da operação
Todo "hoje", "agora" e formatação usam `America/São_Paulo`, independentemente do fuso do servidor ou do navegador.

---

## 4. Requisitos não funcionais

| # | Requisito | Como é atendido |
| --- | --- | --- |
| RNF-01 | **Segurança de tipos** | TypeScript `strict` com `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`. `any` proibido pelo ESLint |
| RNF-02 | **Validação de fronteira** | Todo dado que entra (corpo, query, variáveis de ambiente) passa por Zod. Os tipos derivam do schema |
| RNF-03 | **Isolamento multiempresa** | `empresaId` vem sempre da sessão assinada, nunca do cliente |
| RNF-04 | **Autenticação** | Cookie `httpOnly`, `SameSite=Lax`, assinado com HS256; `Secure` em produção. Senha com bcrypt custo 10 |
| RNF-05 | **Autorização em três camadas** | Rota (middleware) → perfil (guard) → recurso do plano (gate) |
| RNF-06 | **Integridade no banco** | Chaves estrangeiras, *check constraints* e índices únicos parciais replicam as invariantes do domínio |
| RNF-07 | **Concorrência** | `SELECT ... FOR UPDATE` nas linhas de estoque; operações compostas em transação |
| RNF-08 | **Acessibilidade** | Contraste AA verificado programaticamente, foco visível, navegação por teclado, HTML semântico, `aria-*` nos componentes interativos, atalho para o conteúdo |
| RNF-09 | **Movimento responsável** | Transições de 120–180 ms; `prefers-reduced-motion` desliga animações |
| RNF-10 | **Responsividade** | Layout de 320 px a ultrawide; navegação em gaveta no mobile |
| RNF-11 | **Erros como valores** | `Result` no domínio; exceções reservadas ao inesperado; mensagens em português orientadas à ação |
| RNF-12 | **Observabilidade** | Trilha de auditoria por empresa e histórico de acesso por usuário |
| RNF-13 | **Segredos** | Apenas em variável de ambiente. Nenhuma credencial versionada |
| RNF-14 | **Serverless-ready** | Sem estado em memória entre requisições; pool mínimo; `prepare: false` para pooler em modo transaction |
| RNF-15 | **Build reprodutível** | Sem dependência de rede no build; fontes carregadas em runtime com fallback de sistema |
| RNF-16 | **Testabilidade** | Domínio puro, sem IO — testável sem mock, sem banco e sem servidor |

---

## 5. Fora de escopo desta entrega

Registrado explicitamente para não haver ambiguidade sobre o que **não** foi construído:

- Autoatendimento de assinatura (checkout, gateway de pagamento, cobrança recorrente). O pagamento é registrado manualmente pela plataforma.
- Recuperação de senha por e-mail. A redefinição é feita pelo administrador da empresa.
- Envio de e-mail ou SMS transacional. As notificações vivem dentro do sistema.
- Aplicativo móvel nativo. A interface é responsiva.
- Comissionamento de funcionário e folha de pagamento.
- Ordem de serviço assinada pelo cliente e checklist fotográfico de entrada do veículo.
- Integração fiscal (NF-e / NFS-e).
