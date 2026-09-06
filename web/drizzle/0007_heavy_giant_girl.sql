CREATE TYPE "public"."debt_status" AS ENUM('active', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"creditor_name" text NOT NULL,
	"description" text NOT NULL,
	"original_amount_minor" integer NOT NULL,
	"remaining_amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"incurred_date" date NOT NULL,
	"status" "debt_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "debts_household_status_idx" ON "debts" USING btree ("household_id","status");--> statement-breakpoint
CREATE INDEX "debts_household_currency_idx" ON "debts" USING btree ("household_id","currency");