CREATE TYPE "public"."grocery_plan_status" AS ENUM('draft', 'active', 'cancelled');--> statement-breakpoint
CREATE TABLE "grocery_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"grocery_plan_id" uuid NOT NULL,
	"product_id" uuid,
	"description" text,
	"quantity" numeric(12, 3),
	"unit" text,
	"planned_unit_price_minor" integer NOT NULL,
	"suggested_price_observation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grocery_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"target_period_start" date NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"status" "grocery_plan_status" DEFAULT 'draft' NOT NULL,
	"preferred_market_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_plan_items" ADD CONSTRAINT "grocery_plan_items_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_plan_items" ADD CONSTRAINT "grocery_plan_items_grocery_plan_id_grocery_plans_id_fk" FOREIGN KEY ("grocery_plan_id") REFERENCES "public"."grocery_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_plan_items" ADD CONSTRAINT "grocery_plan_items_product_id_grocery_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."grocery_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_plan_items" ADD CONSTRAINT "grocery_plan_items_suggested_price_observation_id_grocery_price_observations_id_fk" FOREIGN KEY ("suggested_price_observation_id") REFERENCES "public"."grocery_price_observations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_plans" ADD CONSTRAINT "grocery_plans_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_plans" ADD CONSTRAINT "grocery_plans_preferred_market_id_grocery_markets_id_fk" FOREIGN KEY ("preferred_market_id") REFERENCES "public"."grocery_markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_plan_items_plan_idx" ON "grocery_plan_items" USING btree ("grocery_plan_id");--> statement-breakpoint
CREATE INDEX "grocery_plan_items_household_product_idx" ON "grocery_plan_items" USING btree ("household_id","product_id");--> statement-breakpoint
CREATE INDEX "grocery_plans_household_period_idx" ON "grocery_plans" USING btree ("household_id","target_period_start");