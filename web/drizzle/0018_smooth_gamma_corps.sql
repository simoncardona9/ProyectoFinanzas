CREATE TYPE "public"."financial_period_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "financial_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"status" "financial_period_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_periods_household_period_unique" UNIQUE("household_id","period_start"),
	CONSTRAINT "financial_periods_period_start_first_day" CHECK ("period_start" = date_trunc('month', "period_start")::date)
);
--> statement-breakpoint
ALTER TABLE "financial_periods" ADD CONSTRAINT "financial_periods_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_periods_household_status_idx" ON "financial_periods" USING btree ("household_id","status");
