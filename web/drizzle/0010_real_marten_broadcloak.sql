CREATE TYPE "public"."exchange_rate_movement" AS ENUM('buy_usd', 'sell_usd', 'reference');--> statement-breakpoint
ALTER TABLE "exchange_rates" DROP CONSTRAINT "exchange_rates_household_pair_date_kind_unique";--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "movement" "exchange_rate_movement" DEFAULT 'reference' NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_rates" ALTER COLUMN "movement" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_household_pair_date_kind_unique" UNIQUE("household_id","base_currency","quote_currency","effective_date","kind","movement");
