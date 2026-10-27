CREATE TABLE "grocery_catalog_adoptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"source_type" "grocery_catalog_record_type" NOT NULL,
	"public_source_id" uuid NOT NULL,
	"grocery_market_id" uuid,
	"grocery_product_id" uuid,
	"grocery_price_observation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grocery_catalog_adoptions_source_unique" UNIQUE("household_id","source_type","public_source_id")
);
--> statement-breakpoint
ALTER TABLE "grocery_catalog_adoptions" ADD CONSTRAINT "grocery_catalog_adoptions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_catalog_adoptions" ADD CONSTRAINT "grocery_catalog_adoptions_grocery_market_id_grocery_markets_id_fk" FOREIGN KEY ("grocery_market_id") REFERENCES "public"."grocery_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_catalog_adoptions" ADD CONSTRAINT "grocery_catalog_adoptions_grocery_product_id_grocery_products_id_fk" FOREIGN KEY ("grocery_product_id") REFERENCES "public"."grocery_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_catalog_adoptions" ADD CONSTRAINT "grocery_catalog_adoptions_grocery_price_observation_id_grocery_price_observations_id_fk" FOREIGN KEY ("grocery_price_observation_id") REFERENCES "public"."grocery_price_observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_catalog_adoptions_household_idx" ON "grocery_catalog_adoptions" USING btree ("household_id");