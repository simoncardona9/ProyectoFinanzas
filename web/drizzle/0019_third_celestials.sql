CREATE TABLE "grocery_markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_price_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"observed_date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_markets" ADD CONSTRAINT "grocery_markets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_price_observations" ADD CONSTRAINT "grocery_price_observations_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_price_observations" ADD CONSTRAINT "grocery_price_observations_market_id_grocery_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."grocery_markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_price_observations" ADD CONSTRAINT "grocery_price_observations_product_id_grocery_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."grocery_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_products" ADD CONSTRAINT "grocery_products_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_markets_household_normalized_idx" ON "grocery_markets" USING btree ("household_id","normalized_name");--> statement-breakpoint
CREATE INDEX "grocery_prices_household_product_date_idx" ON "grocery_price_observations" USING btree ("household_id","product_id","observed_date");--> statement-breakpoint
CREATE INDEX "grocery_prices_household_market_date_idx" ON "grocery_price_observations" USING btree ("household_id","market_id","observed_date");--> statement-breakpoint
CREATE INDEX "grocery_products_household_normalized_idx" ON "grocery_products" USING btree ("household_id","normalized_name");