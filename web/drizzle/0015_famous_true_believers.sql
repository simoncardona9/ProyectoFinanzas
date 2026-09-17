CREATE TYPE "public"."import_source_type" AS ENUM('json_paste', 'json_upload');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('staged', 'invalid');--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"content_hash" text NOT NULL,
	"source_type" "import_source_type" NOT NULL,
	"source_name" text,
	"bundle" jsonb NOT NULL,
	"preview" jsonb NOT NULL,
	"status" "import_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batches_household_idempotency_unique" UNIQUE("household_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batches_household_created_idx" ON "import_batches" USING btree ("household_id","created_at");