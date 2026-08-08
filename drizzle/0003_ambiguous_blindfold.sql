CREATE TABLE "parcela_recebimento" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" bigint NOT NULL,
	"agendamento_id" bigint NOT NULL,
	"forma_pagamento_id" bigint NOT NULL,
	"numero" integer NOT NULL,
	"total_parcelas" integer NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"data_vencimento" date NOT NULL,
	"paga" boolean DEFAULT false NOT NULL,
	"data_pagamento" date,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_parcela_recebimento_numero" CHECK ("parcela_recebimento"."numero" > 0 AND "parcela_recebimento"."numero" <= "parcela_recebimento"."total_parcelas"),
	CONSTRAINT "ck_parcela_recebimento_total" CHECK ("parcela_recebimento"."total_parcelas" BETWEEN 2 AND 12),
	CONSTRAINT "ck_parcela_recebimento_valor" CHECK ("parcela_recebimento"."valor" > 0),
	CONSTRAINT "ck_parcela_recebimento_pagamento" CHECK (("parcela_recebimento"."paga" = true AND "parcela_recebimento"."data_pagamento" IS NOT NULL) OR ("parcela_recebimento"."paga" = false AND "parcela_recebimento"."data_pagamento" IS NULL))
);
--> statement-breakpoint
DROP INDEX "uq_receita_agendamento";--> statement-breakpoint
ALTER TABLE "receita" ADD COLUMN "parcela_recebimento_id" bigint;--> statement-breakpoint
ALTER TABLE "parcela_recebimento" ADD CONSTRAINT "parcela_recebimento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcela_recebimento" ADD CONSTRAINT "parcela_recebimento_agendamento_id_agendamento_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcela_recebimento" ADD CONSTRAINT "parcela_recebimento_forma_pagamento_id_forma_pagamento_id_fk" FOREIGN KEY ("forma_pagamento_id") REFERENCES "public"."forma_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_parcela_recebimento_agendamento_numero" ON "parcela_recebimento" USING btree ("agendamento_id","numero");--> statement-breakpoint
CREATE INDEX "ix_parcela_recebimento_empresa_status_vencimento" ON "parcela_recebimento" USING btree ("empresa_id","paga","data_vencimento");--> statement-breakpoint
CREATE INDEX "ix_parcela_recebimento_forma" ON "parcela_recebimento" USING btree ("forma_pagamento_id");--> statement-breakpoint
ALTER TABLE "receita" ADD CONSTRAINT "receita_parcela_recebimento_id_parcela_recebimento_id_fk" FOREIGN KEY ("parcela_recebimento_id") REFERENCES "public"."parcela_recebimento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_receita_agendamento" ON "receita" USING btree ("agendamento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_receita_agendamento_avulsa" ON "receita" USING btree ("agendamento_id") WHERE agendamento_id IS NOT NULL AND parcela_recebimento_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_receita_parcela" ON "receita" USING btree ("parcela_recebimento_id") WHERE parcela_recebimento_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "parcela_recebimento" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "parcela_recebimento" FROM anon, authenticated;
