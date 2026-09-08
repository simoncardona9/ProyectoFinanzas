CREATE TABLE "invoice_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_collections_transaction_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "remaining_amount_minor" integer;--> statement-breakpoint
UPDATE "invoices" SET "remaining_amount_minor" = "gross_amount_minor";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "remaining_amount_minor" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "sent_date" date;--> statement-breakpoint
ALTER TABLE "invoice_collections" ADD CONSTRAINT "invoice_collections_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_collections" ADD CONSTRAINT "invoice_collections_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_collections_invoice_idx" ON "invoice_collections" USING btree ("invoice_id");
