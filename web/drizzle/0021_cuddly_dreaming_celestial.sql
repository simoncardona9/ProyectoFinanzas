CREATE TABLE "grocery_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"grocery_plan_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grocery_purchases_transaction_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "grocery_receipt_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"grocery_purchase_id" uuid NOT NULL,
	"grocery_plan_item_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(12, 3),
	"unit" text,
	"unit_price_minor" integer,
	"total_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grocery_purchases" ADD CONSTRAINT "grocery_purchases_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_purchases" ADD CONSTRAINT "grocery_purchases_grocery_plan_id_grocery_plans_id_fk" FOREIGN KEY ("grocery_plan_id") REFERENCES "public"."grocery_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_purchases" ADD CONSTRAINT "grocery_purchases_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_receipt_lines" ADD CONSTRAINT "grocery_receipt_lines_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_receipt_lines" ADD CONSTRAINT "grocery_receipt_lines_grocery_purchase_id_grocery_purchases_id_fk" FOREIGN KEY ("grocery_purchase_id") REFERENCES "public"."grocery_purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_receipt_lines" ADD CONSTRAINT "grocery_receipt_lines_grocery_plan_item_id_grocery_plan_items_id_fk" FOREIGN KEY ("grocery_plan_item_id") REFERENCES "public"."grocery_plan_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_purchases_household_plan_idx" ON "grocery_purchases" USING btree ("household_id","grocery_plan_id");--> statement-breakpoint
CREATE INDEX "grocery_receipt_lines_purchase_idx" ON "grocery_receipt_lines" USING btree ("grocery_purchase_id");--> statement-breakpoint
CREATE INDEX "grocery_receipt_lines_household_plan_item_idx" ON "grocery_receipt_lines" USING btree ("household_id","grocery_plan_item_id");