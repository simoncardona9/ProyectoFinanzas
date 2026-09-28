CREATE TYPE "public"."grocery_catalog_record_type" AS ENUM('market', 'product', 'price');--> statement-breakpoint
CREATE TABLE "grocery_catalog_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"source_type" "grocery_catalog_record_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"public_market_id" uuid,
	"public_product_id" uuid,
	"public_price_suggestion_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grocery_catalog_publications_source_unique" UNIQUE("household_id","source_type","source_id")
);
--> statement-breakpoint
CREATE TABLE "public_grocery_markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_grocery_price_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"observed_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_grocery_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_catalog_publications" ADD CONSTRAINT "grocery_catalog_publications_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_catalog_publications" ADD CONSTRAINT "grocery_catalog_publications_public_market_id_public_grocery_markets_id_fk" FOREIGN KEY ("public_market_id") REFERENCES "public"."public_grocery_markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_catalog_publications" ADD CONSTRAINT "grocery_catalog_publications_public_product_id_public_grocery_products_id_fk" FOREIGN KEY ("public_product_id") REFERENCES "public"."public_grocery_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_catalog_publications" ADD CONSTRAINT "grocery_catalog_publications_public_price_suggestion_id_public_grocery_price_suggestions_id_fk" FOREIGN KEY ("public_price_suggestion_id") REFERENCES "public"."public_grocery_price_suggestions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_grocery_price_suggestions" ADD CONSTRAINT "public_grocery_price_suggestions_market_id_public_grocery_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."public_grocery_markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_grocery_price_suggestions" ADD CONSTRAINT "public_grocery_price_suggestions_product_id_public_grocery_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."public_grocery_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_catalog_publications_household_idx" ON "grocery_catalog_publications" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "public_grocery_markets_normalized_idx" ON "public_grocery_markets" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "public_grocery_prices_product_date_idx" ON "public_grocery_price_suggestions" USING btree ("product_id","observed_date");--> statement-breakpoint
CREATE INDEX "public_grocery_prices_market_date_idx" ON "public_grocery_price_suggestions" USING btree ("market_id","observed_date");--> statement-breakpoint
CREATE INDEX "public_grocery_products_normalized_idx" ON "public_grocery_products" USING btree ("normalized_name");