CREATE TABLE "obligation_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obligation_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "obligation_payments_transaction_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"description" text NOT NULL,
	"original_amount_minor" integer NOT NULL,
	"remaining_amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"due_date" date NOT NULL,
	"category_id" uuid NOT NULL,
	"classification" "category_classification" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"recurrence_rule" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "obligation_payments" ADD CONSTRAINT "obligation_payments_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_payments" ADD CONSTRAINT "obligation_payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "obligation_payments_obligation_idx" ON "obligation_payments" USING btree ("obligation_id");--> statement-breakpoint
CREATE INDEX "obligations_household_due_idx" ON "obligations" USING btree ("household_id","due_date");--> statement-breakpoint
CREATE INDEX "obligations_category_idx" ON "obligations" USING btree ("category_id");