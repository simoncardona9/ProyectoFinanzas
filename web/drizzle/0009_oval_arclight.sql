CREATE TYPE "public"."exchange_rate_kind" AS ENUM('confirmed', 'planning');--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"base_currency" text NOT NULL,
	"quote_currency" text NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"effective_date" date NOT NULL,
	"source" text NOT NULL,
	"kind" "exchange_rate_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_household_pair_date_kind_unique" UNIQUE("household_id","base_currency","quote_currency","effective_date","kind")
);
--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exchange_rates_household_date_idx" ON "exchange_rates" USING btree ("household_id","effective_date");