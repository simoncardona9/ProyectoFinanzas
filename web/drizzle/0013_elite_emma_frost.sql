CREATE TYPE "public"."tax_reserve_status" AS ENUM('protected', 'partially_settled', 'settled');--> statement-breakpoint
CREATE TABLE "tax_reserves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"invoice_collection_id" uuid NOT NULL,
	"original_amount_minor" integer NOT NULL,
	"remaining_amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"status" "tax_reserve_status" DEFAULT 'protected' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_reserves_invoice_collection_unique" UNIQUE("invoice_collection_id")
);
--> statement-breakpoint
ALTER TABLE "tax_reserves" ADD CONSTRAINT "tax_reserves_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_reserves" ADD CONSTRAINT "tax_reserves_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_reserves" ADD CONSTRAINT "tax_reserves_invoice_collection_id_invoice_collections_id_fk" FOREIGN KEY ("invoice_collection_id") REFERENCES "public"."invoice_collections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tax_reserves_household_status_idx" ON "tax_reserves" USING btree ("household_id","status");--> statement-breakpoint
CREATE INDEX "tax_reserves_invoice_idx" ON "tax_reserves" USING btree ("invoice_id");