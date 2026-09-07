CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'partially_collected', 'collected', 'cancelled');--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"description" text NOT NULL,
	"service_date" date NOT NULL,
	"due_date" date NOT NULL,
	"gross_amount_minor" integer NOT NULL,
	"net_amount_minor" integer NOT NULL,
	"iva_rate_basis_points" integer NOT NULL,
	"iva_amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_household_status_idx" ON "invoices" USING btree ("household_id","status");--> statement-breakpoint
CREATE INDEX "invoices_household_due_idx" ON "invoices" USING btree ("household_id","due_date");