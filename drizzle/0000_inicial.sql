CREATE TYPE "public"."categoria_despesa" AS ENUM('FIXA', 'VARIAVEL', 'FORNECEDOR');--> statement-breakpoint
CREATE TYPE "public"."origem_movimentacao" AS ENUM('MANUAL', 'AGENDAMENTO', 'AJUSTE');--> statement-breakpoint
CREATE TYPE "public"."papel_usuario" AS ENUM('SUPER_ADMIN', 'ADMINISTRADOR', 'FUNCIONARIO');--> statement-breakpoint
CREATE TYPE "public"."plano_assinatura" AS ENUM('BASICO', 'COMPLETO');--> statement-breakpoint
CREATE TYPE "public"."status_agendamento" AS ENUM('AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."status_assinatura" AS ENUM('ATIVA', 'EM_ATRASO', 'BLOQUEADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."status_solicitacao" AS ENUM('PENDENTE', 'APROVADA', 'REJEITADA');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimentacao" AS ENUM('ENTRADA', 'SAIDA', 'AJUSTE');--> statement-breakpoint
CREATE TYPE "public"."tipo_notificacao" AS ENUM('ESTOQUE_BAIXO', 'CLIENTE_INATIVO', 'ASSINATURA', 'SOLICITACAO_EMPRESA', 'SOLICITACAO_DECISAO', 'SISTEMA');--> statement-breakpoint
CREATE TYPE "public"."unidade_medida" AS ENUM('UN', 'ML', 'L', 'KG', 'G');--> statement-breakpoint
CREATE TABLE "configuracao" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"chave" varchar(100) NOT NULL,
	"valor" varchar(255) NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"razao_social" varchar(150) NOT NULL,
	"nome_fantasia" varchar(150) NOT NULL,
	"cnpj" varchar(14) NOT NULL,
	"telefone" varchar(11),
	"email" varchar(150),
	"ativo" boolean DEFAULT true NOT NULL,
	"plano" "plano_assinatura" DEFAULT 'BASICO' NOT NULL,
	"status_assinatura" "status_assinatura" DEFAULT 'ATIVA' NOT NULL,
	"valor_mensalidade" numeric(12, 2) DEFAULT '0' NOT NULL,
	"proximo_vencimento" date NOT NULL,
	"bloqueio_manual" boolean DEFAULT false NOT NULL,
	"motivo_bloqueio" varchar(500),
	"bloqueado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_empresa_valor_mensalidade" CHECK ("empresa"."valor_mensalidade" >= 0),
	CONSTRAINT "ck_empresa_cnpj_digitos" CHECK ("empresa"."cnpj" ~ '^[0-9]{14}$')
);
--> statement-breakpoint
CREATE TABLE "solicitacao_alteracao_empresa" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"razao_social" varchar(150) NOT NULL,
	"nome_fantasia" varchar(150) NOT NULL,
	"cnpj" varchar(14) NOT NULL,
	"telefone" varchar(11),
	"email" varchar(150),
	"status" "status_solicitacao" DEFAULT 'PENDENTE' NOT NULL,
	"solicitado_por" bigint NOT NULL,
	"decidido_por" bigint,
	"motivo" varchar(500),
	"decidido_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historico_acesso" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"usuario_id" bigint NOT NULL,
	"ocorrido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" varchar(64),
	"user_agent" varchar(500),
	"navegador" varchar(80),
	"sistema_operacional" varchar(80)
);
--> statement-breakpoint
CREATE TABLE "log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"usuario_id" bigint,
	"acao" varchar(100) NOT NULL,
	"detalhes" varchar(2000),
	"ocorrido_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"nome" varchar(150) NOT NULL,
	"email" varchar(150) NOT NULL,
	"senha_hash" varchar(255) NOT NULL,
	"papel" "papel_usuario" DEFAULT 'FUNCIONARIO' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cliente" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"nome" varchar(150) NOT NULL,
	"cpf_cnpj" varchar(14),
	"telefone" varchar(11) NOT NULL,
	"email" varchar(150),
	"cep" varchar(8),
	"logradouro" varchar(150),
	"numero" varchar(20),
	"complemento" varchar(100),
	"bairro" varchar(100),
	"cidade" varchar(100),
	"uf" varchar(2),
	"observacoes" varchar(500),
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_cliente_telefone" CHECK ("cliente"."telefone" ~ '^[0-9]{10,11}$'),
	CONSTRAINT "ck_cliente_cep" CHECK ("cliente"."cep" IS NULL OR "cliente"."cep" ~ '^[0-9]{8}$'),
	CONSTRAINT "ck_cliente_documento" CHECK ("cliente"."cpf_cnpj" IS NULL OR "cliente"."cpf_cnpj" ~ '^([0-9]{11}|[0-9]{14})$')
);
--> statement-breakpoint
CREATE TABLE "veiculo" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"cliente_id" bigint NOT NULL,
	"placa" varchar(7) NOT NULL,
	"marca" varchar(60) NOT NULL,
	"modelo" varchar(100) NOT NULL,
	"cor" varchar(30),
	"ano" integer,
	"observacoes" varchar(500),
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_veiculo_ano" CHECK ("veiculo"."ano" IS NULL OR ("veiculo"."ano" >= 1950 AND "veiculo"."ano" <= 2100)),
	CONSTRAINT "ck_veiculo_placa" CHECK ("veiculo"."placa" ~ '^[A-Z]{3}([0-9]{4}|[0-9][A-Z][0-9]{2})$')
);
--> statement-breakpoint
CREATE TABLE "categoria_servico" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"nome" varchar(100) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servico" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"categoria_servico_id" bigint NOT NULL,
	"nome" varchar(150) NOT NULL,
	"descricao" varchar(500),
	"preco" numeric(10, 2) NOT NULL,
	"tempo_estimado_minutos" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_servico_preco" CHECK ("servico"."preco" > 0),
	CONSTRAINT "ck_servico_tempo" CHECK ("servico"."tempo_estimado_minutos" > 0)
);
--> statement-breakpoint
CREATE TABLE "categoria_produto" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"nome" varchar(100) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estoque" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"produto_id" bigint NOT NULL,
	"quantidade_atual" numeric(12, 3) DEFAULT '0' NOT NULL,
	"quantidade_minima" numeric(12, 3) DEFAULT '0' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_estoque_quantidade_atual" CHECK ("estoque"."quantidade_atual" >= 0),
	CONSTRAINT "ck_estoque_quantidade_minima" CHECK ("estoque"."quantidade_minima" >= 0)
);
--> statement-breakpoint
CREATE TABLE "movimentacao_estoque" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"produto_id" bigint NOT NULL,
	"agendamento_id" bigint,
	"usuario_id" bigint,
	"tipo" "tipo_movimentacao" NOT NULL,
	"origem" "origem_movimentacao" NOT NULL,
	"quantidade" numeric(12, 3) NOT NULL,
	"valor_financeiro" numeric(12, 2),
	"motivo" varchar(500),
	"ocorrido_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_movimentacao_quantidade" CHECK ("movimentacao_estoque"."quantidade" > 0),
	CONSTRAINT "ck_movimentacao_valor" CHECK ("movimentacao_estoque"."valor_financeiro" IS NULL OR "movimentacao_estoque"."valor_financeiro" >= 0)
);
--> statement-breakpoint
CREATE TABLE "produto" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"categoria_produto_id" bigint NOT NULL,
	"nome" varchar(150) NOT NULL,
	"unidade_medida" "unidade_medida" NOT NULL,
	"quantidade_embalagem" numeric(12, 3) NOT NULL,
	"valor_embalagem" numeric(12, 2) NOT NULL,
	"custo_unitario" numeric(12, 4) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_produto_quantidade_embalagem" CHECK ("produto"."quantidade_embalagem" > 0),
	CONSTRAINT "ck_produto_valor_embalagem" CHECK ("produto"."valor_embalagem" >= 0),
	CONSTRAINT "ck_produto_custo_unitario" CHECK ("produto"."custo_unitario" >= 0)
);
--> statement-breakpoint
CREATE TABLE "agendamento" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"cliente_id" bigint NOT NULL,
	"veiculo_id" bigint NOT NULL,
	"responsavel_id" bigint,
	"data_hora" timestamp with time zone NOT NULL,
	"duracao_minutos" numeric(10, 0) NOT NULL,
	"status" "status_agendamento" DEFAULT 'AGENDADO' NOT NULL,
	"observacoes" varchar(500),
	"subtotal" numeric(10, 2) NOT NULL,
	"desconto" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"pago" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_agendamento_subtotal" CHECK ("agendamento"."subtotal" > 0),
	CONSTRAINT "ck_agendamento_desconto" CHECK ("agendamento"."desconto" >= 0 AND "agendamento"."desconto" < "agendamento"."subtotal"),
	CONSTRAINT "ck_agendamento_total" CHECK ("agendamento"."total" > 0 AND "agendamento"."total" = "agendamento"."subtotal" - "agendamento"."desconto"),
	CONSTRAINT "ck_agendamento_duracao" CHECK ("agendamento"."duracao_minutos" > 0)
);
--> statement-breakpoint
CREATE TABLE "agendamento_servico" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"agendamento_id" bigint NOT NULL,
	"servico_id" bigint NOT NULL,
	"preco_unitario" numeric(10, 2) NOT NULL,
	"tempo_estimado_minutos" numeric(10, 0) NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_agendamento_servico_preco" CHECK ("agendamento_servico"."preco_unitario" > 0)
);
--> statement-breakpoint
CREATE TABLE "despesa" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"descricao" varchar(200) NOT NULL,
	"categoria" "categoria_despesa" NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"data_pagamento" date NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_despesa_valor" CHECK ("despesa"."valor" > 0)
);
--> statement-breakpoint
CREATE TABLE "forma_pagamento" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"nome" varchar(50) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacao" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint,
	"tipo" "tipo_notificacao" NOT NULL,
	"titulo" varchar(150) NOT NULL,
	"mensagem" varchar(1000) NOT NULL,
	"lida" boolean DEFAULT false NOT NULL,
	"referencia_tipo" varchar(40),
	"referencia_id" bigint,
	"acao_url" varchar(255),
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receita" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"agendamento_id" bigint,
	"forma_pagamento_id" bigint NOT NULL,
	"descricao" varchar(200) NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"data_recebimento" date NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_receita_valor" CHECK ("receita"."valor" > 0)
);
--> statement-breakpoint
ALTER TABLE "configuracao" ADD CONSTRAINT "configuracao_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_alteracao_empresa" ADD CONSTRAINT "solicitacao_alteracao_empresa_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_alteracao_empresa" ADD CONSTRAINT "solicitacao_alteracao_empresa_solicitado_por_usuario_id_fk" FOREIGN KEY ("solicitado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_alteracao_empresa" ADD CONSTRAINT "solicitacao_alteracao_empresa_decidido_por_usuario_id_fk" FOREIGN KEY ("decidido_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_acesso" ADD CONSTRAINT "historico_acesso_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_acesso" ADD CONSTRAINT "historico_acesso_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log" ADD CONSTRAINT "log_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log" ADD CONSTRAINT "log_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categoria_servico" ADD CONSTRAINT "categoria_servico_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servico" ADD CONSTRAINT "servico_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servico" ADD CONSTRAINT "servico_categoria_servico_id_categoria_servico_id_fk" FOREIGN KEY ("categoria_servico_id") REFERENCES "public"."categoria_servico"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categoria_produto" ADD CONSTRAINT "categoria_produto_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estoque" ADD CONSTRAINT "estoque_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estoque" ADD CONSTRAINT "estoque_produto_id_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_produto_id_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto" ADD CONSTRAINT "produto_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto" ADD CONSTRAINT "produto_categoria_produto_id_categoria_produto_id_fk" FOREIGN KEY ("categoria_produto_id") REFERENCES "public"."categoria_produto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_veiculo_id_veiculo_id_fk" FOREIGN KEY ("veiculo_id") REFERENCES "public"."veiculo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_responsavel_id_usuario_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_servico" ADD CONSTRAINT "agendamento_servico_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_servico" ADD CONSTRAINT "agendamento_servico_agendamento_id_agendamento_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_servico" ADD CONSTRAINT "agendamento_servico_servico_id_servico_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servico"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forma_pagamento" ADD CONSTRAINT "forma_pagamento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receita" ADD CONSTRAINT "receita_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receita" ADD CONSTRAINT "receita_agendamento_id_agendamento_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receita" ADD CONSTRAINT "receita_forma_pagamento_id_forma_pagamento_id_fk" FOREIGN KEY ("forma_pagamento_id") REFERENCES "public"."forma_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_configuracao_empresa_chave" ON "configuracao" USING btree ("empresa_id","chave");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_empresa_cnpj" ON "empresa" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX "ix_empresa_status_assinatura" ON "empresa" USING btree ("status_assinatura");--> statement-breakpoint
CREATE INDEX "ix_empresa_proximo_vencimento" ON "empresa" USING btree ("proximo_vencimento");--> statement-breakpoint
CREATE INDEX "ix_solicitacao_empresa_status" ON "solicitacao_alteracao_empresa" USING btree ("empresa_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_solicitacao_pendente_empresa" ON "solicitacao_alteracao_empresa" USING btree ("empresa_id") WHERE status = 'PENDENTE';--> statement-breakpoint
CREATE INDEX "ix_historico_acesso_empresa" ON "historico_acesso" USING btree ("empresa_id","ocorrido_em");--> statement-breakpoint
CREATE INDEX "ix_historico_acesso_usuario" ON "historico_acesso" USING btree ("usuario_id","ocorrido_em");--> statement-breakpoint
CREATE INDEX "ix_log_empresa_data" ON "log" USING btree ("empresa_id","ocorrido_em");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_usuario_email" ON "usuario" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ix_usuario_empresa" ON "usuario" USING btree ("empresa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_cliente_documento_empresa" ON "cliente" USING btree ("empresa_id","cpf_cnpj") WHERE cpf_cnpj IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ix_cliente_empresa_nome" ON "cliente" USING btree ("empresa_id","nome");--> statement-breakpoint
CREATE INDEX "ix_cliente_empresa_ativo" ON "cliente" USING btree ("empresa_id","ativo");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_veiculo_placa_empresa" ON "veiculo" USING btree ("empresa_id","placa");--> statement-breakpoint
CREATE INDEX "ix_veiculo_cliente" ON "veiculo" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_categoria_servico_empresa_nome" ON "categoria_servico" USING btree ("empresa_id","nome");--> statement-breakpoint
CREATE INDEX "ix_servico_empresa_ativo_nome" ON "servico" USING btree ("empresa_id","ativo","nome");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_categoria_produto_empresa_nome" ON "categoria_produto" USING btree ("empresa_id","nome");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_estoque_produto" ON "estoque" USING btree ("produto_id");--> statement-breakpoint
CREATE INDEX "ix_estoque_empresa" ON "estoque" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "ix_movimentacao_empresa_data" ON "movimentacao_estoque" USING btree ("empresa_id","ocorrido_em");--> statement-breakpoint
CREATE INDEX "ix_movimentacao_produto" ON "movimentacao_estoque" USING btree ("produto_id","ocorrido_em");--> statement-breakpoint
CREATE INDEX "ix_produto_empresa_ativo" ON "produto" USING btree ("empresa_id","ativo");--> statement-breakpoint
CREATE INDEX "ix_agendamento_empresa_data" ON "agendamento" USING btree ("empresa_id","data_hora");--> statement-breakpoint
CREATE INDEX "ix_agendamento_empresa_status" ON "agendamento" USING btree ("empresa_id","status");--> statement-breakpoint
CREATE INDEX "ix_agendamento_cliente" ON "agendamento" USING btree ("cliente_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agendamento_servico" ON "agendamento_servico" USING btree ("agendamento_id","servico_id");--> statement-breakpoint
CREATE INDEX "ix_agendamento_servico_servico" ON "agendamento_servico" USING btree ("servico_id");--> statement-breakpoint
CREATE INDEX "ix_despesa_empresa_data" ON "despesa" USING btree ("empresa_id","data_pagamento");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_forma_pagamento_empresa_nome" ON "forma_pagamento" USING btree ("empresa_id","nome");--> statement-breakpoint
CREATE INDEX "ix_notificacao_empresa_lida" ON "notificacao" USING btree ("empresa_id","lida","criado_em");--> statement-breakpoint
CREATE INDEX "ix_notificacao_referencia" ON "notificacao" USING btree ("empresa_id","tipo","referencia_tipo","referencia_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_receita_agendamento" ON "receita" USING btree ("agendamento_id") WHERE agendamento_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ix_receita_empresa_data" ON "receita" USING btree ("empresa_id","data_recebimento");