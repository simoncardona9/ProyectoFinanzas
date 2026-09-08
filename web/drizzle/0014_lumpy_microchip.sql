CREATE TABLE "tax_reserve_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tax_reserve_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_reserve_settlements_transaction_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
ALTER TABLE "tax_reserve_settlements" ADD CONSTRAINT "tax_reserve_settlements_tax_reserve_id_tax_reserves_id_fk" FOREIGN KEY ("tax_reserve_id") REFERENCES "public"."tax_reserves"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_reserve_settlements" ADD CONSTRAINT "tax_reserve_settlements_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tax_reserve_settlements_reserve_idx" ON "tax_reserve_settlements" USING btree ("tax_reserve_id");